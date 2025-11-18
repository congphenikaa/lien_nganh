import User from "../models/User.js"
import { Purchase } from "../models/Purchase.js"
import { CourseProgress } from "../models/CourseProgress.js"
import Course from "../models/Course.js"
import Enrollment from "../models/Enrollment.js"
import crypto from 'crypto'

export const getUserData = async (req,res)=>{
    try {
        // SỬA: Gọi req.auth() như một hàm
        const auth = req.auth(); 
        const userId = auth.userId; 
        console.log('🔍 getUserData called for userId:', userId);
        
        let user = await User.findById(userId)
        console.log('🔍 User found in DB:', !!user);
        
        if(!user){
            console.log('🔧 User not found, attempting to create from Clerk data...');
            
            // Lấy thông tin từ Clerk session
            // SỬA: Lấy clerkUser từ biến auth đã gọi
            const clerkUser = auth; 
            console.log('🔍 Clerk user data available:', !!clerkUser.sessionClaims);
            
            // Get role from Clerk metadata
            const clerkRole = clerkUser.sessionClaims?.metadata?.role || 
                             clerkUser.sessionClaims?.publicMetadata?.role ||
                             clerkUser.sessionClaims?.privateMetadata?.role ||
                             'student'; // Default to student
            
            try {
                // Tạo user mới với thông tin từ Clerk
                user = new User({
                    _id: userId,
                    clerkId: userId, // Save Clerk ID
                    name: clerkUser.sessionClaims?.name || clerkUser.sessionClaims?.email?.split('@')[0] || 'User',
                    email: clerkUser.sessionClaims?.email || '',
                    imageUrl: clerkUser.sessionClaims?.image_url || clerkUser.sessionClaims?.imageUrl || '',
                    role: clerkRole, // Cache role from Clerk
                    enrolledCourses: []
                });
                
                await user.save();
                console.log('✅ User created successfully:', user.name);
            } catch (createError) {
                console.error('❌ Failed to create user:', createError);
                return res.json({success: false, message: 'Failed to create user profile'})
            }
        }
        
        // Get current role from Clerk metadata (always fresh)
        // SỬA: Lấy currentRole từ biến auth đã gọi
        const currentRole = auth.sessionClaims?.metadata?.role || 
                           auth.sessionClaims?.publicMetadata?.role ||
                           auth.sessionClaims?.privateMetadata?.role ||
                           user.role || // Fallback to cached role
                           'student'; // Ultimate fallback
        
        // Return user data with fresh role from Clerk
        const userData = {
            ...user.toObject(),
            role: currentRole
        };
        
        res.json({success: true, user: userData})
    } catch (error) {
        console.error('❌ Error in getUserData:', error);
        res.json({success: false, message: error.message})
    }
}

export const userEnrolledCourses = async (req, res) =>{
    try {
        // SỬA: Gọi req.auth()
        const { userId } = req.auth();
        const userData = await User.findById(userId).populate('enrolledCourses')
        
        // Đảm bảo enrolledCourses luôn là một array
        const enrolledCourses = userData && userData.enrolledCourses ? userData.enrolledCourses : []
        
        res.json({success: true, enrolledCourses: enrolledCourses})
    } catch (error) {
        console.error('Error fetching enrolled courses:', error)
        res.json({success: false, message: error.message})
    }
}

export const createMomoPayment = async (req, res) => {
  try {
    const { courseId } = req.body
    // SỬA: Gọi req.auth()
    const { userId } = req.auth();

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" })

    const course = await Course.findById(courseId)
    if (!course) return res.status(404).json({ success: false, message: "Course not found" })

    const user = await User.findById(userId)
    if (user.enrolledCourses.includes(courseId)) {
      return res.status(400).json({ success: false, message: "Already enrolled" })
    }

    const purchaseData = await Purchase.create({
      courseId,
      userId,
      amount: course.coursePrice,
      status: 'pending'
    })

    // ✅ Tạo extraData
    const extraData = encodeURIComponent(JSON.stringify({
      purchaseId: purchaseData._id.toString(),
      userId,
      courseId
    }))

    const partnerCode = process.env.MOMO_PARTNER_CODE
    const accessKey = process.env.MOMO_ACCESS_KEY
    const secretKey = process.env.MOMO_SECRET_KEY
    const requestId = partnerCode + Date.now()
    const orderId = requestId
    const orderInfo = `Payment for course: ${course.courseTitle}`
    const amount = course.coursePrice.toString()

    const redirectUrl = `${process.env.BACKEND_URL}/api/payment/callback`
    const ipnUrl = `${process.env.BACKEND_URL}/api/momo-webhook`

    const requestType = "payWithMethod"
    const rawSignature = 
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`

    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')

    const body = JSON.stringify({
      partnerCode, accessKey, requestId, amount, orderId, orderInfo,
      redirectUrl, ipnUrl, extraData, requestType, signature, lang: 'en'
    })

    const response = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })
    const data = await response.json()

    if (data.resultCode === 0) {
      res.json({ success: true, payment_url: data.payUrl, purchaseId: purchaseData._id })
    } else {
      await Purchase.findByIdAndUpdate(purchaseData._id, { status: 'failed' })
      res.status(400).json({ success: false, message: data.message || 'Payment failed' })
    }

  } catch (err) {
    console.error('💥 createMomoPayment ERROR:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}


// ✅ Callback khi thanh toán xong
export const handlePaymentCallback = async (req, res) => {
  console.log('🔄 MoMo CALLBACK HIT')
  console.log('📧 Query:', req.query)

  try {
    const { resultCode, message, transId, extraData } = req.query

    // ✅ Giải mã extraData an toàn
    let purchaseId
    try {
      if (extraData) {
        let decoded = decodeURIComponent(extraData)
        try { decoded = decodeURIComponent(decoded) } catch (_) {}
        const parsed = JSON.parse(decoded)
        purchaseId = parsed.purchaseId
      }
    } catch (err) {
      console.error('❌ extraData parse error:', err)
    }

    if (!purchaseId) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=Invalid purchase ID`)
    }

    const purchase = await Purchase.findById(purchaseId)
    if (!purchase) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=Purchase not found`)
    }

    if (resultCode === '0') {
      purchase.status = 'completed'
      purchase.transactionId = transId
      await purchase.save()

      const user = await User.findById(purchase.userId)
      const course = await Course.findById(purchase.courseId)

      if (user && course) {
        if (!user.enrolledCourses.includes(course._id)) {
          user.enrolledCourses.push(course._id)
          await user.save()
        }
        if (!course.enrolledStudents.includes(user._id)) {
          course.enrolledStudents.push(user._id)
          await course.save()
        }
        
        // Tạo Enrollment record cho enrollment management
        const existingEnrollment = await Enrollment.findOne({ student: user._id, course: course._id });
        if (!existingEnrollment) {
          await Enrollment.create({
            student: user._id,
            course: course._id,
            enrollmentType: 'purchase',
            status: 'active'
          });
          console.log('✅ Created Enrollment record for:', user.name);
        }
        
      }

      return res.redirect(`${process.env.FRONTEND_URL}/my-enrollments?success=true`)
    }

    // ❌ Thất bại
    purchase.status = 'failed'
    await purchase.save()
    return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=${encodeURIComponent(message || 'Payment failed')}`)

  } catch (err) {
    console.error('💥 CALLBACK ERROR:', err)
    return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=${encodeURIComponent(err.message)}`)
  }
}

export const updateUserCourseProgress = async (req,res)=>{
    try {
        // SỬA: Gọi req.auth()
        const { userId } = req.auth();
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
        // SỬA: Gọi req.auth()
        const { userId } = req.auth();
        const {courseId} = req.body
        const progressData = await CourseProgress.findOne({userId, courseId})
        res.json({success: true, progressData})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}

// SỬA: Dọn dẹp lại hàm này, loại bỏ code lặp
export const addUserRating = async (req, res) =>{
    try {
        // Check authentication
        if (typeof req.auth !== 'function') {
            return res.json({ success: false, message: 'Authentication middleware not available' });
        }
        
        // Lấy auth data
        const auth = req.auth();
        if (!auth || !auth.userId) {
            return res.json({ success: false, message: 'User not authenticated' });
        }
        
        // Lấy userId và body data
        const userId = auth.userId;
        const { courseId, rating } = req.body;
        
        // Validate input
        if (!courseId || !userId || !rating || rating < 1 || rating > 5){
            return res.json({success: false, message: 'InValid Details'})
        }
        
        const course = await Course.findById(courseId);
        if(!course){
            return res.json({success: false, message: 'Course not found.'})
        }

        const user = await User.findById(userId)
        if(!user || !user.enrolledCourses.includes(courseId)){
            return res.json({ success: false , message: 'User has not purchased this course.'})
        }

        // Tìm và cập nhật rating
        const existingRatingIndex = course.courseRatings.findIndex(r => r.userId.toString() === userId)

        if (existingRatingIndex > -1){
            // Cập nhật rating cũ
            course.courseRatings[existingRatingIndex].rating = rating;
        }else {
            // Thêm rating mới
            course.courseRatings.push({userId, rating})
        }
        await course.save();
        return res.json({success: true, message:'Rating added'}) // Sửa "add" -> "added"

    } catch(error) {
        return res.json({success: false, message: error.message})
    }
}

// Thêm endpoint để refresh enrolled courses
// HÀM NÀY ĐÃ VIẾT ĐÚNG CÚ PHÁP REQ.AUTH() NÊN GIỮ NGUYÊN
export const refreshEnrolledCourses = async (req, res) => {
    try {
        // Check authentication
        if (typeof req.auth !== 'function') {
            return res.json({ success: false, message: 'Authentication middleware not available' });
        }
        
        const auth = req.auth();
        if (!auth || !auth.userId) {
            return res.json({ success: false, message: 'User not authenticated' });
        }
        
        const userId = auth.userId;
        console.log('=== REFRESH ENROLLED COURSES ===');
        console.log('Refreshing enrolled courses for user:', userId);
        
        const userData = await User.findById(userId).populate('enrolledCourses')
        
        if (!userData) {
            return res.json({success: false, message: 'User not found'})
        }
        
        console.log('✅ Refreshed enrolled courses');
        console.log('Enrolled courses count:', userData?.enrolledCourses?.length || 0);
        
        res.json({success: true, enrolledCourses: userData.enrolledCourses})
    } catch (error) {
        console.error('❌ Error in refreshEnrolledCourses:', error);
        res.json({success: false, message: error.message})
    }
}