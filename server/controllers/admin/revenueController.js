// controllers/admin/revenueController.js
import { Purchase } from '../../models/Purchase.js'
import Course from '../../models/Course.js'
import User from '../../models/User.js'
import mongoose from 'mongoose'

export const getRevenueStats = async (req, res) => {
    try {
        const { period = 'month' } = req.query; // day, week, month, year
        const now = new Date();
        let startDate;

        switch (period) {
            case 'day':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
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

        // Total revenue and stats
        const revenueStats = await Purchase.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    totalEnrollments: { $count: {} },
                    averageOrderValue: { $avg: '$amount' }
                }
            }
        ]);

        // Revenue by course
        const revenueByCourse = await Purchase.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            {
                $unwind: '$course'
            },
            {
                $group: {
                    _id: '$courseId',
                    courseTitle: { $first: '$course.courseTitle' },
                    educator: { $first: '$course.educator' },
                    totalRevenue: { $sum: '$amount' },
                    enrollments: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        // Daily revenue for chart
        const dailyRevenue = await Purchase.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    revenue: { $sum: '$amount' },
                    enrollments: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        res.json({
            success: true,
            period,
            stats: revenueStats[0] || {
                totalRevenue: 0,
                totalEnrollments: 0,
                averageOrderValue: 0
            },
            revenueByCourse,
            dailyRevenue
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getTopCourses = async (req, res) => {
    try {
        const { limit = 10, sortBy = 'enrollments' } = req.query;

        const topCourses = await Purchase.aggregate([
            {
                $match: { status: 'completed' }
            },
            {
                $group: {
                    _id: '$courseId',
                    enrollments: { $sum: 1 },
                    revenue: { $sum: '$amount' }
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            {
                $unwind: '$course'
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'course.educator',
                    foreignField: '_id',
                    as: 'educator'
                }
            },
            {
                $unwind: '$educator'
            },
            {
                $project: {
                    courseTitle: '$course.courseTitle',
                    educatorName: '$educator.name',
                    educatorEmail: '$educator.email',
                    enrollments: 1,
                    revenue: 1,
                    coursePrice: '$course.coursePrice',
                    isPublished: '$course.isPublished',
                    averageRating: {
                        $avg: '$course.courseRatings.rating'
                    },
                    totalRatings: {
                        $size: '$course.courseRatings'
                    }
                }
            },
            { $sort: { [sortBy]: -1 } },
            { $limit: parseInt(limit) }
        ]);

        res.json({ success: true, topCourses });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getRevenueByEducator = async (req, res) => {
    try {
        const { educatorId } = req.params;
        const { period = 'all' } = req.query;

        let dateFilter = {};
        if (period !== 'all') {
            const now = new Date();
            let startDate;

            switch (period) {
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(0);
            }
            dateFilter = { createdAt: { $gte: startDate } };
        }

        const educatorRevenue = await Purchase.aggregate([
            {
                $match: {
                    status: 'completed',
                    ...dateFilter
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            {
                $unwind: '$course'
            },
            {
                $match: {
                    'course.educator': educatorId
                }
            },
            {
                $group: {
                    _id: '$course.educator',
                    totalRevenue: { $sum: '$amount' },
                    totalEnrollments: { $sum: 1 },
                    coursesCount: { $addToSet: '$courseId' }
                }
            },
            {
                $project: {
                    totalRevenue: 1,
                    totalEnrollments: 1,
                    coursesCount: { $size: '$coursesCount' },
                    averageRevenuePerCourse: {
                        $divide: ['$totalRevenue', { $size: '$coursesCount' }]
                    }
                }
            }
        ]);

        // Get educator details
        const educator = await User.findById(educatorId);

        res.json({
            success: true,
            educator: {
                name: educator?.name,
                email: educator?.email
            },
            revenue: educatorRevenue[0] || {
                totalRevenue: 0,
                totalEnrollments: 0,
                coursesCount: 0,
                averageRevenuePerCourse: 0
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getPaymentAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Payment method distribution
        const paymentMethods = await Purchase.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    count: { $sum: 1 },
                    revenue: { $sum: '$amount' }
                }
            }
        ]);

        // Success vs failed payments
        const paymentStatus = await Purchase.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        // Monthly growth
        const monthlyGrowth = await Purchase.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$amount' },
                    enrollments: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({
            success: true,
            analytics: {
                paymentMethods,
                paymentStatus,
                monthlyGrowth
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}