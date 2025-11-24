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

const syncRolesFromClerk = async () => {
    try {
        console.log('🔄 === SYNC ROLES FROM CLERK TO MONGODB === 🔄\n');

        // 1. Lấy tất cả users từ MongoDB
        const mongoUsers = await User.find({}).select('_id name email role clerkId');
        console.log(`📊 Tìm thấy ${mongoUsers.length} users trong MongoDB:`);

        let syncedCount = 0;
        let errorCount = 0;
        let unchangedCount = 0;

        // 2. Duyệt qua từng user và sync role từ Clerk
        for (const mongoUser of mongoUsers) {
            console.log(`\n👤 Processing: ${mongoUser.name} (${mongoUser.email})`);
            console.log(`   MongoDB Role: ${mongoUser.role}`);
            console.log(`   ClerkId: ${mongoUser.clerkId}`);

            try {
                // 🔍 Lấy thông tin user từ Clerk
                const clerkUser = await clerkClient.users.getUser(mongoUser.clerkId);
                
                // 📝 Lấy role từ Clerk metadata
                const clerkRole = clerkUser.publicMetadata?.role || 
                                 clerkUser.privateMetadata?.role || 
                                 'student'; // Default fallback

                console.log(`   Clerk Role: ${clerkRole}`);

                // 🔄 So sánh và cập nhật nếu cần
                if (mongoUser.role !== clerkRole) {
                    console.log(`   ⚠️  Role mismatch! Updating ${mongoUser.role} -> ${clerkRole}`);
                    
                    // Cập nhật role trong MongoDB
                    await User.findByIdAndUpdate(
                        mongoUser._id,
                        { role: clerkRole },
                        { new: true }
                    );

                    console.log(`   ✅ Updated successfully!`);
                    syncedCount++;
                } else {
                    console.log(`   ✅ Role already in sync`);
                    unchangedCount++;
                }

            } catch (clerkError) {
                console.log(`   ❌ Error fetching from Clerk: ${clerkError.message}`);
                
                // 🔍 Kiểm tra xem có phải user không tồn tại trong Clerk không
                if (clerkError.message.includes('not found') || clerkError.status === 404) {
                    console.log(`   ⚠️  User not found in Clerk - this might be a data inconsistency`);
                    console.log(`   💡 Consider checking if this user should exist or be removed`);
                } else {
                    console.log(`   ⚠️  Clerk API error - skipping for now`);
                }
                
                errorCount++;
            }
        }

        // 3. Summary Report
        console.log(`\n📊 === SYNC SUMMARY ===`);
        console.log(`   Total users processed: ${mongoUsers.length}`);
        console.log(`   Roles synced: ${syncedCount} ✅`);
        console.log(`   Already in sync: ${unchangedCount} ✅`);
        console.log(`   Errors encountered: ${errorCount} ${errorCount > 0 ? '❌' : '✅'}`);

        // 4. Verification
        if (syncedCount > 0) {
            console.log(`\n🔍 === VERIFICATION ===`);
            console.log('Updated users:');
            
            const updatedUsers = await User.find({}).select('_id name email role clerkId');
            for (const user of updatedUsers) {
                try {
                    const clerkUser = await clerkClient.users.getUser(user.clerkId);
                    const clerkRole = clerkUser.publicMetadata?.role || 
                                     clerkUser.privateMetadata?.role || 
                                     'student';
                    
                    const status = user.role === clerkRole ? '✅' : '❌';
                    console.log(`   ${status} ${user.name}: MongoDB=${user.role}, Clerk=${clerkRole}`);
                } catch (error) {
                    console.log(`   ⚠️ ${user.name}: MongoDB=${user.role}, Clerk=Error`);
                }
            }
        }

        // 5. Recommendations
        console.log(`\n💡 === RECOMMENDATIONS ===`);
        
        if (syncedCount > 0) {
            console.log('   🔄 Restart your server to refresh cached user data');
            console.log('   🌐 Refresh browser to see updated permissions');
            console.log('   🧪 Test role-based access controls');
        }
        
        if (errorCount > 0) {
            console.log('   🔍 Review users with Clerk API errors');
            console.log('   📝 Consider cleaning up orphaned users');
        }
        
        if (syncedCount === 0 && errorCount === 0) {
            console.log('   🎉 All roles are already in sync!');
        }

        console.log('\n🎯 Next steps:');
        console.log('   1. Check that middleware now works correctly');
        console.log('   2. Verify user permissions in the UI');
        console.log('   3. Test admin and educator access');

    } catch (error) {
        console.error('❌ Lỗi sync roles:', error.message);
    }
};

// Chạy script
const runScript = async () => {
    try {
        await connectDB();
        await syncRolesFromClerk();
        console.log('\n=== SYNC HOÀN THÀNH ===');
    } catch (error) {
        console.error('❌ Script thất bại:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Đã ngắt kết nối MongoDB');
        process.exit(0);
    }
};

runScript();