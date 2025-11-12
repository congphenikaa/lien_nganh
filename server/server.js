import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks, momoWebhooks } from './controllers/webhooks.js' // Thêm momoWebhooks
import educatorRouter from './routes/educatorRoutes.js'
import adminRouter from './routes/adminRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js'
import { autoCleanupOldRequests } from './controllers/adminController.js'

//Initialize Express
const app = express()

// Connect to database
await connectDB()
await connectCloudinary()

//Middlewares
app.use(cors())

// Apply Clerk middleware BEFORE any JSON parsing
app.use(clerkMiddleware())

//Routes that don't need authentication (but need JSON parsing)
app.get('/', (req, res)=> res.send("API Working"))
app.post('/clerk', express.json(), clerkWebhooks)
app.post('/momo-webhook', express.json(), momoWebhooks) // Thêm route MoMo webhook

// Test route to check Clerk middleware
app.get('/test-auth', (req, res) => {
  try {
    console.log('=== TEST AUTH ROUTE ===');
    console.log('req.auth available:', typeof req.auth === 'function');
    console.log('Headers:', req.headers);
    
    if (typeof req.auth !== 'function') {
      return res.json({ success: false, message: 'Clerk middleware not working', auth: 'not available' });
    }
    
    const auth = req.auth();
    console.log('Auth result:', auth);
    
    res.json({ 
      success: true, 
      message: 'Clerk middleware working',
      userId: auth?.userId || 'no user',
      isAuthenticated: auth?.isAuthenticated || false,
      sessionStatus: auth?.sessionStatus || 'unknown',
      auth: auth
    });
  } catch (error) {
    console.error('Test auth error:', error);
    res.json({ success: false, message: error.message });
  }
});

// Protected routes - User routes first to avoid conflicts
app.use('/api/user', userRouter) // No express.json() here - handled per route

// Other routes with their own middleware
app.use('/api/educator', express.json(), educatorRouter)
app.use('/api/admin', express.json(), adminRouter)
app.use('/api/course', express.json(), courseRouter)


//Port
const PORT = process.env.PORT || 5000

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
    
    // Auto cleanup old educator requests every 24 hours
    const cleanupInterval = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    setInterval(autoCleanupOldRequests, cleanupInterval)
    
    // Run cleanup once when server starts
    autoCleanupOldRequests()
    
    console.log('Auto cleanup for old educator requests is scheduled every 24 hours')
})