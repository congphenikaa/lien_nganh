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
        const { courseId } = req.body
        const { origin } = req.headers
        const userId = req.auth().userId
        
        console.log('🔄 STARTING MOMO PAYMENT:', { userId, courseId, origin });

        const userData = await User.findById(userId)
        const courseData = await Course.findById(courseId)

        if (!userData || !courseData) {
            console.log('❌ USER OR COURSE NOT FOUND');
            return res.json({ success: false, message: 'Data Not Found' })
        }

        // Tính toán số tiền
        const amount = Math.floor(courseData.coursePrice - (courseData.discount * courseData.coursePrice / 100));
        
        console.log('💰 CALCULATED AMOUNT:', amount);

        // Tạo purchase record
        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: amount,
            paymentMethod: 'momo',
            status: 'pending'
        }

        const newPurchase = await Purchase.create(purchaseData)
        console.log('📝 PURCHASE RECORD CREATED:', newPurchase._id);

        // Thông tin MoMo
        const accessKey = process.env.MOMO_ACCESS_KEY
        const secretKey = process.env.MOMO_SECRET_KEY
        const partnerCode = process.env.MOMO_PARTNER_CODE
        
        // KIỂM TRA ENV VARIABLES
        if (!accessKey || !secretKey || !partnerCode) {
            console.error('❌ MOMO ENV VARIABLES MISSING');
            return res.json({ success: false, message: 'Payment configuration error' })
        }

        const orderInfo = `Thanh toán khóa học: ${courseData.courseTitle}`
        const orderId = partnerCode + new Date().getTime()
        const requestId = orderId
        const requestType = "payWithMethod"
        const redirectUrl = `${origin}/loading/my-enrollments`
        const ipnUrl = `${process.env.BACKEND_URL}/api/momo-webhook`
        const extraData = Buffer.from(JSON.stringify({ 
            purchaseId: newPurchase._id.toString(),
            userId: userId,
            courseId: courseId
        })).toString('base64')
        const lang = 'vi'

        console.log('🔗 WEBHOOK URL:', ipnUrl);

        // Tạo signature - SỬA THEO ĐÚNG ĐỊNH DẠNG MOMO
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`
        
        console.log('📝 RAW SIGNATURE FOR CREATION:', rawSignature);

        const signature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex')

        // Tạo request body
        const requestBody = JSON.stringify({
            partnerCode: partnerCode,
            partnerName: "E-Learning Platform",
            storeId: "ElearningStore",
            requestId: requestId,
            amount: amount,
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            lang: lang,
            requestType: requestType,
            autoCapture: true,
            extraData: extraData,
            orderGroupId: "",
            signature: signature
        })

        console.log('🚀 SENDING REQUEST TO MOMO...');

        // Gọi API MoMo
        const options = {
            hostname: 'test-payment.momo.vn',
            port: 443,
            path: '/v2/gateway/api/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            }
        }

        const paymentUrl = await new Promise((resolve, reject) => {
            const req = https.request(options, (response) => {
                let data = ''
                
                response.on('data', (chunk) => {
                    data += chunk
                })
                
                response.on('end', () => {
                    try {
                        console.log('📨 MOMO RESPONSE:', data);
                        const result = JSON.parse(data)
                        if (result.resultCode === 0) {
                            console.log('✅ PAYMENT URL CREATED SUCCESSFULLY');
                            resolve(result.payUrl)
                        } else {
                            console.error('❌ MOMO API ERROR:', result);
                            reject(new Error(result.message || `Payment creation failed: ${result.resultCode}`))
                        }
                    } catch (error) {
                        console.error('❌ MOMO RESPONSE PARSE ERROR:', error);
                        reject(error)
                    }
                })
            })

            req.on('error', (error) => {
                console.error('❌ MOMO REQUEST ERROR:', error);
                reject(error)
            })

            req.write(requestBody)
            req.end()
        })

        console.log('🎯 PAYMENT FLOW COMPLETED, RETURNING URL TO CLIENT');
        res.json({ 
            success: true, 
            payment_url: paymentUrl,
            purchaseId: newPurchase._id 
        })

    } catch (error) {
        console.error('💥 MOMO PAYMENT ERROR:', error)
        res.json({ success: false, message: error.message })
    }
}

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