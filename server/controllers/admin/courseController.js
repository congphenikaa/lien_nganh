import Course from '../../models/Course.js'
import CourseApprovalRequest from '../../models/CourseApprovalRequest.js'
import { Purchase } from '../../models/Purchase.js'
import { CourseProgress } from '../../models/CourseProgress.js'
import mongoose from 'mongoose'

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
            .select('-courseContent')
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

export const updateCourseInfo = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { courseTitle, courseDescription, coursePrice, discount } = req.body;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        // Update fields
        if (courseTitle) course.courseTitle = courseTitle;
        if (courseDescription) course.courseDescription = courseDescription;
        if (coursePrice !== undefined) course.coursePrice = coursePrice;
        if (discount !== undefined) course.discount = discount;

        await course.save();

        res.json({
            success: true,
            message: 'Course updated successfully',
            course
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}