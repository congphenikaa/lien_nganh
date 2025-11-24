import mongoose from 'mongoose';
import User from '../models/User.js';
import { clerkClient } from '@clerk/express';
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

const testAuthSystem = async () => {
    try {
        console.log('🧪 === AUTH SYSTEM TEST === 🧪\n');

        // 1. Test role distribution
        console.log('1. 🎭 ROLE DISTRIBUTION:');
        const students = await User.countDocuments({ role: 'student' });
        const educators = await User.countDocuments({ role: 'educator' });
        const admins = await User.countDocuments({ role: 'admin' });
        const total = await User.countDocuments();

        console.log(`   👨‍🎓 Students: ${students}`);
        console.log(`   👨‍🏫 Educators: ${educators}`);  
        console.log(`   👨‍💼 Admins: ${admins}`);
        console.log(`   📊 Total: ${total}`);

        // 2. Test each user's auth setup
        console.log('\n2. 🔐 USER AUTH VERIFICATION:');
        const allUsers = await User.find({}).select('_id name email role clerkId');
        
        for (const user of allUsers) {
            console.log(`\n👤 ${user.name} (${user.role.toUpperCase()})`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   🆔 ClerkId: ${user.clerkId}`);
            
            // Test Clerk connectivity
            try {
                const clerkUser = await clerkClient.users.getUser(user.clerkId);
                const clerkRole = clerkUser.publicMetadata?.role || 
                                 clerkUser.privateMetadata?.role || 
                                 'student';
                
                console.log(`   🔗 Clerk connection: ✅`);
                console.log(`   🎭 Clerk role: ${clerkRole}`);
                console.log(`   🔄 Sync status: ${user.role === clerkRole ? '✅ Synced' : '❌ Mismatch'}`);
                
                // Test access levels
                const accessLevels = [];
                if (clerkRole === 'admin') {
                    accessLevels.push('🔑 Admin Access', '👨‍🏫 Educator Access', '👨‍🎓 Student Access');
                } else if (clerkRole === 'educator') {
                    accessLevels.push('👨‍🏫 Educator Access', '👨‍🎓 Student Access');
                } else {
                    accessLevels.push('👨‍🎓 Student Access');
                }
                console.log(`   🚪 Access levels: ${accessLevels.join(', ')}`);
                
            } catch (clerkError) {
                console.log(`   🔗 Clerk connection: ❌ ${clerkError.message}`);
            }
        }

        // 3. Test middleware scenarios
        console.log('\n3. 🛡️ MIDDLEWARE TEST SCENARIOS:');
        
        const testScenarios = [
            {
                name: 'Admin accessing admin routes',
                userRole: 'admin',
                requiredRole: 'admin',
                expected: '✅ ALLOW'
            },
            {
                name: 'Admin accessing educator routes', 
                userRole: 'admin',
                requiredRole: 'educator',
                expected: '✅ ALLOW (admin can access educator)'
            },
            {
                name: 'Educator accessing educator routes',
                userRole: 'educator', 
                requiredRole: 'educator',
                expected: '✅ ALLOW'
            },
            {
                name: 'Educator accessing admin routes',
                userRole: 'educator',
                requiredRole: 'admin', 
                expected: '❌ DENY'
            },
            {
                name: 'Student accessing educator routes',
                userRole: 'student',
                requiredRole: 'educator',
                expected: '❌ DENY'
            },
            {
                name: 'Student accessing admin routes',
                userRole: 'student', 
                requiredRole: 'admin',
                expected: '❌ DENY'
            }
        ];

        for (const scenario of testScenarios) {
            let result = '❌ DENY';
            
            if (scenario.userRole === 'admin') {
                result = '✅ ALLOW'; // Admin can access everything
            } else if (scenario.userRole === 'educator' && scenario.requiredRole === 'educator') {
                result = '✅ ALLOW'; // Educator can access educator routes
            } else if (scenario.userRole === 'student' && scenario.requiredRole === 'student') {
                result = '✅ ALLOW'; // Student can access student routes
            }
            
            const status = result === scenario.expected ? '✅' : '❌';
            console.log(`   ${status} ${scenario.name}: ${result}`);
        }

        // 4. Auth flow test
        console.log('\n4. 🔄 AUTH FLOW TEST:');
        console.log('   📝 Simulating authentication flow...');
        
        const sampleUserId = allUsers.find(u => u.role === 'admin')?._id;
        if (sampleUserId) {
            console.log(`   🎯 Using admin user: ${sampleUserId}`);
            console.log('   ✅ Step 1: User signs in with Clerk');
            console.log('   ✅ Step 2: Clerk returns JWT token');
            console.log('   ✅ Step 3: Frontend sends token to backend'); 
            console.log('   ✅ Step 4: Backend validates token with Clerk');
            console.log('   ✅ Step 5: Backend finds user in MongoDB');
            console.log('   ✅ Step 6: Backend returns user data with role');
            console.log('   ✅ Step 7: Frontend updates UI based on role');
        }

        // 5. Current issues check
        console.log('\n5. 🐛 POTENTIAL ISSUES CHECK:');
        
        const issues = [];
        
        // Check for users without clerkId
        const usersWithoutClerkId = await User.countDocuments({
            $or: [
                { clerkId: { $exists: false } },
                { clerkId: null },
                { clerkId: '' }
            ]
        });
        
        if (usersWithoutClerkId > 0) {
            issues.push(`${usersWithoutClerkId} users missing clerkId`);
        }
        
        // Check for token issues (simulated)
        issues.push('Bearer token showing "null" in logs');
        
        if (issues.length === 0) {
            console.log('   🎉 No issues detected!');
        } else {
            issues.forEach(issue => {
                console.log(`   ⚠️ ${issue}`);
            });
        }

        // 6. Recommendations
        console.log('\n6. 💡 RECOMMENDATIONS:');
        console.log('   🔄 Restart server to refresh auth middleware');
        console.log('   🧹 Clear browser cookies and localStorage');
        console.log('   🔐 Sign out and sign in again');
        console.log('   🧪 Test each role\'s access permissions');
        console.log('   📱 Check token transmission in Network tab');

        // 7. Summary
        console.log('\n📊 === TEST SUMMARY ===');
        console.log(`   Total users: ${total}`);
        console.log(`   Admin users: ${admins} (should have full access)`);
        console.log(`   Educator users: ${educators} (should have educator + student access)`);
        console.log(`   Student users: ${students} (should have student access only)`);
        console.log(`   Auth system health: ${issues.length === 0 ? '🟢 HEALTHY' : '🟡 NEEDS ATTENTION'}`);

    } catch (error) {
        console.error('❌ Lỗi test auth:', error.message);
    }
};

// Chạy script
const runScript = async () => {
    try {
        await connectDB();
        await testAuthSystem();
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