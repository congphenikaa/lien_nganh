import express from 'express'
import { addUserRating, getUserCourseProgress, getUserData, updateUserCourseProgress, userEnrolledCourses, createMomoPayment } from '../controllers/userController.js' // Thêm createMomoPayment

const userRouter = express.Router()

userRouter.get('/data', getUserData)
userRouter.get('/enrolled-courses', userEnrolledCourses)
userRouter.post('/momo-payment', createMomoPayment) // Thêm route mới cho MoMo
userRouter.post('/update-course-progress', updateUserCourseProgress)
userRouter.post('/get-course-progress', getUserCourseProgress)
userRouter.post('/add-rating', addUserRating)

export default userRouter;