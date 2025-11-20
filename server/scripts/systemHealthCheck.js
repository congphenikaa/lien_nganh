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

const systemHealthCheck = async () => {
    try {
        console.log('🏥 === SYSTEM HEALTH CHECK === 🏥\n');

        // 1. Users Health
        console.log('1. 👥 USERS HEALTH:');
        const totalUsers = await User.countDocuments();
        const usersWithClerkId = await User.countDocuments({ 
            clerkId: { $exists: true, $ne: null, $ne: '' }
        });
        const usersWithEmail = await User.countDocuments({ 
            email: { $exists: true, $ne: null, $ne: '' }
        });

        console.log(`   Total Users: ${totalUsers}`);
        console.log(`   Users with clerkId: ${usersWithClerkId} ${usersWithClerkId === totalUsers ? '✅' : '❌'}`);
        console.log(`   Users with email: ${usersWithEmail} ${usersWithEmail === totalUsers ? '✅' : '❌'}`);

        // 2. Purchases Health
        console.log('\n2. 💰 PURCHASES HEALTH:');
        const totalPurchases = await Purchase.countDocuments();
        const completedPurchases = await Purchase.countDocuments({ status: 'completed' });
        const pendingPurchases = await Purchase.countDocuments({ status: 'pending' });
        const failedPurchases = await Purchase.countDocuments({ status: 'failed' });

        console.log(`   Total Purchases: ${totalPurchases}`);
        console.log(`   Completed: ${completedPurchases} ✅`);
        console.log(`   Pending: ${pendingPurchases} ${pendingPurchases > 0 ? '⚠️' : '✅'}`);
        console.log(`   Failed: ${failedPurchases} ${failedPurchases > 0 ? '❌' : '✅'}`);

        // 3. Courses Health
        console.log('\n3. 📚 COURSES HEALTH:');
        const totalCourses = await Course.countDocuments();
        const coursesWithStudents = await Course.countDocuments({ 
            enrolledStudents: { $exists: true, $ne: [] }
        });

        console.log(`   Total Courses: ${totalCourses}`);
        console.log(`   Courses with students: ${coursesWithStudents}`);

        // 4. Enrollments Health
        console.log('\n4. 🎓 ENROLLMENTS HEALTH:');
        const totalEnrollments = await Enrollment.countDocuments();
        const activeEnrollments = await Enrollment.countDocuments({ status: 'active' });

        console.log(`   Total Enrollments: ${totalEnrollments}`);
        console.log(`   Active Enrollments: ${activeEnrollments}`);

        // 5. Relationship Integrity
        console.log('\n5. 🔗 RELATIONSHIP INTEGRITY:');
        
        // Check if all completed purchases have corresponding enrollments
        const completedPurchasesDetails = await Purchase.find({ status: 'completed' });
        let integrityIssues = 0;

        for (const purchase of completedPurchasesDetails) {
            const user = await User.findById(purchase.userId);
            const course = await Course.findById(purchase.courseId);
            
            if (!user || !course) {
                console.log(`   ❌ Missing user/course for purchase ${purchase._id}`);
                integrityIssues++;
                continue;
            }

            const userHasCourse = user.enrolledCourses.includes(purchase.courseId);
            const courseHasUser = course.enrolledStudents.includes(purchase.userId);
            
            if (!userHasCourse || !courseHasUser) {
                console.log(`   ❌ Enrollment mismatch for ${user.name} -> ${course.courseTitle}`);
                integrityIssues++;
            }
        }

        console.log(`   Integrity Issues: ${integrityIssues} ${integrityIssues === 0 ? '✅' : '❌'}`);

        // 6. Environment Health
        console.log('\n6. 🔧 ENVIRONMENT HEALTH:');
        const envChecks = {
            'CLERK_WEBHOOK_SECRET': !!process.env.CLERK_WEBHOOK_SECRET,
            'MONGODB_URI': !!process.env.MONGODB_URI,
            'FRONTEND_URL': !!process.env.FRONTEND_URL,
            'BACKEND_URL': !!process.env.BACKEND_URL,
            'MOMO_PARTNER_CODE': !!process.env.MOMO_PARTNER_CODE,
            'MOMO_ACCESS_KEY': !!process.env.MOMO_ACCESS_KEY,
            'MOMO_SECRET_KEY': !!process.env.MOMO_SECRET_KEY
        };

        for (const [key, value] of Object.entries(envChecks)) {
            console.log(`   ${key}: ${value ? '✅' : '❌'}`);
        }

        // 7. Overall Health Score
        console.log('\n🏆 === OVERALL HEALTH SCORE ===');
        
        let score = 0;
        let maxScore = 0;

        // Users score
        maxScore += 2;
        if (usersWithClerkId === totalUsers) score++;
        if (usersWithEmail === totalUsers) score++;

        // Purchases score
        maxScore += 1;
        if (pendingPurchases === 0) score++;

        // Integrity score
        maxScore += 1;
        if (integrityIssues === 0) score++;

        // Environment score
        maxScore += Object.keys(envChecks).length;
        score += Object.values(envChecks).filter(Boolean).length;

        const percentage = Math.round((score / maxScore) * 100);
        const healthStatus = percentage >= 90 ? '🟢 EXCELLENT' : 
                           percentage >= 75 ? '🟡 GOOD' : 
                           percentage >= 50 ? '🟠 FAIR' : '🔴 POOR';

        console.log(`   Health Score: ${score}/${maxScore} (${percentage}%) ${healthStatus}`);

        // 8. Recommendations
        console.log('\n💡 === RECOMMENDATIONS ===');
        
        if (usersWithClerkId !== totalUsers) {
            console.log('   🔧 Some users missing clerkId - run fixClerkIdMissing.js');
        }
        
        if (pendingPurchases > 0) {
            console.log('   ⏰ Pending purchases detected - check payment processing');
        }
        
        if (integrityIssues > 0) {
            console.log('   🔗 Enrollment integrity issues - run relationship fix scripts');
        }
        
        if (!envChecks.CLERK_WEBHOOK_SECRET) {
            console.log('   🔑 Missing Clerk webhook secret - check .env file');
        }

        if (percentage >= 90) {
            console.log('   🎉 System is healthy! Ready for production');
            console.log('   📝 Consider regular health checks');
        }

        console.log('\n🚀 === READY TO TEST ===');
        console.log('   1. Restart your server');
        console.log('   2. Clear browser cache');
        console.log('   3. Sign out and sign in again');
        console.log('   4. Try payment flow');
        console.log('   5. Check course enrollment');

    } catch (error) {
        console.error('❌ Lỗi health check:', error.message);
    }
};

// Chạy script
const runScript = async () => {
    try {
        await connectDB();
        await systemHealthCheck();
        console.log('\n=== HEALTH CHECK HOÀN THÀNH ===');
    } catch (error) {
        console.error('❌ Script thất bại:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

runScript();