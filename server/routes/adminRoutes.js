import express from 'express'
import {
    getAdminStats,
    getAllUsers,
    updateUserRole,
    toggleUserStatus,
    getEducatorRequests,
    reviewEducatorRequest,
    cleanupOldRequests,
    deleteEducatorRequest,
    cleanupOrphanedUsers
} from '../controllers/adminController.js'

import {
    getAllCoursesAdmin,
    getCourseDetailAdmin,
    toggleCourseStatus,
    deleteCourse,
    updateCourseInfo,
    approveCourse,
    rejectCourse
} from '../controllers/admin/courseController.js';

import {
    getAllApprovalRequests,
    getApprovalRequestDetail,
    updateApprovalRequestCourse
} from '../controllers/admin/approvalController.js';

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

import {
    searchCourses,
    getEnrollments,
    searchStudents,
    addStudent,
    removeStudent,
    exportEnrollments,
    notifyClass
} from '../controllers/enrollmentController.js';

import { protectAdmin } from '../middlewares/authMiddleware.js'

const adminRouter = express.Router()

// Admin dashboard stats
adminRouter.get('/stats', protectAdmin, getAdminStats)

// User management
adminRouter.get('/users', protectAdmin, getAllUsers)
adminRouter.put('/users/:userId/role', protectAdmin, updateUserRole)
adminRouter.put('/users/:userId/status', protectAdmin, toggleUserStatus)
adminRouter.delete('/users/cleanup-orphaned', protectAdmin, cleanupOrphanedUsers)

// Educator request management
adminRouter.get('/educator-requests', protectAdmin, getEducatorRequests)
adminRouter.put('/educator-requests/:requestId/review', protectAdmin, reviewEducatorRequest)
adminRouter.delete('/educator-requests/cleanup', protectAdmin, cleanupOldRequests)
adminRouter.delete('/educator-requests/:requestId', protectAdmin, deleteEducatorRequest)

// Course management - ADD protectAdmin middleware
adminRouter.get('/courses', protectAdmin, getAllCoursesAdmin);
adminRouter.get('/courses/:courseId', protectAdmin, getCourseDetailAdmin);
adminRouter.put('/courses/:courseId/status', protectAdmin, toggleCourseStatus);
adminRouter.put('/courses/:courseId/approve', protectAdmin, approveCourse);
adminRouter.put('/courses/:courseId/reject', protectAdmin, rejectCourse);
adminRouter.put('/courses/:courseId', protectAdmin, ...updateCourseInfo); // Handle array middleware
adminRouter.delete('/courses/:courseId', protectAdmin, deleteCourse);

// Revenue & analytics - ADD protectAdmin middleware
adminRouter.get('/revenue', protectAdmin, getRevenueStats);
adminRouter.get('/top-courses', protectAdmin, getTopCourses);
adminRouter.get('/revenue/educator/:educatorId', protectAdmin, getRevenueByEducator);
adminRouter.get('/analytics/payments', protectAdmin, getPaymentAnalytics);

// Review management routes - ADD protectAdmin middleware
adminRouter.get('/reviews', protectAdmin, getAllReviews);
adminRouter.get('/reviews/stats', protectAdmin, getReviewStats);
adminRouter.get('/reviews/courses', protectAdmin, getCoursesForFilter);
adminRouter.delete('/reviews/:courseId/:reviewId', protectAdmin, deleteReview);
adminRouter.post('/reviews/bulk-delete', protectAdmin, bulkDeleteReviews);

// Course approval management routes (legacy - for backward compatibility)
adminRouter.get('/approval-requests', protectAdmin, getAllApprovalRequests);
adminRouter.get('/approval-requests/:requestId', protectAdmin, getApprovalRequestDetail);
adminRouter.put('/approval-requests/:requestId/update', protectAdmin, updateApprovalRequestCourse);

// Enrollment management routes
adminRouter.get('/enrollments/search-courses', protectAdmin, searchCourses);
adminRouter.get('/enrollments/search-students', protectAdmin, searchStudents);
adminRouter.get('/enrollments/:courseId', protectAdmin, getEnrollments);
adminRouter.post('/enrollments/add-student', protectAdmin, addStudent);
adminRouter.delete('/enrollments/remove-student', protectAdmin, removeStudent);
adminRouter.get('/enrollments/export/:courseId', protectAdmin, exportEnrollments);
adminRouter.post('/enrollments/notify-class', protectAdmin, notifyClass);

export default adminRouter