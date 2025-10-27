// Script to list users and create admin
// Usage: node scripts/makeAdmin.js

import 'dotenv/config'
import { clerkClient } from '@clerk/express'

async function listUsersAndMakeAdmin() {
    try {
        console.log('📋 Fetching all users from Clerk...\n')
        
        const allUsers = await clerkClient.users.getUserList()
        
        if (allUsers.data.length === 0) {
            console.log('❌ No users found. Please sign up a user first on the website.')
            return
        }
        
        console.log('👥 Available users:')
        console.log('==================')
        
        allUsers.data.forEach((user, index) => {
            const email = user.emailAddresses?.[0]?.emailAddress || 'No email'
            const name = user.firstName + ' ' + user.lastName
            const role = user.publicMetadata?.role || 'student'
            
            console.log(`${index + 1}. ${name}`)
            console.log(`   📧 Email: ${email}`)
            console.log(`   🆔 ID: ${user.id}`)
            console.log(`   👤 Current Role: ${role}`)
            console.log('   ' + '─'.repeat(50))
        })
        
        // For now, just show instructions
        console.log('\n📝 To make a user admin:')
        console.log('1. Copy the User ID of the user you want to make admin')
        console.log('2. Edit scripts/createFirstAdmin.js and replace USER_ID')
        console.log('3. Run: node scripts/createFirstAdmin.js')
        
    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

listUsersAndMakeAdmin()