import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const AdminSidebar = () => {
  const location = useLocation()
  
  const menuItems = [
    { path: '/admin', icon: '📊', label: 'Dashboard' },
    { path: '/admin/users', icon: '👥', label: 'User Management' },
    { path: '/admin/courses', icon: '📚', label: 'Course Management' },
    { path: '/admin/revenue', icon: '💰', label: 'Revenue & Analytics' },
    { path: '/admin/reviews', icon: '⭐', label: 'Rating Management' },
    { path: '/admin/educators', icon: '👨‍🏫', label: 'Educator Approval' },
  ]

  return (
    <div className='w-64 bg-gray-800 min-h-screen text-white'>
      <div className='p-6 border-b border-gray-700'>
        <h2 className='text-xl font-bold'>Admin Panel</h2>
      </div>
      
      <nav className='mt-6'>
        {menuItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 transition-colors ${
              location.pathname === item.path ? 'bg-gray-700 border-r-4 border-blue-500' : ''
            }`}
          >
            <span className='text-lg mr-3'>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default AdminSidebar