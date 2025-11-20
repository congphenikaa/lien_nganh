import mongoose from 'mongoose';
import User from '../models/User.js';
import { Purchase } from '../models/Purchase.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import 'dotenv/config';

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI 
            ? `${process.env.MONGODB_URI}/lms`
            : 'mongodb://localhost:27017/lien_nganh';
        
        await mongoose.connect(mongoURI);
        console.log('✅ Kết nối MongoDB thành công');
        console.log(`🔗 Database: ${mongoURI.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local MongoDB'}`);
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error.message);
        process.exit(1);
    }
};

const debugPaymentIssue = async () => {
    try {
        console.log('=== DEBUG PAYMENT & AUTH ISSUES ===\n');

        // 1. Kiểm tra Purchase record gần đây nhất
        console.log('1. 📊 Recent Purchase Records:');
        const recentPurchases = await Purchase.find({})
            .sort({ createdAt: -1 })
            .limit(5);

        if (recentPurchases.length === 0) {
            console.log('   ❌ Không có purchase records nào');
        } else {
            for (const purchase of recentPurchases) {
                console.log(`   📋 Purchase ID: ${purchase._id}`);
                console.log(`      User ID: ${purchase.userId}`);
                console.log(`      Course ID: ${purchase.courseId}`);
                console.log(`      Status: ${purchase.status}`);
                console.log(`      Amount: ${purchase.amount}`);
                console.log(`      Created: ${purchase.createdAt}`);
                console.log(`      ---`);
            }
        }

        // 2. Kiểm tra Users có clerkId
        console.log('\n2. 👥 Users with/without clerkId:');
        const usersWithClerkId = await User.countDocuments({ 
            clerkId: { $exists: true, $ne: null, $ne: '' }
        });
        const usersWithoutClerkId = await User.countDocuments({ 
            $or: [
                { clerkId: { $exists: false } },
                { clerkId: null },
                { clerkId: '' }
            ]
        });

        console.log(`   ✅ Users with clerkId: ${usersWithClerkId}`);
        console.log(`   ❌ Users without clerkId: ${usersWithoutClerkId}`);

        if (usersWithoutClerkId > 0) {
            console.log('\n   🔍 Users without clerkId:');
            const invalidUsers = await User.find({
                $or: [
                    { clerkId: { $exists: false } },
                    { clerkId: null },
                    { clerkId: '' }
                ]
            }).limit(5);

            for (const user of invalidUsers) {
                console.log(`      - ID: ${user._id}, Name: ${user.name}, Email: ${user.email || 'N/A'}`);
            }
        }

        // 3. Kiểm tra Enrollments gần đây
        console.log('\n3. 🎓 Recent Enrollments:');
        const recentEnrollments = await Enrollment.find({})
            .populate('student', 'name email')
            .populate('course', 'courseTitle')
            .sort({ createdAt: -1 })
            .limit(5);

        if (recentEnrollments.length === 0) {
            console.log('   ❌ Không có enrollment records nào');
        } else {
            for (const enrollment of recentEnrollments) {
                console.log(`   📚 ${enrollment.student?.name} -> ${enrollment.course?.courseTitle}`);
                console.log(`      Status: ${enrollment.status}, Type: ${enrollment.enrollmentType}`);
                console.log(`      Created: ${enrollment.createdAt}`);
            }
        }

        // 4. Kiểm tra Purchase có user tương ứng
        console.log('\n4. 🔗 Purchase-User Relationship Check:');
        const purchasesWithMissingUsers = [];
        
        for (const purchase of recentPurchases) {
            const userExists = await User.findById(purchase.userId);
            if (!userExists) {
                purchasesWithMissingUsers.push(purchase);
            }
        }

        if (purchasesWithMissingUsers.length > 0) {
            console.log(`   ❌ Found ${purchasesWithMissingUsers.length} purchases with missing users:`);
            for (const purchase of purchasesWithMissingUsers) {
                console.log(`      Purchase ${purchase._id} -> User ${purchase.userId} (NOT FOUND)`);
            }
        } else {
            console.log('   ✅ Tất cả purchases đều có user tương ứng');
        }

        // 5. Environment check
        console.log('\n5. 🔧 Environment Check:');
        console.log(`   CLERK_WEBHOOK_SECRET: ${process.env.CLERK_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing'}`);
        console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Missing'}`);
        console.log(`   BACKEND_URL: ${process.env.BACKEND_URL || '❌ Missing'}`);
        console.log(`   MOMO_PARTNER_CODE: ${process.env.MOMO_PARTNER_CODE ? '✅ Set' : '❌ Missing'}`);

        // 6. Suggestions
        console.log('\n6. 💡 Khuyến nghị:');
        
        if (usersWithoutClerkId > 0) {
            console.log('   ⚠️  Có users thiếu clerkId - cần chạy script sync');
        }
        
        if (purchasesWithMissingUsers.length > 0) {
            console.log('   ⚠️  Có purchases orphan - user đã bị xóa');
        }
        
        console.log('   📝 Kiểm tra Clerk Dashboard xem webhook có hoạt động không');
        console.log('   🕐 Kiểm tra server time vs Clerk time (iat issue)');
        console.log('   🔄 Restart server để refresh Clerk connection');

    } catch (error) {
        console.error('❌ Lỗi debug:', error.message);
    }
};

// Chạy script
const runScript = async () => {
    try {
        await connectDB();
        await debugPaymentIssue();
        console.log('\n=== DEBUG HOÀN THÀNH ===');
    } catch (error) {
        console.error('❌ Script thất bại:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

runScript();