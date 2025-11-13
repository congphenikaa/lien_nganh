import express from 'express'
import { addCourse, educatorDashboardData, getEducatorCourses, getEnrolledStudentsData, submitEducatorRequest, getEducatorRequestStatus } from '../controllers/educatorController.js'
import upload from '../configs/multer.js'
import { protectEducator } from '../middlewares/authMiddleware.js'

const educatorRouter = express.Router()

// Educator request routes
educatorRouter.post('/request', submitEducatorRequest)
educatorRouter.get('/request-status', getEducatorRequestStatus)
educatorRouter.post('/add-course', protectEducator, upload.single('image'), addCourse)
educatorRouter.get('/courses', protectEducator, getEducatorCourses)
educatorRouter.get('/dashboard', protectEducator, educatorDashboardData)
educatorRouter.get('/enrolled-students', protectEducator, getEnrolledStudentsData)

export default educatorRouter;