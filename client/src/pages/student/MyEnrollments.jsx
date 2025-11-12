import React, { useContext, useEffect, useState, useCallback } from 'react'
import { AppContext } from '../../context/AppContext'
import {Line} from 'rc-progress'
import Footer from '../../components/student/Footer'
import axios from 'axios'
import { toast } from 'react-toastify'

const MyEnrollments = () => {

  const {enrolledCourses, calculateCourseDuration, navigate, userData, fetchUserEnrolledCourses, backendUrl, getToken, calculateNoOfLectures} = useContext(AppContext)

  const [progressArray, setProgressArray] = useState([])

  const getCourseProgress = useCallback(async ()=>{
    try {
      const token = await getToken();
      const tempProgressArray = await Promise.all(
        enrolledCourses.map(async (course)=>{
          const {data} = await axios.post(`${backendUrl}/api/user/get-course-progress`,{courseId: course._id}, {headers: {Authorization: `Bearer ${token}`}})
          let totalLectures = calculateNoOfLectures(course);
          const lectureCompleted = data.progressData ? data.progressData.lectureCompleted.length : 0;
          return {totalLectures, lectureCompleted}
        })
      )
      setProgressArray(tempProgressArray);

     
    } catch (error) {
      toast.error(error.message)
    }
  }, [enrolledCourses, backendUrl, getToken, calculateNoOfLectures])

  useEffect(()=>{
    if(userData){
      fetchUserEnrolledCourses()
    }
  },[userData, fetchUserEnrolledCourses])

  // Auto refresh để đảm bảo courses được cập nhật sau thanh toán
  useEffect(()=>{
    const autoRefresh = async () => {
      if(userData) {
        await fetchUserEnrolledCourses()
      }
    }
    
    // Refresh ngay khi component mount
    autoRefresh()
    
    // Auto refresh mỗi 10s trong 2 phút đầu để catch webhook updates
    const interval = setInterval(autoRefresh, 10000)
    const timeout = setTimeout(() => clearInterval(interval), 120000) // 2 phút
    
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [userData, fetchUserEnrolledCourses])

  useEffect(()=>{
    if(enrolledCourses.length > 0){
      getCourseProgress()
    }
  },[enrolledCourses, getCourseProgress])

  return (
    <>
    <div className='md:px-36 px-8 pt-10'>
      <h1 className='text-2xl font-semibold'>My Enrollments</h1>
      <table className='md:table-auto table-fixed w-full overflow-hidden border mt-10'>
        <thead className='text-gray-900 border-b border-gray-500/20 text-sm text-left max-sm:hidden'>
          <tr>
            <th className='px-4 py-3 font-semibold truncate'>Course</th>
            <th className='px-4 py-3 font-semibold truncate'>Duration</th>
            <th className='px-4 py-3 font-semibold truncate'>Completed</th>
            <th className='px-4 py-3 font-semibold truncate'>Status</th>
          </tr>
        </thead>
        <tbody className='text-gray-700'>
          {enrolledCourses.length > 0 ? (
            enrolledCourses.map((course, index)=>(
              <tr key={index} className='border-b border-gray-500/20'>
                <td className='md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3'>
                  <img src={course.courseThumbnail} alt="" className='w-14 sm:w-24 md:w-28'/>
                  <div className='flex-1'>
                    <p className='mb-1 max-sm:text-sm'>{course.courseTitle}</p>
                    <Line strokeWidth={2} percent={progressArray[index] ? (progressArray[index].lectureCompleted * 100) / progressArray[index].totalLectures : 0} className='bg-gray-300 rounded-full'/>
                  </div>
                </td>
                <td className='px-4 py-3 max-sm:hidden'>
                  {calculateCourseDuration(course)}
                </td>
                <td className='px-4 py-3 max-sm:hidden'>
                  {progressArray[index] && `${progressArray[index].lectureCompleted} / ${progressArray[index].totalLectures}`} <span>Lectures</span>
                </td>
                <td className='px-4 py-3 max-sm:text-right'>
                  <button className='px-3 sm:px-5 py-1.5 sm:py-2 bg-blue-600 max-sm:text-xs text-white' onClick={()=> navigate('/player/' + course._id)}>
                    {progressArray[index] && progressArray[index].lectureCompleted / progressArray[index].totalLectures === 1 ? 'Completed' : 'On Going'}</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className='px-4 py-12 text-center text-gray-500'>
                <div className='flex flex-col items-center'>
                  <svg className='w-16 h-16 text-gray-300 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1} d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' />
                  </svg>
                  <h3 className='text-lg font-semibold mb-2'>Chưa có khóa học nào</h3>
                  <p className='text-sm mb-4'>Bạn chưa đăng ký khóa học nào. Hãy khám phá các khóa học thú vị!</p>
                  <button 
                    onClick={() => navigate('/')}
                    className='px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
                  >
                    Khám phá khóa học
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <Footer />
    </>
  )
}

export default MyEnrollments