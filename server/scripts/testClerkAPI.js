import { clerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testClerkAPI = async () => {
  try {
    console.log('🧪 Testing Clerk API connection...');
    
    // Test lấy danh sách users từ Clerk
    const userList = await clerkClient.users.getUserList({ limit: 3 });
    
    console.log(`📊 Found ${userList.length} users in Clerk`);
    
    for (const user of userList) {
      console.log(`\n👤 User: ${user.firstName} ${user.lastName}`);
      console.log(`   - Email: ${user.emailAddresses[0]?.emailAddress}`);
      console.log(`   - Clerk ID: ${user.id}`);
      console.log(`   - Public metadata:`, user.publicMetadata);
      console.log(`   - Private metadata:`, user.privateMetadata);
      
      // Lấy role từ metadata
      const role = user.publicMetadata?.role || 
                   user.privateMetadata?.role || 
                   'student';
      
      console.log(`   - Role: ${role}`);
    }
    
    console.log('\n✅ Clerk API test completed successfully!');
    
  } catch (error) {
    console.error('💥 Clerk API error:', error.message);
    console.error('Stack:', error.stack);
  }
};

// Chạy test
testClerkAPI();