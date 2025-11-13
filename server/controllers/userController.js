import User from "../models/User.js"
import { Purchase } from "../models/Purchase.js"
import { CourseProgress } from "../models/CourseProgress.js"
import Course from "../models/Course.js"
import crypto from 'crypto'

export const getUserData = async (req,res)=>{
    try {
        const userId = req.auth.userId // Sửa từ req.auth().userId
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
        const userId = req.auth.userId // Sửa từ req.auth().userId
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

    console.log('💰 INITIATING MOMO PAYMENT:', { userId, courseId });

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const user = await User.findById(userId);
    if (user.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ 
        success: false, 
        message: "You are already enrolled in this course" 
      });
    }

    const purchaseData = await Purchase.create({
      courseId,
      userId,
      amount: course.coursePrice,
      status: 'pending'
    });

    console.log('📝 PURCHASE CREATED:', purchaseData._id);

    // Tạo extraData
    const extraDataObject = {
      purchaseId: purchaseData._id.toString(),
      userId: userId,
      courseId: courseId
    };
    
    const extraData = encodeURIComponent(JSON.stringify(extraDataObject));
    
    console.log('📦 EXTRADATA CREATED:', extraDataObject);

    // MoMo parameters
    const partnerCode = process.env.MOMO_PARTNER_CODE || "MOMO";
    const accessKey = process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85";
    const secretKey = process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const requestId = partnerCode + new Date().getTime();
    const orderId = requestId;
    const orderInfo = `Payment for course: ${course.courseTitle}`;
    
    // 🚨 SỬ DỤNG URL TUYỆT ĐỐI
    const redirectUrl = `https://lms-backend-c9mslf3m8-congs-projects-1d5257dc.vercel.app/api/payment/callback`;
    const amount = course.coursePrice.toString();
    const requestType = "payWithMethod";

    console.log('🔗 REDIRECT URL:', redirectUrl);

    // Tạo signature
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    
    const signature = crypto.createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      extraData,
      requestType,
      signature,
      lang: 'en'
    });

    console.log('📤 SENDING REQUEST TO MOMO...');

    const response = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });

    const data = await response.json();
    console.log('📥 MOMO RESPONSE:', data);
    
    if (data.resultCode === 0) {
      res.json({
        success: true,
        payment_url: data.payUrl,
        purchaseId: purchaseData._id
      });
    } else {
      await Purchase.findByIdAndUpdate(purchaseData._id, { status: 'failed' });
      res.status(400).json({
        success: false,
        message: data.message || 'Payment initiation failed'
      });
    }

  } catch (error) {
    console.error('💥 PAYMENT ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handlePaymentCallback = async (req, res) => {
  console.log('🔄 PAYMENT CALLBACK STARTED');
  console.log('📧 FULL QUERY:', req.query);
  
  try {
    const { 
      resultCode, 
      message, 
      orderId, 
      transId, 
      amount,
      extraData
    } = req.query;
    
    console.log('🎯 PARSED PARAMETERS:', { 
      resultCode, 
      message,
      orderId,
      transId,
      extraData
    });

    // Parse extraData để lấy purchaseId
    let purchaseId;
    try {
      if (extraData) {
        // 🚨 SỬA: MoMo gửi extraData đã được URL encoded
        const decodedExtraData = decodeURIComponent(extraData);
        console.log('📦 DECODED EXTRADATA STRING:', decodedExtraData);
        
        const parsedData = JSON.parse(decodedExtraData);
        purchaseId = parsedData.purchaseId;
        console.log('🎯 PURCHASE ID FROM EXTRADATA:', purchaseId);
      }
    } catch (error) {
      console.error('❌ ERROR PARSING EXTRADATA:', error);
      console.error('📋 EXTRADATA CONTENT:', extraData);
    }

    if (!purchaseId) {
      console.error('❌ MISSING PURCHASE ID');
      return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=Invalid purchase ID`);
    }

    console.log('🔍 LOOKING FOR PURCHASE:', purchaseId);
    
    // Tìm purchase record
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      console.error('❌ PURCHASE NOT FOUND:', purchaseId);
      return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=Purchase not found`);
    }

    console.log('📋 PURCHASE FOUND:', {
      id: purchase._id,
      status: purchase.status,
      userId: purchase.userId,
      courseId: purchase.courseId
    });

    // Kiểm tra kết quả thanh toán
    if (resultCode === '0') {
      // THANH TOÁN THÀNH CÔNG
      console.log('🎉 PAYMENT SUCCESS - PROCESSING ENROLLMENT...');
      
      if (purchase.status === 'completed') {
        console.log('ℹ️ PURCHASE ALREADY COMPLETED, REDIRECTING...');
        return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/my-enrollments?success=true`);
      }
      
      // Cập nhật purchase status
      purchase.status = 'completed';
      purchase.transactionId = transId;
      await purchase.save();
      
      console.log('✅ PURCHASE UPDATED TO COMPLETED');

      // Thực hiện enrollment
      const { userId, courseId } = purchase;

      console.log('🔍 LOOKING FOR USER AND COURSE:', { userId, courseId });

      const [user, course] = await Promise.all([
        User.findById(userId),
        Course.findById(courseId)
      ]);

      if (!user) {
        console.error('❌ USER NOT FOUND:', userId);
        return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=User not found`);
      }

      if (!course) {
        console.error('❌ COURSE NOT FOUND:', courseId);
        return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=Course not found`);
      }

      console.log('👤 USER FOUND:', user.name);
      console.log('📚 COURSE FOUND:', course.courseTitle);

      // Kiểm tra và thêm enrollment
      if (!user.enrolledCourses.includes(courseId)) {
        user.enrolledCourses.push(courseId);
        await user.save();
        console.log('✅ ADDED COURSE TO USER ENROLLMENTS');
      }

      if (!course.enrolledStudents.includes(userId)) {
        course.enrolledStudents.push(userId);
        await course.save();
        console.log('✅ ADDED USER TO COURSE STUDENTS');
      }

      console.log('🎉🎉🎉 ENROLLMENT COMPLETED SUCCESSFULLY!');
      return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/my-enrollments?success=true&courseId=${courseId}`);
      
    } else {
      // THANH TOÁN THẤT BẠI
      console.log('❌ PAYMENT FAILED:', message);
      
      purchase.status = 'failed';
      purchase.transactionId = transId;
      await purchase.save();
      
      return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=${encodeURIComponent(message || 'Payment failed')}`);
    }

  } catch (error) {
    console.error('💥 CALLBACK ERROR:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=Internal server error`);
  }
};

export const updateUserCourseProgress = async (req,res)=>{
    try {
        const userId = req.auth.userId // Sửa từ req.auth().userId
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
        const userId = req.auth.userId // Sửa từ req.auth().userId
        const {courseId} = req.body
        const progressData = await CourseProgress.findOne({userId, courseId})
        res.json({success: true, progressData})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

export const addUserRating = async (req, res) =>{
    const userId = req.auth.userId // Sửa từ req.auth().userId
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
        if(!user || !user.enrolledCourses.includes(courseId)){
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