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
import { handlePaymentCallback } from './controllers/userController.js'

//Initialize Express
const app = express()

// Connect to database
await connectDB()
await connectCloudinary()

//Middlewares
app.use(cors())
app.use(clerkMiddleware())

//Routes
app.get('/', (req, res)=> res.send("API Working"))

app.get('/api/user/payment-callback', handlePaymentCallback)

app.post('/clerk', express.json(), clerkWebhooks)
app.use('/api/educator',express.json(), educatorRouter)
app.use('/api/admin', express.json(), adminRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter) // MOUNT USER ROUTER

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