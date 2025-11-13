import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import connectCloudinary from './configs/cloudinary.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import { clerkMiddleware } from '@clerk/express'
import educatorRouter from './routes/educatorRoutes.js'
import adminRouter from './routes/adminRoutes.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js'
import { handlePaymentCallback } from './controllers/userController.js'  // ✅ Import tĩnh
import { autoCleanupOldRequests } from './controllers/adminController.js'

const app = express()

await connectDB()
await connectCloudinary()

app.use(cors())
app.use(clerkMiddleware())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// ✅ Callback MoMo
app.get('/api/payment/callback', handlePaymentCallback)
app.post('/api/payment/callback', handlePaymentCallback)

// ✅ Webhook tạm
app.post('/api/momo-webhook', (req, res) => {
  console.log('🔔 MOMO WEBHOOK RECEIVED')
  res.status(200).json({ success: true })
})

// Các route khác
app.get('/', (req, res)=> res.send("API Working"))
app.post('/clerk', express.json(), clerkWebhooks)
app.use('/api/educator', educatorRouter)
app.use('/api/admin', adminRouter)
app.use('/api/course', courseRouter)
app.use('/api/user', userRouter)

const PORT = process.env.PORT || 5000
app.listen(PORT, ()=>{
  console.log(`✅ Server is running on port ${PORT}`)
  const cleanupInterval = 24 * 60 * 60 * 1000
  setInterval(autoCleanupOldRequests, cleanupInterval)
  autoCleanupOldRequests()
})