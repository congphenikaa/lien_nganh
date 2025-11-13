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

// 🚨 QUAN TRỌNG: Thêm middleware để xử lý URL encoded data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🚨 ROUTE CALLBACK - PHẢI ĐỊNH NGHĨA TRƯỚC CÁC ROUTE KHÁC
app.get('/api/payment/callback', async (req, res) => {
  console.log('✅ PAYMENT CALLBACK HIT VIA GET!');
  console.log('📧 FULL QUERY:', req.query);
  console.log('🔍 QUERY PARAMS:', Object.keys(req.query));
  
  try {
    // Import dynamic để tránh lỗi circular dependency
    const { handlePaymentCallback } = await import('./controllers/userController.js');
    await handlePaymentCallback(req, res);
  } catch (error) {
    console.error('💥 CALLBACK IMPORT ERROR:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=Callback processing error`);
  }
});

// 🚨 THÊM POST METHOD ĐỂ CHẮC CHẮN
app.post('/api/payment/callback', async (req, res) => {
  console.log('✅ PAYMENT CALLBACK HIT VIA POST!');
  console.log('📧 FULL BODY:', req.body);
  console.log('📧 FULL QUERY:', req.query);
  
  try {
    const { handlePaymentCallback } = await import('./controllers/userController.js');
    await handlePaymentCallback(req, res);
  } catch (error) {
    console.error('💥 CALLBACK IMPORT ERROR:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=Callback processing error`);
  }
});

// Route tạm cho webhook
app.post('/api/momo-webhook', express.json(), (req, res) => {
  console.log('🔔 MOMO WEBHOOK RECEIVED (TEMPORARY)');
  res.status(200).json({ success: true });
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
    
    const cleanupInterval = 24 * 60 * 60 * 1000
    setInterval(autoCleanupOldRequests, cleanupInterval)
    autoCleanupOldRequests()
})