import Course from '../../models/Course.js'
import CourseApprovalRequest from '../../models/CourseApprovalRequest.js'
import { Purchase } from '../../models/Purchase.js'
import { CourseProgress } from '../../models/CourseProgress.js'
import mongoose from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'

export const getAllCoursesAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '', approvalStatus = '' } = req.query;
        
        const query = {};
        if (search) {
            query.courseTitle = { $regex: search, $options: 'i' };
        }
        if (status) {
            query.isPublished = status === 'published';
        }
        if (approvalStatus) {
            query.approvalStatus = approvalStatus;
        }

        const courses = await Course.find(query)
            .populate('educator', 'name email')
            .populate('latestApprovalRequest')
            .select('-courseContent') // Exclude courseContent for performance in list view
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Course.countDocuments(query);

        res.json({
            success: true,
            courses,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getCourseDetailAdmin = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const course = await Course.findById(courseId)
            .populate('educator', 'name email imageUrl')
            .populate('enrolledStudents', 'name email imageUrl');

        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        // Thêm thống kê cho khóa học
        const purchaseStats = await Purchase.aggregate([
            {
                $match: { 
                    courseId: new mongoose.Types.ObjectId(courseId),
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    totalEnrollments: { $count: {} }
                }
            }
        ]);

        const ratingStats = await Course.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
            { $unwind: '$courseRatings' },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$courseRatings.rating' },
                    totalRatings: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$courseRatings.rating'
                    }
                }
            }
        ]);

        res.json({
            success: true,
            course,
            stats: {
                revenue: purchaseStats[0]?.totalRevenue || 0,
                enrollments: purchaseStats[0]?.totalEnrollments || 0,
                averageRating: ratingStats[0]?.averageRating || 0,
                totalRatings: ratingStats[0]?.totalRatings || 0
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Approve course - set status to approved and make it publishable
export const approveCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { adminNote } = req.body;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        // Update course approval status
        course.approvalStatus = 'approved';
        course.isPublished = true; // Auto-publish when approved
        course.adminNote = adminNote || '';
        course.approvedAt = new Date();
        course.approvedBy = req.auth().userId;

        await course.save();

        res.json({
            success: true,
            message: 'Course approved and published successfully',
            course
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Reject course - set status to rejected and unpublish
export const rejectCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { adminNote } = req.body;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        // Update course approval status
        course.approvalStatus = 'rejected';
        course.isPublished = false; // Auto-unpublish when rejected
        course.adminNote = adminNote || '';
        course.rejectedAt = new Date();
        course.rejectedBy = req.auth().userId;

        await course.save();

        res.json({
            success: true,
            message: 'Course rejected and unpublished successfully',
            course
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Toggle publish status (only for approved courses)
export const toggleCourseStatus = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        // Chỉ cho phép publish nếu course đã được approved
        if (!course.isPublished && course.approvalStatus !== 'approved') {
            return res.json({
                success: false,
                message: 'Course must be approved before it can be published'
            });
        }

        course.isPublished = !course.isPublished;
        await course.save();

        res.json({
            success: true,
            message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`,
            isPublished: course.isPublished
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        // Validate courseId format
        if (!courseId || courseId.length !== 24) {
            return res.status(400).json({ success: false, message: 'Invalid course ID format' });
        }
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // For admin, allow force delete with confirmation
        const { forceDelete } = req.query;
        
        if (!forceDelete) {
            // Check if course has enrolled students
            if (course.enrolledStudents && course.enrolledStudents.length > 0) {
                return res.json({
                    success: false,
                    message: 'Course has enrolled students. Use force delete to proceed.',
                    requiresForceDelete: true
                });
            }

            // Check if there are any completed purchases
            const completedPurchases = await Purchase.countDocuments({ 
                courseId, 
                status: 'completed' 
            });
            
            if (completedPurchases > 0) {
                return res.json({
                    success: false,
                    message: 'Course has been purchased by students. Use force delete to proceed.',
                    requiresForceDelete: true
                });
            }
        }

        // Clean up related data first
        await Promise.all([
            Purchase.deleteMany({ courseId }),
            CourseProgress.deleteMany({ courseId }),
            CourseApprovalRequest.deleteMany({ courseId })
        ]);
        
        // Delete the course
        await Course.findByIdAndDelete(courseId);

        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const uploadMiddleware = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

export const updateCourseInfo = [
    // Use multer middleware to handle FormData
    uploadMiddleware.single('image'),
    
    async (req, res) => {
        try {
            const { courseId } = req.params;

            const course = await Course.findById(courseId);
            if (!course) {
                return res.json({ success: false, message: 'Course not found' });
            }

            let updateData;
            let newImageUrl = null;

            // Check if there's courseData in FormData
            if (req.body.courseData) {
                // Handle FormData request (with potential image)
                try {
                    updateData = JSON.parse(req.body.courseData);
                } catch (parseError) {
                    return res.json({ success: false, message: 'Invalid course data format' });
                }

                // Handle image upload to Cloudinary if file exists
                if (req.file) {
                    try {
                        const uploadResult = await new Promise((resolve, reject) => {
                            cloudinary.uploader.upload_stream(
                                { 
                                    resource_type: 'image',
                                    folder: 'course_thumbnails',
                                    transformation: [
                                        { width: 400, height: 300, crop: 'fill', quality: 'auto' }
                                    ]
                                },
                                (error, result) => {
                                    if (error) reject(error);
                                    else resolve(result);
                                }
                            ).end(req.file.buffer);
                        });
                        newImageUrl = uploadResult.secure_url;
                    } catch (uploadError) {
                        console.error('Cloudinary upload error:', uploadError);
                        return res.json({ success: false, message: 'Image upload failed' });
                    }
                }
            } else {
                // Handle regular JSON request (no image)
                updateData = req.body;
            }

            // Update course fields
            if (updateData.courseTitle) course.courseTitle = updateData.courseTitle;
            if (updateData.courseDescription) course.courseDescription = updateData.courseDescription;
            if (updateData.coursePrice !== undefined) course.coursePrice = Number(updateData.coursePrice);
            if (updateData.discount !== undefined) course.discount = Number(updateData.discount);
            if (updateData.courseContent) {
                // Validate courseContent structure
                if (Array.isArray(updateData.courseContent)) {
                    course.courseContent = updateData.courseContent;
                }
            }
            if (newImageUrl) course.courseThumbnail = newImageUrl;

            // Update modified date
            course.updatedAt = new Date();

            await course.save();

            // Populate course for response
            await course.populate('educator', 'name email');

            res.json({
                success: true,
                message: 'Course updated successfully',
                course: course.toObject()
            });

        } catch (error) {
            console.error('Course update error:', error);
            res.json({ success: false, message: error.message });
        }
    }
];