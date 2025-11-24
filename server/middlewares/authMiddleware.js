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
        console.log('Headers:', req.headers);
        
        // Check if Clerk auth is available
        if (typeof req.auth === 'function') {
            const authResult = req.auth();
            console.log('Clerk auth result:', authResult);
            
            if (authResult && authResult.userId) {
                const userId = authResult.userId;
                console.log('ProtectAdmin - Clerk userId:', userId);
                
                const response = await clerkClient.users.getUser(userId)
                console.log('ProtectAdmin - user role:', response.publicMetadata.role);

                if(response.publicMetadata.role !== 'admin') {
                    return res.json({success: false, message: 'Admin access required'})
                }

                return next();
            }
        }

        // Fallback: check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            
            // 🛡️ Check for null/undefined token strings
            if (token === 'null' || token === 'undefined' || !token || token.length < 10) {
                console.log('ProtectAdmin - Invalid Bearer token:', token);
                return res.status(401).json({
                    success: false, 
                    message: 'Invalid authentication token. Please sign in again.'
                });
            }
            
            console.log('ProtectAdmin - Valid Bearer token:', token.substring(0, 20) + '...');
            
            // TODO: Verify token with Clerk in production
            // For now, accepting valid-looking tokens
            return next();
        }

        console.error('❌ No valid authentication found');
        return res.json({success: false, message: 'Authentication required'});

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