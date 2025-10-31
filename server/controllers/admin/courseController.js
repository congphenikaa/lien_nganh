import Course from '../../models/Course.js'
import { Purchase } from '../../models/Purchase.js'
import { CourseProgress } from '../../models/CourseProgress.js'
import mongoose from 'mongoose'

export const getAllCoursesAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '' } = req.query;
        
        const query = {};
        if (search) {
            query.courseTitle = { $regex: search, $options: 'i' };
        }
        if (status) {
            query.isPublished = status === 'published';
        }

        const courses = await Course.find(query)
            .populate('educator', 'name email')
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

export const toggleCourseStatus = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
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
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        // Check if course has enrolled students
        if (course.enrolledStudents.length > 0) {
            return res.json({
                success: false,
                message: 'Cannot delete course with enrolled students'
            });
        }

        await Course.findByIdAndDelete(courseId);
        
        // Clean up related purchases
        await Purchase.deleteMany({ courseId });
        
        // Clean up course progress
        await CourseProgress.deleteMany({ courseId });

        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        res.json({ success: false, message: error.message });
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