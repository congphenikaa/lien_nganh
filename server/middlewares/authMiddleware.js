import { clerkClient } from "@clerk/express";

// middleware (protect educator routers - allow admin and educator)
export const protectEducator = async (req, res, next) => {
    try {
        console.log('=== PROTECT EDUCATOR MIDDLEWARE ===');
        
        if (typeof req.auth !== 'function') {
            console.error('❌ req.auth not available in protectEducator');
            return res.json({success: false, message: 'Clerk middleware not working'})
        }
        
        const userId = req.auth().userId
        console.log('ProtectEducator - userId:', userId);
        
        const response = await clerkClient.users.getUser(userId)
        console.log('ProtectEducator - user role:', response.publicMetadata.role);

        if(response.publicMetadata.role !== 'educator' && response.publicMetadata.role !== 'admin') {
            return res.json({success: false, message: 'Educator or Admin access required'})
        }

        next();

    }catch (error) {
        console.error('❌ Error in protectEducator:', error);
        res.json({success: false, message: error.message})
    }
}

// middleware (protect admin routers)
export const protectAdmin = async (req, res, next) => {
    try {
        console.log('=== PROTECT ADMIN MIDDLEWARE ===');
        
        if (typeof req.auth !== 'function') {
            console.error('❌ req.auth not available in protectAdmin');
            return res.json({success: false, message: 'Clerk middleware not working'})
        }
        
        const userId = req.auth().userId
        console.log('ProtectAdmin - userId:', userId);
        
        const response = await clerkClient.users.getUser(userId)
        console.log('ProtectAdmin - user role:', response.publicMetadata.role);

        if(response.publicMetadata.role !== 'admin') {
            return res.json({success: false, message: 'Admin access required'})
        }

        next();

    }catch (error) {
        console.error('❌ Error in protectAdmin:', error);
        res.json({success: false, message: error.message})
    }
}

// middleware (protect admin or educator routers)
export const protectAdminOrEducator = async (req, res, next) => {
    try {
        console.log('=== PROTECT ADMIN OR EDUCATOR MIDDLEWARE ===');
        
        if (typeof req.auth !== 'function') {
            console.error('❌ req.auth not available in protectAdminOrEducator');
            return res.json({success: false, message: 'Clerk middleware not working'})
        }
        
        const userId = req.auth().userId
        console.log('ProtectAdminOrEducator - userId:', userId);
        
        const response = await clerkClient.users.getUser(userId)
        console.log('ProtectAdminOrEducator - user role:', response.publicMetadata.role);

        if(response.publicMetadata.role !== 'admin' && response.publicMetadata.role !== 'educator') {
            return res.json({success: false, message: 'Admin or Educator access required'})
        }

        next();

    }catch (error) {
        console.error('❌ Error in protectAdminOrEducator:', error);
        res.json({success: false, message: error.message})
    }
}