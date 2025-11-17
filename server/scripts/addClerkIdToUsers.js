import mongoose from 'mongoose';
import User from '../models/User.js';
import '../configs/mongodb.js';

const addClerkIdToUsers = async () => {
  try {
    console.log('🔄 Starting migration to add clerkId to existing users...');

    // Tìm tất cả user không có clerkId
    const usersWithoutClerkId = await User.find({
      $or: [
        { clerkId: { $exists: false } },
        { clerkId: null },
        { clerkId: '' }
      ]
    });

    console.log(`📊 Found ${usersWithoutClerkId.length} users without clerkId`);

    if (usersWithoutClerkId.length === 0) {
      console.log('✅ All users already have clerkId');
      return;
    }

    // Cập nhật từng user để set clerkId = _id (vì _id đã là Clerk user ID)
    let updatedCount = 0;

    for (const user of usersWithoutClerkId) {
      try {
        await User.findByIdAndUpdate(user._id, {
          clerkId: user._id // _id là Clerk user ID
        });
        updatedCount++;
        console.log(`✅ Updated user ${user.name} (${user.email}) with clerkId: ${user._id}`);
      } catch (error) {
        console.error(`❌ Error updating user ${user._id}:`, error.message);
      }
    }

    console.log(`🎉 Migration completed! Updated ${updatedCount} users with clerkId`);

    // Kiểm tra kết quả
    const remainingUsers = await User.find({
      $or: [
        { clerkId: { $exists: false } },
        { clerkId: null },
        { clerkId: '' }
      ]
    }).countDocuments();

    console.log(`📈 Remaining users without clerkId: ${remainingUsers}`);

  } catch (error) {
    console.error('💥 Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Chạy migration
addClerkIdToUsers();