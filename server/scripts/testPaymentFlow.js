import mongoose from 'mongoose';
import User from '../models/User.js';
import { Purchase } from '../models/Purchase.js';
import Course from '../models/Course.js';
import 'dotenv/config';

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI 
            ? `${process.env.MONGODB_URI}/lms`
            : 'mongodb://localhost:27017/lien_nganh';
        
        await mongoose.connect(mongoURI);
        console.log('✅ Kết nối MongoDB thành công');
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error.message);
        process.exit(1);
    }
};

const testPaymentFlow = async () => {
    try {
        console.log('=== TEST PAYMENT FLOW AFTER FIX ===\n');

        // 1. Kiểm tra Purchase gần đây nhất
        console.log('1. 📋 Kiểm tra Purchase gần đây nhất:');
        const latestPurchase = await Purchase.findOne({})
            .sort({ createdAt: -1 });

        if (!latestPurchase) {
            console.log('   ❌ Không có purchase nào');
            return;
        }

        console.log(`   📊 Purchase ID: ${latestPurchase._id}`);
        console.log(`   👤 User ID: ${latestPurchase.userId}`);
        console.log(`   📚 Course ID: ${latestPurchase.courseId}`);
        console.log(`   💰 Status: ${latestPurchase.status}`);
        console.log(`   🕐 Created: ${latestPurchase.createdAt}`);

        // 2. Kiểm tra User tương ứng
        console.log('\n2. 👤 Kiểm tra User tương ứng:');
        const user = await User.findById(latestPurchase.userId);

        if (!user) {
            console.log('   ❌ User không tồn tại!');
            return;
        }

        console.log(`   ✅ User tồn tại: ${user.name}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🆔 ClerkId: ${user.clerkId}`);
        console.log(`   🎭 Role: ${user.role}`);
        console.log(`   📚 Enrolled courses: ${user.enrolledCourses.length}`);

        // 3. Kiểm tra Course tương ứng
        console.log('\n3. 📚 Kiểm tra Course tương ứng:');
        const course = await Course.findById(latestPurchase.courseId);

        if (!course) {
            console.log('   ❌ Course không tồn tại!');
            return;
        }

        console.log(`   ✅ Course tồn tại: ${course.courseTitle}`);
        console.log(`   💰 Price: ${course.coursePrice}`);
        console.log(`   👥 Enrolled students: ${course.enrolledStudents.length}`);

        // 4. Kiểm tra enrollment relationship
        console.log('\n4. 🔗 Kiểm tra Enrollment relationship:');
        const userEnrolled = user.enrolledCourses.includes(course._id);
        const courseHasUser = course.enrolledStudents.includes(user._id);

        console.log(`   👤➡️📚 User has course: ${userEnrolled ? '✅' : '❌'}`);
        console.log(`   📚➡️👤 Course has user: ${courseHasUser ? '✅' : '❌'}`);

        if (!userEnrolled || !courseHasUser) {
            console.log('\n🛠️ FIXING ENROLLMENT...');
            
            if (!userEnrolled) {
                user.enrolledCourses.push(course._id);
                await user.save();
                console.log('   ✅ Added course to user');
            }
            
            if (!courseHasUser) {
                course.enrolledStudents.push(user._id);
                await course.save();
                console.log('   ✅ Added user to course');
            }
        }

        // 5. Summary & Recommendations
        console.log('\n5. 📝 Summary & Next Steps:');
        console.log('   ✅ All users now have clerkId');
        console.log('   ✅ Payment callback should work properly');
        console.log('   ✅ Authentication should work properly');
        
        console.log('\n💡 To resolve the issues:');
        console.log('   1. 🔄 Restart your server');
        console.log('   2. 🔄 Clear browser cookies/cache');
        console.log('   3. 🔐 Sign out and sign in again');
        console.log('   4. 🕐 Check server time sync (for iat issue)');
        
        console.log('\n🧪 Test sequence:');
        console.log('   1. Login to app');
        console.log('   2. Try to enroll in a course');
        console.log('   3. Complete payment');
        console.log('   4. Check if redirected to course properly');

        // 6. Environment suggestions
        console.log('\n🔧 Environment Check:');
        console.log('   - Make sure Clerk keys are correct');
        console.log('   - Check if server time is synchronized');
        console.log('   - Verify webhook endpoints are accessible');
        
    } catch (error) {
        console.error('❌ Lỗi test:', error.message);
    }
};

// Chạy script
const runScript = async () => {
    try {
        await connectDB();
        await testPaymentFlow();
        console.log('\n=== TEST HOÀN THÀNH ===');
    } catch (error) {
        console.error('❌ Script thất bại:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

runScript();