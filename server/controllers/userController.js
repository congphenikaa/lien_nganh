import User from "../models/User.js"
import { Purchase } from "../models/Purchase.js"
import { CourseProgress } from "../models/CourseProgress.js"
import Course from "../models/Course.js"
import Enrollment from "../models/Enrollment.js"
import crypto from 'crypto'

export const getUserData = async (req, res) => {
    try {
        //  Kiểm tra auth function tồn tại
        if (typeof req.auth !== 'function') {
            console.error(' Auth middleware not available')
            return res.status(401).json({
                success: false, 
                message: 'Authentication middleware not configured'
            });
        }

        const auth = req.auth();
        
        //  Kiểm tra auth object và userId
        if (!auth || !auth.userId) {
            console.error(' Auth failed - no userId. Auth object:', !!auth)
            console.error(' Possible causes: Invalid token, expired session, or Clerk configuration issue')
            return res.status(401).json({
                success: false, 
                message: 'Invalid authentication. Please sign in again.'
            });
        }

        const userId = auth.userId; 
        console.log(' getUserData called for userId:', userId);
        
        // 1. TÌM USER TRONG DB
        let user = await User.findById(userId);
        console.log(' User found in DB:', !!user);
        
        // 2.  LOẠI BỎ LOGIC TẠO USER DỰ PHÒNG TẠI ĐÂY
        if (!user) {
            console.error(' Error: User profile not found in DB. Webhook synchronization failure suspected.');
            console.error(' User ID from token:', userId)
            // Trả về 404 và thông báo lỗi rõ ràng.
            return res.status(404).json({
                success: false, 
                message: 'User profile is not ready. Please wait a moment and refresh the page.'
            });
        }
        
        // 3. LẤY ROLE TỪ CLERK SESSION (LUÔN MỚI)
        const currentRole = auth.sessionClaims?.metadata?.role || 
                            auth.sessionClaims?.publicMetadata?.role ||
                            auth.sessionClaims?.privateMetadata?.role ||
                            user.role || // Fallback to cached role
                            'student'; // Ultimate fallback
        
        console.log(' User role:', currentRole)
        
        // 4. TRẢ VỀ USER VÀ ROLE MỚI
        const userData = {
            ...user.toObject(),
            role: currentRole
        };
        
        res.json({success: true, user: userData});

    } catch (error) {
        console.error(' Error in getUserData:', error);
        
        // Phân loại lỗi cụ thể hơn
        if (error.message?.includes('jwt')) {
            return res.status(401).json({
                success: false, 
                message: 'Invalid token. Please sign in again.'
            });
        }
        
        // Trả về lỗi 500 nếu có lỗi server khác
        res.status(500).json({success: false, message: 'Server error occurred'});
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

    //  Tạo extraData
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

//  Callback khi thanh toán xong
export const handlePaymentCallback = async (req, res) => {
  console.log(' MoMo CALLBACK HIT')
  console.log(' Query:', req.query)

  try {
    const { resultCode, message, transId, extraData } = req.query

    //  Giải mã extraData an toàn
    let purchaseId, userId, courseId
    try {
      if (extraData) {
        let decoded = decodeURIComponent(extraData)
        try { decoded = decodeURIComponent(decoded) } catch (_) {}
        const parsed = JSON.parse(decoded)
        purchaseId = parsed.purchaseId
        userId = parsed.userId
        courseId = parsed.courseId
        console.log(' Parsed data:', { purchaseId, userId, courseId })
      }
    } catch (err) {
      console.error(' extraData parse error:', err)
    }

    if (!purchaseId) {
      console.error(' Missing purchase ID')
      return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=Invalid purchase ID`)
    }

    const purchase = await Purchase.findById(purchaseId)
    if (!purchase) {
      console.error(' Purchase not found:', purchaseId)
      return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=Purchase not found`)
    }

    console.log(' Current purchase status:', purchase.status)

    if (resultCode === '0') {
      //  Thanh toán thành công
      console.log(' Payment successful, updating purchase...')
      purchase.status = 'completed'
      purchase.transactionId = transId
      await purchase.save()

      try {
        //  An toàn hơn khi tìm user và course
        const [user, course] = await Promise.all([
          User.findById(purchase.userId),
          Course.findById(purchase.courseId)
        ])

        if (!user) {
          console.error(' User not found for purchase:', purchase.userId)
          // Vẫn redirect thành công vì payment đã hoàn tất
          return res.redirect(`${process.env.FRONTEND_URL}/payment-success?message=Payment completed but user sync pending`)
        }

        if (!course) {
          console.error(' Course not found for purchase:', purchase.courseId)
          return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=Course not found`)
        }

        console.log(' Processing enrollment for:', user.name)
        console.log(' Course:', course.courseTitle)

        //  Xử lý enrollment
        let enrollmentUpdated = false

        if (!user.enrolledCourses.includes(course._id)) {
          user.enrolledCourses.push(course._id)
          await user.save()
          console.log(' Added course to user')
          enrollmentUpdated = true
        }

        if (!course.enrolledStudents.includes(user._id)) {
          course.enrolledStudents.push(user._id)
          await course.save()
          console.log(' Added user to course')
          enrollmentUpdated = true
        }
        
        //  Tạo Enrollment record cho enrollment management
        const existingEnrollment = await Enrollment.findOne({ 
          student: user._id, 
          course: course._id 
        })

        if (!existingEnrollment) {
          await Enrollment.create({
            student: user._id,
            course: course._id,
            enrollmentType: 'purchase',
            status: 'active'
          })
          console.log(' Created Enrollment record')
          enrollmentUpdated = true
        }

        if (enrollmentUpdated) {
          console.log(' Enrollment completed successfully!')
        } else {
          console.log(' User already enrolled in this course')
        }
        
      } catch (enrollmentError) {
        console.error(' Enrollment error:', enrollmentError)
        // Vẫn redirect thành công vì payment đã hoàn tất
        return res.redirect(`${process.env.FRONTEND_URL}/payment-success?message=Payment completed but enrollment pending`)
      }

      return res.redirect(`${process.env.FRONTEND_URL}/my-enrollments?success=true`)
    }

    //  Thanh toán thất bại
    console.log(' Payment failed:', message)
    purchase.status = 'failed'
    await purchase.save()
    return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=${encodeURIComponent(message || 'Payment failed')}`)

  } catch (err) {
    console.error(' CALLBACK ERROR:', err)
    return res.redirect(`${process.env.FRONTEND_URL}/payment-error?message=${encodeURIComponent('Payment processing error')}`)
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
        
        console.log(' Refreshed enrolled courses');
        console.log('Enrolled courses count:', userData?.enrolledCourses?.length || 0);
        
        res.json({success: true, enrolledCourses: userData.enrolledCourses})
    } catch (error) {
        console.error(' Error in refreshEnrolledCourses:', error);
        res.json({success: false, message: error.message})
    }
}

