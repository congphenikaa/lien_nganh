import express from'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoutes.js'
import adminRouter from './routes/adminRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js' 
import { autoCleanupOldRequests } from './controllers/adminController.js'

const app = express()

await connectDB()
await connectCloudinary()

app.use(cors())
app.use(clerkMiddleware())

// 🚨 THÊM MIDDLEWARE ĐỂ XỬ LÝ URL ENCODED (QUAN TRỌNG CHO MOMO CALLBACK)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🚨 ĐỊNH NGHĨA ROUTE CALLBACK TRỰC TIẾP Ở ĐÂY
app.get('/api/payment/callback', async (req, res) => {
  console.log('✅ PAYMENT CALLBACK HIT!');
  console.log('📧 FULL QUERY:', req.query);
  
  try {
    const { handlePaymentCallback } = await import('./controllers/userController.js');
    await handlePaymentCallback(req, res);
  } catch (error) {
    console.error('💥 CALLBACK IMPORT ERROR:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=Callback error`);
  }
});

app.get('/', (req, res)=> res.send("API Working"))
app.post('/clerk', express.json(), clerkWebhooks)
app.use('/api/educator', educatorRouter)
app.use('/api/admin', adminRouter)
app.use('/api/course', courseRouter)
app.use('/api/user', userRouter)

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