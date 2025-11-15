import React, { useEffect, useState } from 'react'
import { useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading';
import axios from 'axios';
import { toast } from 'react-toastify';

const MyCourses = () => {

  const {currency, backendUrl, isEducator, getToken} = useContext(AppContext);

  const [courses, setCourses] = useState(null);
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)

  const fetchEducatorCourses = async () => {
    try {
      const token = await getToken()
      const {data} = await axios.get(backendUrl + '/api/educator/courses',{headers: {Authorization: `Bearer ${token}`}})
      data.success && setCourses(data.courses)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const submitCourseForApproval = async (courseId, message) => {
    try {
      const token = await getToken()
      const {data} = await axios.post(backendUrl + '/api/educator/submit-course-approval', 
        { courseId, submissionMessage: message },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (data.success) {
        toast.success(data.message)
        fetchEducatorCourses() // Refresh course list
        setShowSubmissionModal(false)
        setSubmissionMessage('')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getApprovalStatusBadge = (status, isPublished) => {
    if (isPublished) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Published</span>
    }
    
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  useEffect(() => {
    if(isEducator){
      fetchEducatorCourses();
    }
    
  }, [isEducator]);

  const handleSubmissionModal = () => {
    if (!submissionMessage.trim()) {
      toast.error('Please provide a submission message')
      return
    }
    submitCourseForApproval(selectedCourse._id, submissionMessage)
  }

  return courses ?(
    <>
    <div className='h-screen flex flex-col items-start justify-between md:p-8
    md:pb-0 p-4 pt-8 pb-0'>
      <div className='w-full'>
        <h2 className='pb-4 text-lg font-medium'>My Courses</h2>
        <div className='flex flex-col items-center max-w-4xl w-full overflow-hidden
        rounded-md bg-white border border-gray-500/20'>
          <table className='md:table-auto table-fixed w-full overflow-hidden'>
            <thead className='text-gray-900 border-b border-gray-500/20 text-sm text-left'>
              <tr>
                <th className='px-4 py-3 font-semibold truncate'>All Courses</th>
                <th className='px-4 py-3 font-semibold truncate'>Status</th>
                <th className='px-4 py-3 font-semibold truncate'>Earnings</th>
                <th className='px-4 py-3 font-semibold truncate'>Students</th>
                <th className='px-4 py-3 font-semibold truncate'>Actions</th>
              </tr>
            </thead>
            <tbody className='text-sm text-gray-500'>
              {courses.map((course) => (
                <tr key={course._id} className='border-b border-gray-500/20'>
                  <td className='md:px-4 pl-2 md:pl-4 py-3 flex items-center
                  space-x-3 truncate'>
                    <img src={course.courseThumbnail} alt="course image" className='w-16'/>
                    <span className='truncate hidden md:block'>{course.courseTitle}</span>
                  </td>
                  <td className='px-4 py-3'>
                    {getApprovalStatusBadge(course.approvalStatus, course.isPublished)}
                  </td>
                  <td className='px-4 py-3'>{currency} {Math.floor(course.
                    enrolledStudents.length * (course.coursePrice - course.discount *
                      course.coursePrice / 100))}</td>
                  <td className='px-4 py-3'>{course.enrolledStudents.length}</td>
                  <td className='px-4 py-3'>
                    {course.approvalStatus === 'pending' && (
                      <button 
                        onClick={() => {
                          setSelectedCourse(course)
                          setShowSubmissionModal(true)
                        }}
                        className='px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors'
                      >
                        Submit for Approval
                      </button>
                    )}
                    {course.approvalStatus === 'rejected' && (
                      <button 
                        onClick={() => {
                          setSelectedCourse(course)
                          setShowSubmissionModal(true)
                        }}
                        className='px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors'
                      >
                        Resubmit
                      </button>
                    )}
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    {/* Submission Modal */}
    {showSubmissionModal && selectedCourse && (
      <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50'>
        <div className='bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4'>
          <div className='flex justify-between items-center mb-4'>
            <h3 className='text-lg font-medium text-gray-900'>
              Submit Course for Approval
            </h3>
            <button
              onClick={() => {
                setShowSubmissionModal(false)
                setSubmissionMessage('')
              }}
              className='text-gray-400 hover:text-gray-600'
            >
              ✕
            </button>
          </div>
          
          <div className='mb-4'>
            <h4 className='font-medium text-gray-900'>{selectedCourse.courseTitle}</h4>
            <p className='text-sm text-gray-600 mt-1'>This course will be submitted to admin for review and approval before publishing.</p>
          </div>
          
          <div className='mb-4'>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Submission Message (Optional)
            </label>
            <textarea
              value={submissionMessage}
              onChange={(e) => setSubmissionMessage(e.target.value)}
              rows={3}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Add any notes or comments for the admin reviewer...'
            />
          </div>
          
          <div className='flex justify-end space-x-3'>
            <button
              onClick={() => {
                setShowSubmissionModal(false)
                setSubmissionMessage('')
              }}
              className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              onClick={handleSubmissionModal}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
            >
              Submit for Approval
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  ) : <Loading />;
}

export default MyCourses