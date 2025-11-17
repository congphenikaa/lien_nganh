import mongoose from 'mongoose';
import User from '../models/User.js';

// Connect to MongoDB
await mongoose.connect('mongodb+srv://dong2004:Nsd211104@doanliennganh.pyp49xj.mongodb.net/lms');

console.log('🔄 UPDATING USER ROLES...\n');

try {
  // Tìm tất cả users không có role hoặc role undefined
  const usersWithoutRole = await User.find({
    $or: [
      { role: { $exists: false } },
      { role: null },
      { role: undefined }
    ]
  });

  console.log(`📊 Tìm thấy ${usersWithoutRole.length} users cần cập nhật role:`);

  let updatedCount = 0;

  for (const user of usersWithoutRole) {
    try {
      // Cập nhật role thành 'student' cho tất cả users
      await User.findByIdAndUpdate(user._id, { 
        role: 'student' 
      });

      console.log(`  ✅ Cập nhật role cho user: ${user.name} (${user.email}) -> student`);
      updatedCount++;

    } catch (error) {
      console.error(`  ❌ Lỗi cập nhật user ${user._id}:`, error.message);
    }
  }

  console.log('\n🎉 HOÀN THÀNH CẬP NHẬT!');
  console.log(`📊 Kết quả:`);
  console.log(`   - Users đã cập nhật: ${updatedCount}`);
  console.log(`   - Users bị lỗi: ${usersWithoutRole.length - updatedCount}`);
  
  // Kiểm tra kết quả
  console.log('\n🔍 KIỂM TRA KẾT QUẢ:');
  const allUsers = await User.find({}).select('name email role');
  console.log(`📈 Tổng số users: ${allUsers.length}`);
  
  const roleStats = {};
  allUsers.forEach(user => {
    roleStats[user.role || 'undefined'] = (roleStats[user.role || 'undefined'] || 0) + 1;
  });
  
  console.log('📊 Thống kê role:');
  Object.entries(roleStats).forEach(([role, count]) => {
    console.log(`   - ${role}: ${count} users`);
  });

} catch (error) {
  console.error('💥 Lỗi cập nhật:', error);
} finally {
  mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối database');
}