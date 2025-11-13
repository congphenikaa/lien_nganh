import {Webhook} from "svix";
import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js"
import Course from "../models/Course.js"
import crypto from 'crypto'
import https from 'https';

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
    console.log('🔔🔔🔔 MOMO WEBHOOK TRIGGERED 🔔🔔🔔');
    console.log('📦 Headers:', req.headers);
    console.log('📦 Full Body:', JSON.stringify(req.body, null, 2));

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

        console.log('💰 PAYMENT DETAILS:', {
            resultCode,
            message, 
            orderId,
            amount,
            transId,
            extraData,
            partnerCode
        });

        // Xác thực signature
        const secretKey = process.env.MOMO_SECRET_KEY;
        const accessKey = process.env.MOMO_ACCESS_KEY;
        
        console.log('🔐 KEYS CHECK:', {
            accessKey: accessKey ? '✅ SET' : '❌ MISSING',
            secretKey: secretKey ? '✅ SET' : '❌ MISSING'
        });

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        
        console.log('📝 RAW SIGNATURE:', rawSignature);

        const expectedSignature = crypto.createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        console.log('🔐 SIGNATURE COMPARISON:', {
            received: signature,
            expected: expectedSignature,
            match: signature === expectedSignature
        });

        if (signature !== expectedSignature) {
            console.log('❌ SIGNATURE MISMATCH - Webhook rejected');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        console.log('✅ SIGNATURE VALIDATED');

        // Xử lý kết quả thanh toán
        if (resultCode === 0) {
            console.log('🎉 PAYMENT SUCCESSFUL - Starting enrollment process...');
            
            try {
                // Parse extraData
                let purchaseId;
                console.log('📦 EXTRA DATA RAW:', extraData);
                
                try {
                    const decodedExtraData = Buffer.from(extraData, 'base64').toString();
                    console.log('📦 EXTRA DATA DECODED:', decodedExtraData);
                    const parsedData = JSON.parse(decodedExtraData);
                    purchaseId = parsedData.purchaseId;
                    console.log('🎯 PURCHASE ID FROM WEBHOOK:', purchaseId);
                } catch (parseError) {
                    console.error('❌ BASE64 PARSE ERROR:', parseError.message);
                    // Thử parse trực tiếp
                    try {
                        console.log('🔄 TRYING DIRECT JSON PARSE...');
                        const directParse = JSON.parse(extraData);
                        purchaseId = directParse.purchaseId;
                        console.log('✅ PURCHASE ID FROM DIRECT PARSE:', purchaseId);
                    } catch (e) {
                        console.error('❌ BOTH PARSING METHODS FAILED');
                        return res.status(200).json({ success: false, message: 'Invalid extraData format' });
                    }
                }

                if (!purchaseId) {
                    console.error('❌ PURCHASE ID IS NULL OR UNDEFINED');
                    return res.status(200).json({ success: false, message: 'Missing purchaseId' });
                }

                // Tìm purchase record
                console.log('🔍 SEARCHING FOR PURCHASE IN DATABASE:', purchaseId);
                const purchaseData = await Purchase.findById(purchaseId);
                
                if (!purchaseData) {
                    console.error('❌ PURCHASE NOT FOUND IN DATABASE');
                    return res.status(200).json({ success: false, message: 'Purchase not found' });
                }

                console.log('📋 PURCHASE FOUND:', {
                    id: purchaseData._id,
                    currentStatus: purchaseData.status,
                    userId: purchaseData.userId,
                    courseId: purchaseData.courseId,
                    amount: purchaseData.amount
                });

                // Tìm user và course
                console.log('👤 SEARCHING FOR USER:', purchaseData.userId);
                const userData = await User.findById(purchaseData.userId);
                
                console.log('📚 SEARCHING FOR COURSE:', purchaseData.courseId.toString());
                const courseData = await Course.findById(purchaseData.courseId.toString());

                console.log('✅ DATABASE RESULTS:', {
                    userFound: !!userData,
                    courseFound: !!courseData,
                    userName: userData?.name,
                    courseTitle: courseData?.courseTitle
                });

                if (!userData || !courseData) {
                    console.error('❌ USER OR COURSE NOT FOUND');
                    // NHƯNG VẪN UPDATE STATUS PURCHASE
                    purchaseData.status = 'completed';
                    purchaseData.transactionId = transId;
                    await purchaseData.save();
                    console.log('⚠️ Updated purchase status but enrollment failed');
                    return res.status(200).json({ success: false, message: 'User or Course not found' });
                }

                // QUAN TRỌNG: UPDATE STATUS TRƯỚC KHI XỬ LÝ ENROLLMENT
                console.log('🔄 UPDATING PURCHASE STATUS TO "completed"...');
                purchaseData.status = 'completed';
                purchaseData.transactionId = transId;
                await purchaseData.save();
                console.log('✅ PURCHASE STATUS UPDATED SUCCESSFULLY');

                // Kiểm tra và thêm enrollment
                console.log('🔍 CHECKING EXISTING ENROLLMENT...');
                const isUserEnrolled = userData.enrolledCourses.includes(courseData._id);
                const isCourseEnrolled = courseData.enrolledStudents.includes(userData._id);

                console.log('📊 ENROLLMENT STATUS:', {
                    userEnrolled: isUserEnrolled,
                    courseEnrolled: isCourseEnrolled,
                    userEnrolledCoursesCount: userData.enrolledCourses.length,
                    courseEnrolledStudentsCount: courseData.enrolledStudents.length
                });

                if (!isUserEnrolled) {
                    console.log('➕ ADDING COURSE TO USER ENROLLED COURSES...');
                    userData.enrolledCourses.push(courseData._id);
                    await userData.save();
                    console.log('✅ USER ENROLLMENT UPDATED');
                } else {
                    console.log('ℹ️ USER ALREADY ENROLLED IN THIS COURSE');
                }

                if (!isCourseEnrolled) {
                    console.log('➕ ADDING USER TO COURSE ENROLLED STUDENTS...');
                    courseData.enrolledStudents.push(userData._id);
                    await courseData.save();
                    console.log('✅ COURSE ENROLLMENT UPDATED');
                } else {
                    console.log('ℹ️ USER ALREADY IN COURSE STUDENTS LIST');
                }

                console.log('🎉🎉🎉 ENROLLMENT PROCESS COMPLETED SUCCESSFULLY! 🎉🎉🎉');

            } catch (dbError) {
                console.error('💥 DATABASE UPDATE ERROR:', dbError);
                console.error('💥 ERROR STACK:', dbError.stack);
                console.error('💥 ERROR DETAILS:', {
                    message: dbError.message,
                    name: dbError.name
                });
                return res.status(200).json({ success: false, error: 'Database update failed' });
            }
        } else {
            // Thanh toán thất bại
            console.log('❌ PAYMENT FAILED:', { resultCode, message });
            try {
                let purchaseId;
                try {
                    const decodedExtraData = Buffer.from(extraData, 'base64').toString();
                    const parsedData = JSON.parse(decodedExtraData);
                    purchaseId = parsedData.purchaseId;
                } catch (parseError) {
                    try {
                        const directParse = JSON.parse(extraData);
                        purchaseId = directParse.purchaseId;
                    } catch (e) {
                        console.log('❌ Failed to parse extraData for failed payment');
                        return res.status(200).json({ success: false, message: 'Invalid extraData format' });
                    }
                }

                if (purchaseId) {
                    const purchaseData = await Purchase.findById(purchaseId);
                    if (purchaseData) {
                        purchaseData.status = 'failed';
                        purchaseData.transactionId = transId;
                        await purchaseData.save();
                        console.log(`❌ Payment failed - Purchase ${purchaseId} updated to failed`);
                    }
                }
            } catch (dbError) {
                console.error('❌ Database update error for failed payment:', dbError);
            }
        }

        // QUAN TRỌNG: LUÔN TRẢ VỀ 200 CHO MOMO
        console.log('📤 SENDING 200 RESPONSE TO MOMO');
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('💥💥💥 UNEXPECTED WEBHOOK ERROR:', error);
        console.error('💥💥💥 ERROR STACK:', error.stack);
        // VẪN TRẢ VỀ 200 ĐỂ MOMO KHÔNG RETRY
        res.status(200).json({ success: false, error: 'Internal server error' });
    }
};