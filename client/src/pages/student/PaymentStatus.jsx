import { useContext, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'

const PaymentStatus = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { fetchUserEnrolledCourses } = useContext(AppContext)
  const [status, setStatus] = useState('processing') // processing, success, failed

  useEffect(() => {
    const resultCode = searchParams.get('resultCode')
    const message = searchParams.get('message') 
    
    console.log('Payment status params:', { resultCode, message })

    if (resultCode === '0') {
      // Thanh toán thành công
      setStatus('success')
      toast.success('Thanh toán thành công! Đang cập nhật khóa học...')
      
      // Refresh enrolled courses và chuyển hướng
      const refreshAndRedirect = async () => {
        try {
          // Đợi webhook xử lý (với deployed backend, webhook sẽ nhanh hơn)
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Refresh enrolled courses nhiều lần để đảm bảo cập nhật
          for (let i = 0; i < 3; i++) {
            await fetchUserEnrolledCourses()
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
          // Chuyển đến trang my-enrollments
          setTimeout(() => {
            navigate('/my-enrollments')
          }, 1000)
          
        } catch (error) {
          console.error('Error refreshing courses:', error)
          navigate('/my-enrollments')
        }
      }
      
      refreshAndRedirect()
      
    } else {
      // Thanh toán thất bại
      setStatus('failed')
      toast.error(message || 'Thanh toán thất bại')
      
      setTimeout(() => {
        navigate('/')
      }, 3000)
    }
  }, [])

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div className='text-center max-w-md mx-auto p-6'>
        {status === 'processing' && (
          <>
            <div className='w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4'></div>
            <h2 className='text-xl font-semibold mb-2'>Đang xử lý thanh toán...</h2>
            <p className='text-gray-600'>Vui lòng đợi trong giây lát</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-8 h-8 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
              </svg>
            </div>
            <h2 className='text-xl font-semibold text-green-600 mb-2'>Thanh toán thành công!</h2>
            <p className='text-gray-600 mb-4'>Đang cập nhật khóa học của bạn...</p>
            <div className='w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto'></div>
          </>
        )}
        
        {status === 'failed' && (
          <>
            <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-8 h-8 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </div>
            <h2 className='text-xl font-semibold text-red-600 mb-2'>Thanh toán thất bại</h2>
            <p className='text-gray-600 mb-4'>Vui lòng thử lại sau</p>
            <button 
              onClick={() => navigate('/')}
              className='px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
            >
              Quay về trang chủ
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default PaymentStatus