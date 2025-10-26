import React from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from '../../components/admin/AdminSidebar.jsx'
import AdminNavbar from '../../components/admin/AdminNavbar.jsx'

const AdminLayout = () => {
  return (
    <div className='flex h-screen bg-gray-100'>
      <AdminSidebar />
      <div className='flex-1 flex flex-col overflow-hidden'>
        <AdminNavbar />
        <main className='flex-1 overflow-y-auto'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout