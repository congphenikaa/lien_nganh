import { clerkClient } from "@clerk/express";

// middleware (protect educator routers - allow admin and educator)
export const protectEducator = async (req, res, next) => {
    try {
        const userId = req.auth().userId
        const response = await clerkClient.users.getUser(userId)

        if(response.publicMetadata.role !== 'educator' && response.publicMetadata.role !== 'admin') {
            return res.json({success: false, message: 'Educator or Admin access required'})
        }

        next();

    }catch (error) {
        res.json({success: false, message: error.message})
    }
}

// middleware (protect admin routers)
export const protectAdmin = async (req, res, next) => {
    try {
        const userId = req.auth().userId
        const response = await clerkClient.users.getUser(userId)

        if(response.publicMetadata.role !== 'admin') {
            return res.json({success: false, message: 'Admin access required'})
        }

        next();

    }catch (error) {
        res.json({success: false, message: error.message})
    }
}

// middleware (protect admin or educator routers)
export const protectAdminOrEducator = async (req, res, next) => {
    try {
        const userId = req.auth().userId
        const response = await clerkClient.users.getUser(userId)

        if(response.publicMetadata.role !== 'admin' && response.publicMetadata.role !== 'educator') {
            return res.json({success: false, message: 'Admin or Educator access required'})
        }

        next();

    }catch (error) {
        res.json({success: false, message: error.message})
    }
}