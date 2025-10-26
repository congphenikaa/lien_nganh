import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { assets } from '../../assets/assets'

const AdminSidebar = () => {
  const location = useLocation()
  
  const menuItems = [
    { path: '/admin', icon: assets.dashboard_icon, label: 'Dashboard' },
    { path: '/admin/users', icon: assets.user_icon, label: 'User Management' },
    { path: '/admin/courses', icon: assets.course_icon, label: 'Course Management' },
    { path: '/admin/educators', icon: assets.educator_icon, label: 'Educator Approval' },
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
            <img src={item.icon} alt={item.label} className='w-5 h-5 mr-3' />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default AdminSidebar