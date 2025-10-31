import { clerkClient } from '@clerk/express'
import User from '../models/User.js'
import Course from '../models/Course.js'
import EducatorRequest from '../models/EducatorRequest.js'
import { Purchase } from '../models/Purchase.js'

// Get admin dashboard statistics
export const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments()
        const totalCourses = await Course.countDocuments()
        
        // Count educators from Clerk
        const allUsers = await clerkClient.users.getUserList()
        const totalEducators = allUsers.data.filter(user => user.publicMetadata.role === 'educator').length
        
        const pendingApprovals = await EducatorRequest.countDocuments({ status: 'pending' })
        
        res.json({
            success: true,
            stats: {
                totalUsers,
                totalCourses,
                totalEducators,
                pendingApprovals
            }
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get all users with their roles
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
        const clerkUsers = await clerkClient.users.getUserList()
        
        const usersWithRoles = users.map(user => {
            const clerkUser = clerkUsers.data.find(cu => cu.id === user._id)
            return {
                ...user.toObject(),
                role: clerkUser?.publicMetadata?.role || 'student',
                isActive: !clerkUser?.banned
            }
        })
        
        res.json({ success: true, users: usersWithRoles })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Update user role
export const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params
        const { role } = req.body
        
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: { role }
        })
        
        res.json({ success: true, message: 'User role updated successfully' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Toggle user status (ban/unban)
export const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params
        const { isActive } = req.body
        
        if (isActive) {
            await clerkClient.users.unbanUser(userId)
        } else {
            await clerkClient.users.banUser(userId)
        }
        
        res.json({ success: true, message: 'User status updated successfully' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get all educator requests
export const getEducatorRequests = async (req, res) => {
    try {
        const requests = await EducatorRequest.find()
            .populate('userId', 'name email imageUrl')
            .sort({ createdAt: -1 })
        
        res.json({ success: true, requests })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Approve/Reject educator request
export const reviewEducatorRequest = async (req, res) => {
    try {
        const { requestId } = req.params
        const { status, reviewNote } = req.body
        const adminId = req.auth().userId
        
        const request = await EducatorRequest.findById(requestId)
        if (!request) {
            return res.json({ success: false, message: 'Request not found' })
        }
        
        // If approved, update user role to educator
        if (status === 'approved') {
            await clerkClient.users.updateUserMetadata(request.userId, {
                publicMetadata: { role: 'educator' }
            })
        }
        
        // Log the action before deleting (optional - for audit trail)
        console.log(`Admin ${adminId} ${status} educator request for user ${request.userId} at ${new Date()}`)
        if (reviewNote) {
            console.log(`Review note: ${reviewNote}`)
        }
        
        // Delete the request after processing
        await EducatorRequest.findByIdAndDelete(requestId)
        
        res.json({ 
            success: true, 
            message: `Request ${status} successfully and removed from system` 
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Clean up old educator requests (older than 7 days)
export const cleanupOldRequests = async (req, res) => {
    try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        const result = await EducatorRequest.deleteMany({
            createdAt: { $lt: sevenDaysAgo },
            status: 'pending'
        })
        
        console.log(`Cleaned up ${result.deletedCount} old educator requests (older than 7 days)`)
        
        if (res) {
            res.json({ 
                success: true, 
                message: `Cleaned up ${result.deletedCount} old requests`,
                deletedCount: result.deletedCount
            })
        }
        
        return result.deletedCount
    } catch (error) {
        console.error('Error cleaning up old requests:', error)
        if (res) {
            res.json({ success: false, message: error.message })
        }
        return 0
    }
}

// Auto cleanup function (called periodically)
export const autoCleanupOldRequests = async () => {
    try {
        const deletedCount = await cleanupOldRequests()
        if (deletedCount > 0) {
            console.log(`🧹 Auto cleanup: Removed ${deletedCount} expired educator requests`)
        }
    } catch (error) {
        console.error('❌ Auto cleanup failed:', error)
    }
}

// Delete individual educator request
export const deleteEducatorRequest = async (req, res) => {
    try {
        const { requestId } = req.params
        const adminId = req.auth().userId
        
        const request = await EducatorRequest.findById(requestId)
        if (!request) {
            return res.json({ success: false, message: 'Request not found' })
        }
        
        // Log the deletion for audit trail
        console.log(`Admin ${adminId} manually deleted educator request ${requestId} for user ${request.userId} at ${new Date()}`)
        
        await EducatorRequest.findByIdAndDelete(requestId)
        
        res.json({ 
            success: true, 
            message: 'Request deleted successfully' 
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}


