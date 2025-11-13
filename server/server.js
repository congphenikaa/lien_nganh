import express from'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks, momoWebhooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoutes.js'
import adminRouter from './routes/adminRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js' 
import { autoCleanupOldRequests } from './controllers/adminController.js'
import { handlePaymentCallback } from './controllers/userController.js'

const app = express()

await connectDB()
await connectCloudinary()

app.use(cors())
app.use(clerkMiddleware())

app.get('/api/user/payment-callback', handlePaymentCallback)

app.get('/', (req, res)=> res.send("API Working"))
app.post('/clerk', express.json(), clerkWebhooks)
app.use('/api/educator',express.json(), educatorRouter)
app.use('/api/admin', express.json(), adminRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)
app.post('/api/momo-webhook', express.json(), momoWebhooks)

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