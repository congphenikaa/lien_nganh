import express from 'express'
import { addUserRating, getUserCourseProgress, getUserData, updateUserCourseProgress, userEnrolledCourses, createMomoPayment, refreshEnrolledCourses } from '../controllers/userController.js'

const userRouter = express.Router()

// GET routes don't need express.json()
userRouter.get('/data', getUserData);

userRouter.get('/enrolled-courses', userEnrolledCourses);

// POST routes need JSON parsing middleware
userRouter.post('/momo-payment', express.json(), createMomoPayment);

userRouter.post('/update-course-progress', express.json(), updateUserCourseProgress);

userRouter.post('/get-course-progress', express.json(), getUserCourseProgress);

userRouter.post('/add-rating', express.json(), addUserRating);

userRouter.get('/refresh-enrolled-courses', refreshEnrolledCourses);

export default userRouter;