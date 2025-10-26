import React from 'react'
import { useClerk, UserButton } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { assets } from '../../assets/assets'

const AdminNavbar = () => {
  const { openSignIn } = useClerk()

  return (
    <div className='bg-white shadow-sm border-b border-gray-200'>
      <div className='flex justify-between items-center px-6 py-4'>
        <div className='flex items-center'>
          <Link to='/admin' className='text-xl font-bold text-gray-800'>
            Admin Dashboard
          </Link>
        </div>
        
        <div className='flex items-center space-x-4'>
          <Link
            to='/'
            className='text-gray-600 hover:text-gray-900 transition-colors'
          >
            Back to Site
          </Link>
          
          <UserButton />
        </div>
      </div>
    </div>
  )
}

export default AdminNavbar