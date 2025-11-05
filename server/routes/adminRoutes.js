import express from 'express'
import {
    getAdminStats,
    getAllUsers,
    updateUserRole,
    toggleUserStatus,
    getEducatorRequests,
    reviewEducatorRequest,
    cleanupOldRequests,
    deleteEducatorRequest
} from '../controllers/adminController.js'

import {
    getAllCoursesAdmin,
    getCourseDetailAdmin,
    toggleCourseStatus,
    deleteCourse,
    updateCourseInfo
} from '../controllers/admin/courseController.js';

import {
    getRevenueStats,
    getTopCourses,
    getRevenueByEducator,
    getPaymentAnalytics
} from '../controllers/admin/revenueController.js';

import {
    getAllReviews,
    getReviewStats,
    deleteReview,
    getCoursesForFilter,
    bulkDeleteReviews
} from '../controllers/admin/ratingController.js';

import { protectAdmin } from '../middlewares/authMiddleware.js'

const adminRouter = express.Router()

// Admin dashboard stats
adminRouter.get('/stats', protectAdmin, getAdminStats)

// User management
adminRouter.get('/users', protectAdmin, getAllUsers)
adminRouter.put('/users/:userId/role', protectAdmin, updateUserRole)
adminRouter.put('/users/:userId/status', protectAdmin, toggleUserStatus)

// Educator request management
adminRouter.get('/educator-requests', protectAdmin, getEducatorRequests)
adminRouter.put('/educator-requests/:requestId/review', protectAdmin, reviewEducatorRequest)
adminRouter.delete('/educator-requests/cleanup', protectAdmin, cleanupOldRequests)
adminRouter.delete('/educator-requests/:requestId', protectAdmin, deleteEducatorRequest)

// Course management
adminRouter.get('/courses', getAllCoursesAdmin);
adminRouter.get('/courses/:courseId', getCourseDetailAdmin);
adminRouter.put('/courses/:courseId/status', toggleCourseStatus);
adminRouter.put('/courses/:courseId', updateCourseInfo);
adminRouter.delete('/courses/:courseId', deleteCourse);

// Revenue & analytics
adminRouter.get('/revenue', getRevenueStats);
adminRouter.get('/top-courses', getTopCourses);
adminRouter.get('/revenue/educator/:educatorId', getRevenueByEducator);
adminRouter.get('/analytics/payments', getPaymentAnalytics);

// Review management routes
adminRouter.get('/reviews', getAllReviews);
adminRouter.get('/reviews/stats', getReviewStats);
adminRouter.get('/reviews/courses', getCoursesForFilter);
adminRouter.delete('/reviews/:courseId/:reviewId', deleteReview);
adminRouter.post('/reviews/bulk-delete', bulkDeleteReviews);

export default adminRouter