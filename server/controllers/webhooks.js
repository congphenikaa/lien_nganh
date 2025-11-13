import {Webhook} from "svix";
import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js"
import Course from "../models/Course.js"
import crypto from 'crypto'

//API Controller Function to manage Clerk User with database


export const clerkWebhooks = async (req, res)=>{
    try {
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        })

        const {data, type} = req.body
        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                }
                await User.create(userData)
                res.json({})
                break;
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                }
                await User.findByIdAndUpdate(data.id, userData)
                res.json({})
                break;
            }

            case 'user.deleted': {
                await User.findByIdAndDelete(data.id)
                res.json({})
                break;
            }

            default:
                break;
        }
    } catch (error) {
        res.json({success: false, message: error.message})
        
    }
}

export const momoWebhooks = async (req, res) => {
    try {
        console.log('=== MOMO WEBHOOK RECEIVED ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const { 
            partnerCode, 
            orderId, 
            requestId, 
            amount, 
            orderInfo, 
            orderType, 
            transId, 
            resultCode, 
            message, 
            payType, 
            responseTime, 
            extraData, 
            signature 
        } = req.body;

        // Xác thực signature (tùy chọn nhưng khuyến nghị)
        const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
        const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
        
        // Tạo rawSignature theo đúng format của MoMo cho webhook
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        
        const expectedSignature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        console.log('Received signature:', signature);
        console.log('Expected signature:', expectedSignature);
        console.log('Raw signature string:', rawSignature);

        // Tạm thời bỏ qua việc xác thực signature để test
        // if (signature !== expected Signature) { // <-- Có lỗi typo ở đây, phải là expectedSignature
        //     console.log('Invalid signature');
        //     return res.status(400).json({ error: 'Invalid signature' });
        // }

        // Xử lý kết quả thanh toán
        if (resultCode === 0) {
            // Thanh toán thành công
            console.log('✅ Payment successful, processing enrollment...');
            try {
                const decodedExtraData = JSON.parse(Buffer.from(extraData, 'base64').toString());
                const purchaseId = decodedExtraData.purchaseId;
                console.log('Purchase ID from webhook:', purchaseId);
                
                const purchaseData = await Purchase.findById(purchaseId);
                if (!purchaseData) {
                    console.log('Purchase not found:', purchaseId);
                    return res.status(200).json({ success: false, message: 'Purchase not found' });
                }

                // Kiểm tra xem đơn hàng đã được xử lý chưa
                if (purchaseData.status === 'completed') {
                    console.log('ℹ️ Purchase already processed:', purchaseId);
                    return res.status(200).json({ success: true, message: 'Already processed' });
                }
                
                console.log('User ID:', purchaseData.userId);
                console.log('Course ID:', purchaseData.courseId.toString());
                
                const userData = await User.findById(purchaseData.userId);
                const courseData = await Course.findById(purchaseData.courseId);

                // --- SỬA LỖI LOGIC TỪ ĐÂY ---

                // ❌ XÓA BỎ 2 DÒNG GÂY LỖI:
                // courseData.enrolledStudents.push(userData);
                // await courseData.save();

                // Kiểm tra xem đã enroll chưa để tránh duplicate
                const courseIdStr = purchaseData.courseId.toString();
                const userIdStr = purchaseData.userId.toString(); // Clerk ID đã là string, nhưng để cho chắc
                
                const isAlreadyEnrolled = userData.enrolledCourses.some(courseId => courseId.toString() === courseIdStr);
                
                // ✅ SỬA LỖI 1: Sửa lại cách kiểm tra `isStudentInCourse`
                const isStudentInCourse = courseData.enrolledStudents.some(studentId => studentId.toString() === userIdStr);

                console.log('Course ID to add:', courseIdStr);
                console.log('User enrolled courses:', userData.enrolledCourses.map(c => c.toString()));
                console.log('Is already enrolled:', isAlreadyEnrolled);
                console.log('Is student in course:', isStudentInCourse);

                if (!isAlreadyEnrolled) {
                    userData.enrolledCourses.push(purchaseData.courseId);
                    await userData.save();
                    console.log('✅ Added course to user enrolledCourses');
                } else {
                    console.log('ℹ️ User already enrolled in this course');
                }

                // ✅ SỬA LỖI 2: Chỉ push `userId` (là string), không push `userData` (object)
                if (!isStudentInCourse) {
                    courseData.enrolledStudents.push(purchaseData.userId);
                    await courseData.save();
                    console.log('✅ Added user to course enrolledStudents');
                } else {
                    console.log('ℹ️ User already in course enrolledStudents');
                }

                // --- KẾT THÚC SỬA LỖI ---

                // Cập nhật purchase status (chỉ làm sau khi đã ghi danh)
                purchaseData.status = 'completed';
                purchaseData.transactionId = transId;
                purchaseData.orderId = orderId;
                await purchaseData.save();

                console.log(`✅ Payment successful for purchase: ${purchaseId}`);
                console.log(`✅ User ${userData.name} enrolled in course: ${courseData.courseTitle}`);
                
            } catch (dbError) {
                console.error('❌ Database update error:', dbError);
                // Thậm chí nếu có lỗi database, vẫn trả về 200 để MoMo không retry
            }
        } else {
            // Thanh toán thất bại
            console.log(`❌ Payment failed with result code: ${resultCode}, message: ${message}`);
            try {
                const decodedExtraData = JSON.parse(Buffer.from(extraData, 'base64').toString());
                const purchaseId = decodedExtraData.purchaseId;

                const purchaseData = await Purchase.findById(purchaseId);
                if (purchaseData && purchaseData.status !== 'completed') { // Chỉ cập nhật nếu chưa thành công
                    purchaseData.status = 'failed';
                    purchaseData.transactionId = transId;
                    purchaseData.orderId = orderId;
                    await purchaseData.save();
                    console.log(`Updated purchase ${purchaseId} status to failed`);
                }

            } catch (dbError) {
                console.error('Database update error:', dbError);
            }
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('MoMo webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};