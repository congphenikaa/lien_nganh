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
    const { courseId } = req.body
    const userId = req.auth.userId

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