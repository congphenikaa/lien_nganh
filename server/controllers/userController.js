import User from "../models/User.js"
import { Purchase } from "../models/Purchase.js"
import { CourseProgress } from "../models/CourseProgress.js"
import Course from "../models/Course.js"
import crypto from 'crypto'
import https from 'https'

export const getUserData = async (req,res)=>{
    try {
        const userId = req.auth().userId
        const user = await User.findById(userId)
        if(!user){
            return res.json({success: false, message: 'User Not Found'})

        }
        res.json({success: true, user})
    } catch (error) {
        res.json({success: false, message: error.message})
        
    }
}

export const userEnrolledCourses = async (req, res) =>{
    try {
        const userId = req.auth().userId
        const userData = await User.findById(userId).populate('enrolledCourses')
        res.json({success: true,enrolledCourses: userData.enrolledCourses})
    } catch (error) {
        res.json({success: false, message: error.message})
        
    }
}

export const createMomoPayment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Tạo purchase record trước
    const purchaseData = await Purchase.create({
      courseId,
      userId,
      amount: courseData.coursePrice, // Lấy giá từ course
      status: 'pending'
    });

    // Tạo extraData với purchaseId
    const extraDataObject = {
      purchaseId: purchaseData._id.toString(),
      userId: userId,
      courseId: courseId
    };
    
    const extraData = Buffer.from(JSON.stringify(extraDataObject)).toString('base64');

    // Các parameters cho MoMo
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const requestId = partnerCode + new Date().getTime();
    const orderId = requestId;
    const orderInfo = `Payment for course: ${courseData.courseTitle}`;
    // const redirectUrl = `${process.env.FRONTEND_URL}/my-enrollments`; // URL sau khi thanh toán
    const redirectUrl =`${origin}/loading/my-enrollments`;
    const ipnUrl = `${process.env.BACKEND_URL}/api/momo-webhook`; 
    const amount = courseData.coursePrice.toString();
    const requestType = "captureWallet";
    const lang = 'en';

    // Tạo signature
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    
    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    // Request body
    const requestBody = JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl, // ĐẢM BẢO CÓ IPN URL
      extraData,
      requestType,
      signature,
      lang
    });

    // Gửi request đến MoMo
    const response = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });

    const data = await response.json();
    
    if (data.resultCode === 0) {
      res.json({
        success: true,
        payment_url: data.payUrl,
        purchaseId: purchaseData._id
      });
    } else {
      // Cập nhật purchase status thành failed
      await Purchase.findByIdAndUpdate(purchaseData._id, { status: 'failed' });
      res.status(400).json({
        success: false,
        message: data.message || 'Payment initiation failed'
      });
    }

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateUserCourseProgress = async (req,res)=>{
    try {
        const userId = req.auth().userId
        const {courseId, lectureId} = req.body
        const progressData = await CourseProgress.findOne({userId, courseId})

        if(progressData){
            if(progressData.lectureCompleted.includes(lectureId)){
                return res.json({success: true, message: 'Lecture Already Completed'})
            }
            progressData.lectureCompleted.push(lectureId)
            await progressData.save()
        } else {
            await CourseProgress.create({
                userId,
                courseId,
                lectureCompleted: [lectureId]
            })
        }

        res.json({success: true, message: 'Progress Updated'})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const getUserCourseProgress = async (req, res) =>{
    try {
        const userId = req.auth().userId
        const {courseId} = req.body
        const progressData = await CourseProgress.findOne({userId, courseId})
        res.json({success: true, progressData})
    } catch (error) {
        res.json({success: false, message: error.message})
        
    }
}

export const addUserRating = async (req, res) =>{
    const userId = req.auth().userId
    const { courseId, rating } = req.body;
    if (!courseId || !userId || !rating || rating < 1 || rating > 5){
        return res.json({success: false, message: 'InValid Details'})
    }
    try {
        const course = await Course.findById(courseId);
        if(!course){
            return res.json({success: false, message: 'Course not found.'})
        }

        const user = await User.findById(userId)
        if(!user || !user.enrolledCourses.includes(courseId)){ // Sửa lỗi logic ở đây
            return res.json({ success: false , message: 'User has not purchased this course.'})
        }

        const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId)

        if (existingRatingIndex > -1){
            course.courseRatings[existingRatingIndex].rating = rating;
        }else {
            course.courseRatings.push({userId, rating})
        }
        await course.save();
        return res.json({success: true, message:'Rating add'})

    } catch(error) {
        return res.json({success: false, message: error.message})
    }
}