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

    // Tìm course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Kiểm tra xem user đã enrolled course này chưa
    const user = await User.findById(userId);
    if (user.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ 
        success: false, 
        message: "You are already enrolled in this course" 
      });
    }

    // Tạo purchase record
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
    
    const extraData = Buffer.from(JSON.stringify(extraDataObject)).toString('base64');

    // 🚨 SỬA URL CALLBACK - sử dụng URL tuyệt đối
    const baseUrl = process.env.BACKEND_URL || `https://${req.get('host')}`;
    const redirectUrl = `${baseUrl}/api/user/payment-callback`;
    const ipnUrl = `${baseUrl}/api/momo-webhook`;

    console.log('🔗 CALLBACK URLs:', { redirectUrl, ipnUrl });

    // MoMo parameters
    const partnerCode = process.env.MOMO_PARTNER_CODE || "MOMO";
    const accessKey = process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85";
    const secretKey = process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const requestId = partnerCode + new Date().getTime();
    const orderId = requestId;
    const orderInfo = `Payment for course: ${course.courseTitle}`;
    const amount = course.coursePrice.toString();
    const requestType = "payWithMethod";

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
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'en'
    });

    console.log('📤 SENDING REQUEST TO MOMO...');

    // Gửi request đến MoMo
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
      // Cập nhật purchase status thành failed
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
      purchaseId, 
      resultCode, 
      message, 
      orderId, 
      transId, 
      amount,
      partnerCode,
      orderInfo,
      extraData
    } = req.query;
    
    console.log('🎯 PARSED PARAMETERS:', { 
      purchaseId, 
      resultCode, 
      message,
      orderId,
      transId
    });

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
      
      // Nếu đã xử lý rồi thì không xử lý lại
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
      const isUserEnrolled = user.enrolledCourses.includes(courseId);
      const isCourseEnrolled = course.enrolledStudents.includes(userId);

      console.log('📊 ENROLLMENT STATUS:', {
        isUserEnrolled,
        isCourseEnrolled
      });

      let enrollmentUpdates = [];

      if (!isUserEnrolled) {
        user.enrolledCourses.push(courseId);
        await user.save();
        enrollmentUpdates.push('ADDED_COURSE_TO_USER');
        console.log('✅ ADDED COURSE TO USER ENROLLMENTS');
      } else {
        console.log('ℹ️ USER ALREADY ENROLLED IN THIS COURSE');
      }

      if (!isCourseEnrolled) {
        course.enrolledStudents.push(userId);
        await course.save();
        enrollmentUpdates.push('ADDED_USER_TO_COURSE');
        console.log('✅ ADDED USER TO COURSE STUDENTS');
      } else {
        console.log('ℹ️ USER ALREADY IN COURSE STUDENTS LIST');
      }

      console.log('🎉🎉🎉 ENROLLMENT COMPLETED SUCCESSFULLY!');
      console.log('🔄 REDIRECTING TO FRONTEND...');
      
      // Redirect đến trang thành công
      return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/my-enrollments?success=true&courseId=${courseId}&updates=${enrollmentUpdates.join(',')}`);
      
    } else {
      // THANH TOÁN THẤT BẠI
      console.log('❌ PAYMENT FAILED:', message);
      
      // Cập nhật purchase status
      purchase.status = 'failed';
      purchase.transactionId = transId;
      await purchase.save();
      
      console.log('🔄 REDIRECTING TO ERROR PAGE...');
      return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=${encodeURIComponent(message || 'Payment failed')}&purchaseId=${purchaseId}`);
    }

  } catch (error) {
    console.error('💥 CALLBACK ERROR:', error);
    console.error('💥 ERROR STACK:', error.stack);
    return res.redirect(`${process.env.FRONTEND_URL || 'https://lms-frontend-puce-ten.vercel.app'}/payment-error?message=Internal server error&error=${encodeURIComponent(error.message)}`);
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