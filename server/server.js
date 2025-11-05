import express from'express'
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
app.use(clerkMiddleware())

//Routes
app.get('/', (req, res)=> res.send("API Working"))

app.post('/clerk', express.json(), clerkWebhooks)
app.post('/momo-webhook', express.json(), momoWebhooks) // Thêm route MoMo webhook
app.use('/api/educator',express.json(), educatorRouter)
app.use('/api/admin', express.json(), adminRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)


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