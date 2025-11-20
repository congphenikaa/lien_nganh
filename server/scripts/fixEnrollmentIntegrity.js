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
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error.message);
        process.exit(1);
    }
};

const fixEnrollmentIntegrity = async () => {
    try {
        console.log('🔧 === FIX ENROLLMENT INTEGRITY === 🔧\n');

        // 1. Tìm tất cả completed purchases
        const completedPurchases = await Purchase.find({ status: 'completed' });
        console.log(`📊 Tìm thấy ${completedPurchases.length} completed purchases`);

        let fixedCount = 0;
        let errorCount = 0;

        // 2. Duyệt qua từng purchase
        for (const purchase of completedPurchases) {
            console.log(`\n🔍 Processing purchase ${purchase._id}:`);
            
            try {
                // Tìm user và course
                const [user, course] = await Promise.all([
                    User.findById(purchase.userId),
                    Course.findById(purchase.courseId)
                ]);

                if (!user) {
                    console.log(`   ❌ User ${purchase.userId} not found`);
                    errorCount++;
                    continue;
                }

                if (!course) {
                    console.log(`   ❌ Course ${purchase.courseId} not found`);
                    errorCount++;
                    continue;
                }

                console.log(`   👤 User: ${user.name}`);
                console.log(`   📚 Course: ${course.courseTitle}`);

                let needsUpdate = false;

                // Kiểm tra user.enrolledCourses
                const userHasCourse = user.enrolledCourses.some(courseId => 
                    courseId.toString() === course._id.toString()
                );
                
                if (!userHasCourse) {
                    console.log(`   ⚠️  User missing course - adding...`);
                    user.enrolledCourses.push(course._id);
                    needsUpdate = true;
                }

                // Kiểm tra course.enrolledStudents
                const courseHasUser = course.enrolledStudents.some(userId => 
                    userId.toString() === user._id.toString()
                );
                
                if (!courseHasUser) {
                    console.log(`   ⚠️  Course missing user - adding...`);
                    course.enrolledStudents.push(user._id);
                    needsUpdate = true;
                }

                // Save changes
                if (needsUpdate) {
                    await Promise.all([
                        userHasCourse ? Promise.resolve() : user.save(),
                        courseHasUser ? Promise.resolve() : course.save()
                    ]);

                    // Tạo Enrollment record nếu chưa có
                    const existingEnrollment = await Enrollment.findOne({
                        student: user._id,
                        course: course._id
                    });

                    if (!existingEnrollment) {
                        await Enrollment.create({
                            student: user._id,
                            course: course._id,
                            enrollmentType: 'purchase',
                            status: 'active'
                        });
                        console.log(`   ✅ Created Enrollment record`);
                    }

                    console.log(`   ✅ Fixed enrollment relationship`);
                    fixedCount++;
                } else {
                    console.log(`   ✅ Already correctly enrolled`);
                }

            } catch (error) {
                console.log(`   ❌ Error processing purchase: ${error.message}`);
                errorCount++;
            }
        }

        // 3. Summary
        console.log(`\n📊 === SUMMARY ===`);
        console.log(`   Total purchases processed: ${completedPurchases.length}`);
        console.log(`   Relationships fixed: ${fixedCount}`);
        console.log(`   Errors encountered: ${errorCount}`);

        // 4. Verification
        console.log(`\n🔍 === VERIFICATION ===`);
        
        // Check integrity again
        let integrityIssues = 0;
        for (const purchase of completedPurchases) {
            const user = await User.findById(purchase.userId);
            const course = await Course.findById(purchase.courseId);
            
            if (!user || !course) continue;

            const userHasCourse = user.enrolledCourses.some(courseId => 
                courseId.toString() === course._id.toString()
            );
            const courseHasUser = course.enrolledStudents.some(userId => 
                userId.toString() === user._id.toString()
            );
            
            if (!userHasCourse || !courseHasUser) {
                integrityIssues++;
            }
        }

        console.log(`   Remaining integrity issues: ${integrityIssues} ${integrityIssues === 0 ? '✅' : '❌'}`);

        // 5. Clean up pending purchases (optional)
        console.log(`\n🧹 === CLEANUP PENDING PURCHASES ===`);
        const oldPendingPurchases = await Purchase.find({ 
            status: 'pending',
            createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Older than 24 hours
        });

        console.log(`   Found ${oldPendingPurchases.length} old pending purchases`);
        
        if (oldPendingPurchases.length > 0) {
            console.log(`   ⚠️  Consider marking these as failed or investigating:`);
            for (const purchase of oldPendingPurchases.slice(0, 5)) { // Show first 5
                console.log(`      - ${purchase._id} (${purchase.createdAt})`);
            }
        }

        if (fixedCount > 0 || errorCount === 0) {
            console.log(`\n🎉 Enrollment integrity fix completed successfully!`);
        }

    } catch (error) {
        console.error('❌ Lỗi fix integrity:', error.message);
    }
};

// Chạy script
const runScript = async () => {
    try {
        await connectDB();
        await fixEnrollmentIntegrity();
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