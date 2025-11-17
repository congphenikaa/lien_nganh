import mongoose from 'mongoose';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';

// Connect to MongoDB
await mongoose.connect('mongodb+srv://dong2004:Nsd211104@doanliennganh.pyp49xj.mongodb.net/lms');

console.log('🔄 ĐỒNG BỘ DỮ LIỆU ENROLLMENT...\n');

try {
  // 1. Tìm tất cả course có enrolledStudents
  const coursesWithStudents = await Course.find({ 
    enrolledStudents: { $exists: true, $ne: [] } 
  }).populate('enrolledStudents', 'name email');

  console.log(`📚 Tìm thấy ${coursesWithStudents.length} khóa học có học sinh:`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const course of coursesWithStudents) {
    console.log(`\n📖 Xử lý khóa học: ${course.courseTitle}`);
    console.log(`👥 Số học sinh: ${course.enrolledStudents.length}`);

    for (const studentId of course.enrolledStudents) {
      try {
        // Kiểm tra xem Enrollment đã tồn tại chưa
        const existingEnrollment = await Enrollment.findOne({
          student: studentId,
          course: course._id
        });

        if (existingEnrollment) {
          console.log(`  ⏭️  Student ${studentId} đã có enrollment record`);
          totalSkipped++;
          continue;
        }

        // Tạo Enrollment record mới
        const enrollment = await Enrollment.create({
          student: studentId,
          course: course._id,
          enrollmentType: 'purchase', // Giả định là thanh toán
          status: 'active'
        });

        console.log(`  ✅ Tạo enrollment record cho student ${studentId}`);
        totalCreated++;

      } catch (error) {
        console.error(`  ❌ Lỗi tạo enrollment cho student ${studentId}:`, error.message);
      }
    }
  }

  console.log('\n🎉 HOÀN THÀNH ĐỒNG BỘ!');
  console.log(`📊 Kết quả:`);
  console.log(`   - Enrollment records mới tạo: ${totalCreated}`);
  console.log(`   - Enrollment records đã tồn tại: ${totalSkipped}`);
  
  // Kiểm tra kết quả
  console.log('\n🔍 KIỂM TRA KẾT QUẢ:');
  const totalEnrollments = await Enrollment.countDocuments();
  console.log(`📈 Tổng số enrollment records hiện tại: ${totalEnrollments}`);

} catch (error) {
  console.error('💥 Lỗi đồng bộ:', error);
} finally {
  mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối database');
}