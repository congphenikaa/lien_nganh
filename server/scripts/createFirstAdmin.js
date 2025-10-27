// Script to create the first admin user
// Instructions:
// 1. Sign up a user through the normal registration process
// 2. Copy the user ID from Clerk dashboard 
// 3. Replace USER_ID below with the actual user ID
// 4. Run this script: node scripts/createFirstAdmin.js

import 'dotenv/config'
import { clerkClient } from '@clerk/express'

const USER_ID = 'user_349WTPGXL2ncBN22SXdqfTk1dlS' // Replace with actual user ID

async function createFirstAdmin() {
    try {
        await clerkClient.users.updateUserMetadata(USER_ID, {
            publicMetadata: {
                role: 'admin'
            }
        })
        console.log('Successfully created first admin user with ID:', USER_ID)
    } catch (error) {
        console.error('Error creating admin:', error.message)
    }
}

createFirstAdmin()