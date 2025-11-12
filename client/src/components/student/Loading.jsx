import React, { useContext, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'

const Loading = () => {

  const {path} = useParams()
  const navigate = useNavigate();
  const { fetchUserEnrolledCourses } = useContext(AppContext)

  useEffect(()=>{
    if(path){
      // Nếu đang loading my-enrollments, refresh enrolled courses trước
      if(path === 'my-enrollments'){
        const refreshAndNavigate = async () => {
          try {
            await fetchUserEnrolledCourses()
            console.log('✅ Refreshed enrolled courses before navigation')
          } catch (error) {
            console.error('❌ Error refreshing enrolled courses:', error)
          }
          
          setTimeout(()=>{
            navigate(`/${path}`)
          }, 3000) // Giảm thời gian chờ xuống 3s
        }
        
        refreshAndNavigate()
      } else {
        const timer = setTimeout(()=>{
          navigate(`/${path}`)
        }, 3000)
        return ()=> clearTimeout(timer)
      }
    }
  }, [path, navigate, fetchUserEnrolledCourses])
  
  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='flex flex-col items-center space-y-4'>
        <div className='w-16 sm:w-20 aspect-square border-4 border-gray-300 border-t-blue-400 rounded-full animate-spin'></div>
        <p className='text-gray-600 text-center'>
          {path === 'my-enrollments' ? 'Đang cập nhật khóa học của bạn...' : 'Đang tải...'}
        </p>
      </div>
    </div>
  )
}

export default Loading