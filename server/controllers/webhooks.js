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
                    email: data.email_address[0].email_address,
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
        
        const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        
        const expectedSignature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.log('Invalid signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Xử lý kết quả thanh toán
        if (resultCode === 0) {
            // Thanh toán thành công
            try {
                const decodedExtraData = JSON.parse(Buffer.from(extraData, 'base64').toString());
                const purchaseId = decodedExtraData.purchaseId;

                const purchaseData = await Purchase.findById(purchaseId);
                const userData = await User.findById(purchaseData.userId);
                const courseData = await Course.findById(purchaseData.courseId.toString());

                // Cập nhật thông tin
                courseData.enrolledStudents.push(userData);
                await courseData.save();

                userData.enrolledCourses.push(courseData._id);
                await userData.save();

                purchaseData.status = 'completed';
                purchaseData.transactionId = transId;
                await purchaseData.save();

                console.log(`Payment successful for purchase: ${purchaseId}`);
                
            } catch (dbError) {
                console.error('Database update error:', dbError);
            }
        } else {
            // Thanh toán thất bại
            try {
                const decodedExtraData = JSON.parse(Buffer.from(extraData, 'base64').toString());
                const purchaseId = decodedExtraData.purchaseId;

                const purchaseData = await Purchase.findById(purchaseId);
                purchaseData.status = 'failed';
                purchaseData.transactionId = transId;
                await purchaseData.save();

                console.log(`Payment failed for purchase: ${purchaseId}`);
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