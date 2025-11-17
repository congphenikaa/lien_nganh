import {Webhook} from "svix";
import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js"
import Course from "../models/Course.js"
import Enrollment from "../models/Enrollment.js"
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
                // Get role from Clerk metadata (public or private)
                const clerkRole = data.public_metadata?.role || 
                                 data.private_metadata?.role || 
                                 'student'; // Default to student
                
                const userData = {
                    _id: data.id,
                    clerkId: data.id, // Save Clerk ID
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                    role: clerkRole // Cache role from Clerk metadata
                }
                await User.create(userData)
                res.json({})
                break;
            }

            case 'user.updated': {
                // Get updated role from Clerk metadata
                const clerkRole = data.public_metadata?.role || 
                                 data.private_metadata?.role || 
                                 'student'; // Default to student
                
                const userData = {
                    clerkId: data.id, // Ensure clerkId is saved
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                    role: clerkRole // Update cached role from Clerk metadata
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
  console.log('🔔 MOMO WEBHOOK RECEIVED');
  
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

    console.log('💰 PAYMENT RESULT:', { resultCode, message, orderId, amount });

    // LUÔN TRẢ VỀ 200 NGAY LẬP TỨC
    res.status(200).json({ success: true });

    // Xử lý bất đồng bộ sau khi đã response
    processWebhookAsync(req.body);

  } catch (error) {
    console.error('💥 WEBHOOK ERROR:', error);
    // VẪN TRẢ VỀ 200 ĐỂ MOMO KHÔNG RETRY
    res.status(200).json({ success: true });
  }
};

// Hàm xử lý webhook bất đồng bộ
const processWebhookAsync = async (webhookData) => {
  try {
    const { 
      resultCode, 
      message, 
      orderId, 
      transId, 
      extraData,
      amount 
    } = webhookData;

    console.log('🔄 PROCESSING WEBHOOK ASYNC...');

    // Parse extraData
    let purchaseId;
    try {
      const decodedExtraData = Buffer.from(extraData, 'base64').toString();
      const parsedData = JSON.parse(decodedExtraData);
      purchaseId = parsedData.purchaseId;
      console.log('🎯 PURCHASE ID:', purchaseId);
    } catch (error) {
      console.error('❌ ERROR PARSING EXTRADATA:', error);
      return;
    }

    if (!purchaseId) {
      console.error('❌ MISSING PURCHASE ID');
      return;
    }

    // Tìm purchase record
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      console.error('❌ PURCHASE NOT FOUND:', purchaseId);
      return;
    }

    console.log('📋 CURRENT PURCHASE STATUS:', purchase.status);

    if (resultCode === 0) {
      // THANH TOÁN THÀNH CÔNG
      console.log('🎉 PAYMENT SUCCESS - UPDATING PURCHASE...');
      
      // Cập nhật purchase status
      purchase.status = 'completed';
      purchase.transactionId = transId;
      await purchase.save();
      
      console.log('✅ PURCHASE UPDATED TO COMPLETED');

      // Thực hiện enrollment
      await processEnrollment(purchase);

    } else {
      // THANH TOÁN THẤT BẠI
      console.log('❌ PAYMENT FAILED:', message);
      purchase.status = 'failed';
      purchase.transactionId = transId;
      await purchase.save();
    }

  } catch (error) {
    console.error('💥 ASYNC PROCESSING ERROR:', error);
  }
};

// Hàm xử lý enrollment
const processEnrollment = async (purchase) => {
  try {
    console.log('🎓 PROCESSING ENROLLMENT...');
    
    const { userId, courseId } = purchase;

    // Tìm user và course
    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId)
    ]);

    if (!user || !course) {
      console.error('❌ USER OR COURSE NOT FOUND');
      return;
    }

    console.log('👤 USER:', user.name);
    console.log('📚 COURSE:', course.courseTitle);

    // Kiểm tra và thêm enrollment
    const isUserEnrolled = user.enrolledCourses.includes(courseId);
    const isCourseEnrolled = course.enrolledStudents.includes(userId);

    if (!isUserEnrolled) {
      user.enrolledCourses.push(courseId);
      await user.save();
      console.log('✅ ADDED COURSE TO USER');
    }

    if (!isCourseEnrolled) {
      course.enrolledStudents.push(userId);
      await course.save();
      console.log('✅ ADDED USER TO COURSE');
    }

    // Tạo Enrollment record cho enrollment management
    const existingEnrollment = await Enrollment.findOne({ student: userId, course: courseId });
    if (!existingEnrollment) {
      await Enrollment.create({
        student: userId,
        course: courseId,
        enrollmentType: 'purchase',
        status: 'active'
      });
      console.log('✅ CREATED ENROLLMENT RECORD');
    }

    console.log('🎉🎉🎉 ENROLLMENT COMPLETED SUCCESSFULLY!');

  } catch (error) {
    console.error('💥 ENROLLMENT ERROR:', error);
  }
};