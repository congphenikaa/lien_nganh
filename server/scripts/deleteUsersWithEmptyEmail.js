import mongoose from 'mongoose';
import User from '../models/User.js';
import 'dotenv/config';

// Connect to MongoDB
const connectDB = async () => {
    try {
        // Sử dụng MONGODB_URI từ .env hoặc fallback local
        const mongoURI = process.env.MONGODB_URI 
            ? `${process.env.MONGODB_URI}/lms`
            : 'mongodb://localhost:27017/lien_nganh';
        
        await mongoose.connect(mongoURI);
        console.log('✅ Kết nối MongoDB thành công');
        console.log(`🔗 Database: ${mongoURI.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local MongoDB'}`);
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error.message);
        console.error('💡 Hướng dẫn:');
        console.error('   - Đảm bảo MongoDB đang chạy (local) hoặc');
        console.error('   - Kiểm tra MONGODB_URI trong file .env (Atlas)');
        process.exit(1);
    }
};

const deleteUsersWithEmptyEmail = async () => {
    try {
        console.log('=== SCRIPT XÓA USER CÓ EMAIL TRỐNG ===\n');

        // 1. Tìm tất cả user có email trống
        console.log('🔍 Tìm kiếm users có email trống...');
        const usersWithEmptyEmail = await User.find({ 
            $or: [
                { email: "" },
                { email: { $exists: false } },
                { email: null }
            ]
        });

        console.log(`📊 Tìm thấy ${usersWithEmptyEmail.length} users có email trống:`);
        
        if (usersWithEmptyEmail.length === 0) {
            console.log('✨ Không có user nào có email trống. Database đã sạch!');
            return;
        }

        // 2. Hiển thị thông tin các user sẽ bị xóa
        console.log('\n📋 Danh sách users sẽ bị xóa:');
        usersWithEmptyEmail.forEach((user, index) => {
            console.log(`${index + 1}. ID: ${user._id}`);
            console.log(`   Name: ${user.name || 'N/A'}`);
            console.log(`   Email: "${user.email || 'undefined'}"`);
            console.log(`   Role: ${user.role}`);
            console.log(`   ClerkId: ${user.clerkId || 'N/A'}`);
            console.log(`   Created: ${user.createdAt || 'N/A'}`);
            console.log('   ---');
        });

        // 3. Xác nhận xóa (trong production nên thêm prompt xác nhận)
        console.log('⚠️  CẢNH BÁO: Script sẽ xóa tất cả users trên!\n');
        
        // Uncomment dòng dưới nếu muốn xác nhận thủ công
        // const readline = require('readline').createInterface({
        //     input: process.stdin,
        //     output: process.stdout
        // });
        // 
        // const confirm = await new Promise(resolve => {
        //     readline.question('Bạn có chắc chắn muốn xóa? (yes/no): ', resolve);
        // });
        // readline.close();
        // 
        // if (confirm.toLowerCase() !== 'yes') {
        //     console.log('❌ Hủy bỏ thao tác xóa');
        //     return;
        // }

        // 4. Thực hiện xóa
        console.log('🗑️  Đang xóa users...');
        const deleteResult = await User.deleteMany({ 
            $or: [
                { email: "" },
                { email: { $exists: false } },
                { email: null }
            ]
        });

        // 5. Hiển thị kết quả
        console.log('\n✅ KẾT QUẢ XÓA:');
        console.log(`📊 Số users đã xóa: ${deleteResult.deletedCount}`);
        console.log(`📊 Số users còn lại trong database: ${await User.countDocuments()}`);

        // 6. Kiểm tra lại
        const remainingEmptyEmailUsers = await User.find({ 
            $or: [
                { email: "" },
                { email: { $exists: false } },
                { email: null }
            ]
        });

        if (remainingEmptyEmailUsers.length === 0) {
            console.log('✨ Đã xóa thành công tất cả users có email trống!');
        } else {
            console.log(`⚠️  Vẫn còn ${remainingEmptyEmailUsers.length} users có email trống`);
        }

    } catch (error) {
        console.error('❌ Lỗi khi xóa users:', error.message);
        throw error;
    }
};

// Chạy script
const runScript = async () => {
    try {
        await connectDB();
        await deleteUsersWithEmptyEmail();
        console.log('\n=== HOÀN THÀNH ===');
    } catch (error) {
        console.error('❌ Script thất bại:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

runScript();