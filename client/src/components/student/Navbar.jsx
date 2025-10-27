import React, { useContext, useEffect, useState } from 'react'
import { assets } from '../../assets/assets'
import { Link } from 'react-router-dom'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const Navbar = () => {

  const {navigate, isEducator, backendUrl, getToken, isAdmin} = useContext(AppContext)
  const [educatorRequestStatus, setEducatorRequestStatus] = useState(null)

  const isCourseListPage = location.pathname.includes('/course-list');

  const { openSignIn } = useClerk();
  const { user } = useUser();

  // Check educator request status
  const checkEducatorRequestStatus = async () => {
    try {
      if (user && !isEducator && !isAdmin) {
        const token = await getToken()
        const { data } = await axios.get(backendUrl + '/api/educator/request-status', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (data.success) {
          setEducatorRequestStatus(data.status)
        }
      }
    } catch (error) {
      console.error('Error checking educator request status:', error)
    }
  }

  useEffect(() => {
    checkEducatorRequestStatus()
  }, [user, isEducator, isAdmin])

  const becomeEducator = async () => {
    try {
      // Admin can directly access educator dashboard
      if (isAdmin) {
        navigate('/educator')
        return;
      }
      
      if (isEducator) {
        navigate('/educator')
        return;
      }

      // Check if user has pending request
      if (educatorRequestStatus === 'pending') {
        toast.info('Your educator request is pending approval')
        return;
      }

      // Check if user was rejected and can reapply
      if (educatorRequestStatus === 'rejected') {
        navigate('/become-educator')
        return;
      }

      // If no request exists, redirect to application form
      if (educatorRequestStatus === 'none') {
        navigate('/become-educator')
        return;
      }

      // If we reach here, user is neither educator nor admin, redirect to application
      navigate('/become-educator')
      
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getEducatorButtonText = () => {
    if (isAdmin) return 'Educator Dashboard'
    if (isEducator) return 'Dashboard'
    if (educatorRequestStatus === 'pending') return 'Request Pending'
    if (educatorRequestStatus === 'rejected') return 'Reapply as Educator'
    return 'Become Educator'
  }

  return (
    <div className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500 py-4 
      ${isCourseListPage ? 'bg-white' : 'bg-cyan-100/70'}`}>
       <img onClick={()=> navigate('/')} src={assets.logo} alt="Logo" className='w-28 lg:w-32 cursor-pointer' />
       <div className='hidden md:flex items-center gap-5 text-gray-500'>
        <div className='flex items-center gap-5'>
          { user && 
          <>
              {isAdmin && (
                <Link
                  to='/admin'
                  className='bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition-colors'
                >
                  Admin Panel
                </Link>
              )}
              
              <button
                onClick={becomeEducator}
                className={`px-4 py-2 rounded-full transition-colors ${
                  educatorRequestStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
                disabled={educatorRequestStatus === 'pending'}
              >
                {getEducatorButtonText()}
              </button>
              
            <Link to='/my-enrollments'>My Enrollments</Link>
          </>
          }
        </div>
        { user ? <UserButton /> : 
          <button onClick={() => openSignIn()} 
         className='bg-blue-600 text-white px-5 py-2 rounded-full'>Create Account</button>
        }
        
       </div>
        {/* for phone screens */}
       <div className='md:hidden flex items-center gap-2 sm:gap-5 text-gray-500'>
        <div className='flex items-center gap-1 sm:gap-2 max-sm:text-xs'>
          { user && 
          <>
              {isAdmin && (
                <Link
                  to='/admin'
                  className='text-purple-600 font-semibold'
                >
                  Admin
                </Link>
              )}
              
              <button
                onClick={becomeEducator}
                className={`px-2 py-1 rounded text-xs ${
                  educatorRequestStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-600'
                }`}
                disabled={educatorRequestStatus === 'pending'}
              >
                {isEducator ? 'Dashboard' : 'Educator'}
              </button>
              
            <Link to='/my-enrollments'>My Enrollments</Link>
          </>
          }
        </div>
        {
          user ? <UserButton /> 
          : <button onClick={() => openSignIn()}><img src={assets.user_icon} alt="" /></button>
        }
        
       </div>
    </div>
  )
}

export default Navbar