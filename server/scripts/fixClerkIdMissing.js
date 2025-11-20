import mongoose from 'mongoose';
import User from '../models/User.js';
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

const fixClerkIdMissing = async () => {
    try {
        console.log('=== SỬA CLERKID THIẾU CHO USERS ===\n');

        // 1. Tìm tất cả users thiếu clerkId
        const usersWithoutClerkId = await User.find({
            $or: [
                { clerkId: { $exists: false } },
                { clerkId: null },
                { clerkId: '' }
            ]
        });

        console.log(`🔍 Tìm thấy ${usersWithoutClerkId.length} users thiếu clerkId:`);

        if (usersWithoutClerkId.length === 0) {
            console.log('✨ Tất cả users đã có clerkId!');
            return;
        }

        // 2. Hiển thị users và fix
        for (const user of usersWithoutClerkId) {
            console.log(`\n👤 User: ${user.name} (${user.email})`);
            console.log(`   ID: ${user._id}`);
            console.log(`   Current clerkId: ${user.clerkId || 'undefined'}`);

            // 🎯 GIẢI PHÁP: Set clerkId = _id (vì Clerk user ID được dùng làm _id)
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                { 
                    clerkId: user._id,  // Set clerkId = _id
                    $unset: { __v: 1 }  // Optional: cleanup version field
                },
                { new: true }
            );

            if (updatedUser) {
                console.log(`   ✅ Fixed: clerkId = ${updatedUser.clerkId}`);
            } else {
                console.log(`   ❌ Failed to update`);
            }
        }

        // 3. Verification
        console.log('\n🔍 Verification - checking again...');
        const stillMissingClerkId = await User.countDocuments({
            $or: [
                { clerkId: { $exists: false } },
                { clerkId: null },
                { clerkId: '' }
            ]
        });

        const usersWithClerkId = await User.countDocuments({ 
            clerkId: { $exists: true, $ne: null, $ne: '' }
        });

        console.log(`✅ Users with clerkId: ${usersWithClerkId}`);
        console.log(`❌ Users still missing clerkId: ${stillMissingClerkId}`);

        if (stillMissingClerkId === 0) {
            console.log('\n🎉 TẤT CẢ USERS ĐÃ CÓ CLERKID!');
            console.log('💡 Bây giờ authentication sẽ hoạt động bình thường');
        } else {
            console.log('\n⚠️  Vẫn còn users thiếu clerkId - cần kiểm tra thủ công');
        }

        // 4. Final report
        console.log('\n📊 FINAL REPORT:');
        const allUsers = await User.find({}).select('_id name email clerkId');
        for (const user of allUsers) {
            const status = user.clerkId ? '✅' : '❌';
            console.log(`   ${status} ${user.name}: clerkId = ${user.clerkId || 'MISSING'}`);
        }

    } catch (error) {
        console.error('❌ Lỗi fix clerkId:', error.message);
    }
};

// Chạy script
const runScript = async () => {
    try {
        await connectDB();
        await fixClerkIdMissing();
        console.log('\n=== FIX HOÀN THÀNH ===');
    } catch (error) {
        console.error('❌ Script thất bại:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

runScript();