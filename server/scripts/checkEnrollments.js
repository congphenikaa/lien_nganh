import mongoose from 'mongoose';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { CourseProgress } from '../models/CourseProgress.js';

// Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/lien_nganh');

console.log('=== KIỂM TRA DỮ LIỆU ENROLLMENT ===\n');

// 1. Kiểm tra Course có enrolledStudents
console.log('1. Courses với enrolledStudents:');
const coursesWithStudents = await Course.find({ 
  enrolledStudents: { $exists: true, $ne: [] } 
}).select('courseTitle enrolledStudents');

console.log(`Tìm thấy ${coursesWithStudents.length} khóa học có học sinh:`);
for (const course of coursesWithStudents) {
  console.log(`- ${course.courseTitle}: ${course.enrolledStudents.length} học sinh`);
  console.log(`  Student IDs: ${course.enrolledStudents.join(', ')}`);
}

// 2. Kiểm tra bảng Enrollment
console.log('\n2. Enrollment records:');
const enrollments = await Enrollment.find({})
  .populate('student', 'name email')
  .populate('course', 'courseTitle');

console.log(`Tìm thấy ${enrollments.length} enrollment records:`);
for (const enrollment of enrollments) {
  console.log(`- ${enrollment.student?.name} (${enrollment.student?.email}) enrolled in ${enrollment.course?.courseTitle}`);
  console.log(`  Status: ${enrollment.status}, Type: ${enrollment.enrollmentType}`);
}

// 3. Kiểm tra Users có role student
console.log('\n3. Students in database:');
const students = await User.find({ role: 'student' }).select('name email');
console.log(`Tìm thấy ${students.length} students:`);
for (const student of students) {
  console.log(`- ${student.name} (${student.email})`);
}

// 4. Kiểm tra CourseProgress
console.log('\n4. CourseProgress records:');
const progresses = await CourseProgress.find({});
console.log(`Tìm thấy ${progresses.length} course progress records`);

console.log('\n=== KẾT THÚC KIỂM TRA ===');
mongoose.disconnect();