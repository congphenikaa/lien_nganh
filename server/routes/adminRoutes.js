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

export default adminRouter