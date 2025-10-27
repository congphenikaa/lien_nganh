import React from 'react'
import { UserButton } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

const AdminNavbar = () => {
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
            to='/educator'
            className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors'
          >
            Educator Dashboard
          </Link>
          
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