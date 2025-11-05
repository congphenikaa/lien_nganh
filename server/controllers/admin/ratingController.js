// controllers/admin/ratingController.js
import Course from '../../models/Course.js'
import User from '../../models/User.js'
import mongoose from 'mongoose'

// Get all reviews with filtering and pagination
export const getAllReviews = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            courseId = '', 
            rating = '', 
            sortBy = 'newest' 
        } = req.query;

        // Build match stage for aggregation
        const matchStage = {};
        
        if (courseId) {
            matchStage['course._id'] = new mongoose.Types.ObjectId(courseId);
        }

        if (rating) {
            matchStage['courseRatings.rating'] = parseInt(rating);
        }

        // Build sort stage
        let sortStage = {};
        switch (sortBy) {
            case 'highest':
                sortStage = { rating: -1 };
                break;
            case 'lowest':
                sortStage = { rating: 1 };
                break;
            case 'newest':
            default:
                sortStage = { createdAt: -1 };
                break;
        }

        const reviews = await Course.aggregate([
            { $unwind: '$courseRatings' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'courseRatings.userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: '$courseRatings._id',
                    rating: '$courseRatings.rating',
                    userName: '$user.name',
                    userImage: '$user.imageUrl',
                    userEmail: '$user.email',
                    courseTitle: '$courseTitle',
                    courseId: '$_id',
                    courseThumbnail: '$courseThumbnail',
                    createdAt: '$courseRatings.createdAt',
                    updatedAt: '$courseRatings.updatedAt'
                }
            },
            { $match: matchStage },
            { $sort: sortStage },
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
        ]);

        // Get total count
        const totalPipeline = [
            { $unwind: '$courseRatings' },
            { $match: matchStage },
            { $count: 'total' }
        ];

        const totalResult = await Course.aggregate(totalPipeline);
        const total = totalResult[0]?.total || 0;

        // Get rating statistics
        const statsPipeline = [
            { $unwind: '$courseRatings' },
            { $match: matchStage },
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
        ];

        const statsResult = await Course.aggregate(statsPipeline);
        const stats = statsResult[0] || {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: []
        };

        // Calculate rating distribution
        const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
        stats.ratingDistribution.forEach(rating => {
            if (rating >= 1 && rating <= 5) {
                distribution[5 - rating]++; // Reverse for 5-star first
            }
        });

        res.json({
            success: true,
            reviews,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            },
            stats: {
                averageRating: stats.averageRating ? parseFloat(stats.averageRating.toFixed(1)) : 0,
                totalRatings: stats.totalRatings,
                distribution
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get review statistics for dashboard
export const getReviewStats = async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const now = new Date();
        let startDate;

        switch (period) {
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Total reviews and average rating
        const overallStats = await Course.aggregate([
            { $unwind: '$courseRatings' },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$courseRatings.rating' },
                    recentReviews: {
                        $sum: {
                            $cond: [
                                { $gte: ['$courseRatings.createdAt', startDate] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Reviews by course
        const reviewsByCourse = await Course.aggregate([
            { $unwind: '$courseRatings' },
            {
                $group: {
                    _id: '$_id',
                    courseTitle: { $first: '$courseTitle' },
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$courseRatings.rating' }
                }
            },
            { $sort: { totalReviews: -1 } },
            { $limit: 10 }
        ]);

        // Recent reviews (last 10)
        const recentReviews = await Course.aggregate([
            { $unwind: '$courseRatings' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'courseRatings.userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: '$courseRatings._id',
                    rating: '$courseRatings.rating',
                    userName: '$user.name',
                    courseTitle: '$courseTitle',
                    createdAt: '$courseRatings.createdAt'
                }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 }
        ]);

        // Rating distribution
        const ratingDistribution = await Course.aggregate([
            { $unwind: '$courseRatings' },
            {
                $group: {
                    _id: '$courseRatings.rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        res.json({
            success: true,
            stats: overallStats[0] || {
                totalReviews: 0,
                averageRating: 0,
                recentReviews: 0
            },
            reviewsByCourse,
            recentReviews,
            ratingDistribution
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Delete a review
export const deleteReview = async (req, res) => {
    try {
        const { courseId, reviewId } = req.params;
        
        const course = await Course.findById(courseId);
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        // Find the review index
        const reviewIndex = course.courseRatings.findIndex(
            rating => rating._id.toString() === reviewId
        );

        if (reviewIndex === -1) {
            return res.json({ success: false, message: 'Review not found' });
        }

        // Remove the review
        course.courseRatings.splice(reviewIndex, 1);
        await course.save();

        res.json({ 
            success: true, 
            message: 'Review deleted successfully' 
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get courses for filter dropdown
export const getCoursesForFilter = async (req, res) => {
    try {
        const courses = await Course.find({ isPublished: true })
            .select('courseTitle courseThumbnail')
            .sort({ courseTitle: 1 });

        res.json({
            success: true,
            courses: courses.map(course => ({
                _id: course._id,
                courseTitle: course.courseTitle,
                courseThumbnail: course.courseThumbnail
            }))
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Bulk delete reviews
export const bulkDeleteReviews = async (req, res) => {
    try {
        const { reviewIds } = req.body; // Array of { courseId, reviewId }

        if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
            return res.json({ success: false, message: 'No reviews selected' });
        }

        let deletedCount = 0;

        // Process each review deletion
        for (const { courseId, reviewId } of reviewIds) {
            const course = await Course.findById(courseId);
            if (course) {
                const reviewIndex = course.courseRatings.findIndex(
                    rating => rating._id.toString() === reviewId
                );

                if (reviewIndex !== -1) {
                    course.courseRatings.splice(reviewIndex, 1);
                    await course.save();
                    deletedCount++;
                }
            }
        }

        res.json({
            success: true,
            message: `Successfully deleted ${deletedCount} review(s)`,
            deletedCount
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}