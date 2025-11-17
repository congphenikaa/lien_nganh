import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User.js';
import '../configs/mongodb.js';

const testClerkIntegration = async () => {
  try {
    console.log('🧪 Testing Clerk integration...');
    
    // Lấy một số user từ database để test
    const users = await User.find({}).limit(3);
    console.log(`📊 Found ${users.length} users in database`);
    
    for (const user of users) {
      console.log(`\n👤 Testing user: ${user.name} (${user.email})`);
      console.log(`   - Database role: ${user.role}`);
      console.log(`   - ClerkId: ${user.clerkId || user._id}`);
      
      try {
        // Test lấy user từ Clerk
        const clerkUser = await clerkClient.users.getUser(user.clerkId || user._id);
        
        console.log(`   - Clerk user found: ✅`);
        console.log(`   - Clerk public metadata:`, clerkUser.publicMetadata);
        console.log(`   - Clerk private metadata:`, clerkUser.privateMetadata);
        
        // Lấy role từ Clerk
        const clerkRole = clerkUser.publicMetadata?.role || 
                         clerkUser.privateMetadata?.role || 
                         'student';
        
        console.log(`   - Clerk role: ${clerkRole}`);
        
        // Kiểm tra sync giữa database và Clerk
        if (user.role !== clerkRole) {
          console.log(`   ⚠️  Role mismatch! DB: ${user.role}, Clerk: ${clerkRole}`);
        } else {
          console.log(`   ✅ Roles match!`);
        }
        
      } catch (clerkError) {
        console.log(`   ❌ Error accessing Clerk:`, clerkError.message);
      }
    }
    
    console.log('\n🎯 Testing role update...');
    
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🔧 Testing role update for user: ${testUser.name}`);
      
      try {
        // Thử cập nhật metadata trong Clerk (test)
        const clerkUser = await clerkClient.users.getUser(testUser.clerkId || testUser._id);
        
        // Lấy role hiện tại
        const currentRole = clerkUser.publicMetadata?.role || 'student';
        console.log(`   - Current role in Clerk: ${currentRole}`);
        
        // Test: Set role thành student (safe update)
        await clerkClient.users.updateUserMetadata(testUser.clerkId || testUser._id, {
          publicMetadata: {
            ...clerkUser.publicMetadata,
            role: 'student'
          }
        });
        
        console.log(`   ✅ Successfully updated Clerk metadata`);
        
      } catch (updateError) {
        console.log(`   ❌ Error updating Clerk metadata:`, updateError.message);
      }
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  } finally {
    process.exit(0);
  }
};

// Chạy test
testClerkIntegration();