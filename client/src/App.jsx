import React from 'react'
import { Route, Routes, useMatch } from 'react-router-dom'
import Home from './pages/student/Home.jsx'
import CoursesList from './pages/student/CoursesList.jsx'
import CourseDetails from './pages/student/CourseDetails.jsx'
import MyEnrollments from './pages/student/MyEnrollments.jsx'
import Player from './pages/student/Player.jsx'
import Loading from './components/student/Loading.jsx'
import PaymentStatus from './pages/student/PaymentStatus.jsx'
import BecomeEducator from './pages/student/BecomeEducator.jsx'
import TestAuth from './pages/TestAuth.jsx'
import Educator from './pages/educator/Educator.jsx'
import Dashboard from './pages/educator/Dashboard.jsx'
import AddCourse from './pages/educator/AddCourse.jsx'
import MyCourses from './pages/educator/MyCourses.jsx'
import StudentsEnrolled from './pages/educator/StudentsEnrolled.jsx'
import Navbar from './components/student/Navbar.jsx'

// Import Admin Components
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import UserManagement from './components/admin/UserManagement.jsx'
import EducatorApproval from './components/admin/EducatorApproval.jsx'
import CourseManagement from './components/admin/CourseManagement.jsx'
import RevenueManagement from './components/admin/RevenueManagement.jsx'

import RatingManagement from './components/admin/RatingManagement.jsx'


import "quill/dist/quill.snow.css";
import {ToastContainer} from 'react-toastify'

const App = () => {
  const isEducatorRoute = useMatch('/educator/*')
  const isAdminRoute = useMatch('/admin/*')

  return (
    <div className='text-default min-h-screen '>
      <ToastContainer />
      {!isEducatorRoute && !isAdminRoute && <Navbar />}
      <Routes>
        {/* Student Routes */}
        <Route path='/' element={<Home />} />
        <Route path='/course-list' element={<CoursesList />} />
        <Route path='/course-list/:input' element={<CoursesList />} />
        <Route path='/course/:id' element={<CourseDetails />} />
        <Route path='/my-enrollments' element={<MyEnrollments />} />
        <Route path='/player/:courseId' element={<Player />} />
        <Route path='/loading/:path' element={<Loading />} />
        <Route path='/payment-status' element={<PaymentStatus />} />
        <Route path='/test-auth' element={<TestAuth />} />
        <Route path='/become-educator' element={<BecomeEducator />} />
        
        {/* Educator Routes */}
        <Route path='/educator' element={<Educator />}>
          <Route path='/educator' element={<Dashboard />} />
          <Route path='add-course' element={<AddCourse />} />
          <Route path='my-courses' element={<MyCourses />} />
          <Route path='student-enrolled' element={<StudentsEnrolled />} />
        </Route>

        {/* Admin Routes */}
        <Route path='/admin' element={<AdminLayout />}>
          <Route path='/admin' element={<AdminDashboard />} />
          <Route path='users' element={<UserManagement />} />
          <Route path='courses' element={<CourseManagement />} />
          <Route path='revenue' element={<RevenueManagement />} />
          <Route path='reviews' element={<RatingManagement />} />
          <Route path='educators' element={<EducatorApproval />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App