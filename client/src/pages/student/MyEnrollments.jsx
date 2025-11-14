import React, { useContext, useEffect, useState, useCallback } from 'react'
import { AppContext } from '../../context/AppContext'
import {Line} from 'rc-progress'
import Footer from '../../components/student/Footer'
import axios from 'axios'
import { toast } from 'react-toastify'

const MyEnrollments = () => {

  const {enrolledCourses, calculateCourseDuration, navigate, userData, fetchUserEnrolledCourses, backendUrl, getToken, calculateNoOfLectures} = useContext(AppContext)

  const [progressArray, setProgressArray] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastEnrolledCount, setLastEnrolledCount] = useState(0)

  const getCourseProgress = useCallback(async ()=>{
    try {
      // Kiểm tra enrolledCourses có tồn tại và không rỗng
      if (!enrolledCourses || !Array.isArray(enrolledCourses) || enrolledCourses.length === 0) {
        setProgressArray([])
        return
      }

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
      console.error('Error getting course progress:', error)
      toast.error(error.message)
      setProgressArray([])
    }
  }, [enrolledCourses, backendUrl, getToken, calculateNoOfLectures])

  // Auto refresh để đảm bảo courses được cập nhật sau thanh toán
  useEffect(()=>{
    const autoRefresh = async () => {
      if(userData) {
        console.log('Auto-refreshing enrolled courses...'); // Thêm log để kiểm tra
        setIsRefreshing(true)
        await fetchUserEnrolledCourses()
        setTimeout(() => setIsRefreshing(false), 1000) // Hide indicator after 1s
      }
    }
    
    // Refresh ngay khi component mount
    autoRefresh()
    
    // Kiểm tra xem có phải từ payment success không
    const urlParams = new URLSearchParams(window.location.search)
    const fromPayment = urlParams.get('success') === 'true' || 
                       window.location.pathname.includes('payment-status') ||
                       sessionStorage.getItem('recentPayment') === 'true'
    
    let interval, timeout
    
    if (fromPayment) {
      console.log('Detected recent payment, starting enhanced refresh...')
      // Nếu từ payment, refresh thường xuyên hơn trong thời gian ngắn
      interval = setInterval(autoRefresh, 3000) // Refresh mỗi 3s
      timeout = setTimeout(() => {
        console.log('Stopping enhanced auto-refresh')
        clearInterval(interval)
        sessionStorage.removeItem('recentPayment')
      }, 60000) // Chỉ 1 phút thôi
    } else {
      // Refresh bình thường với tần suất thấp hơn
      interval = setInterval(autoRefresh, 15000) // Refresh mỗi 15s
      timeout = setTimeout(() => {
        console.log('Stopping normal auto-refresh')
        clearInterval(interval)
      }, 90000) // 1.5 phút
    }
    
    return () => {
      if (interval) clearInterval(interval)
      if (timeout) clearTimeout(timeout)
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [userData])

  useEffect(()=>{
    if(enrolledCourses && enrolledCourses.length > 0){
      // Kiểm tra nếu có khóa học mới được thêm
      if(lastEnrolledCount > 0 && enrolledCourses.length > lastEnrolledCount) {
        const newCourseCount = enrolledCourses.length - lastEnrolledCount
        toast.success(`🎉 ${newCourseCount} khóa học mới đã được thêm vào danh sách!`)
      }
      setLastEnrolledCount(enrolledCourses.length)
      getCourseProgress()
    }
  },[enrolledCourses, getCourseProgress, lastEnrolledCount])

  return (
    <>
    <div className='md:px-36 px-8 pt-10'>
      <div className='flex items-center justify-between mb-4'>
        <h1 className='text-2xl font-semibold'>My Enrollments</h1>
        {isRefreshing && (
          <div className='flex items-center text-blue-600 text-sm'>
            <div className='w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mr-2'></div>
            Đang cập nhật...
          </div>
        )}
      </div>
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
          {enrolledCourses && enrolledCourses.length > 0 ? (
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