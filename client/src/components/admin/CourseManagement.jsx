// components/admin/CourseManagement.jsx
import React, { useState, useEffect, useContext, useCallback } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const CourseManagement = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  // const [approvalRequests, setApprovalRequests] = useState([])
  const { backendUrl, getToken } = useContext(AppContext)

  const fetchCourses = useCallback(async (page = 1) => {
    try {
      const token = await getToken()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(approvalFilter && { approvalStatus: approvalFilter })
      })

      const { data } = await axios.get(
        `${backendUrl}/api/admin/courses?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        setCourses(data.courses)
        setTotalPages(data.totalPages)
        setCurrentPage(data.currentPage)
      } else {
        toast.error(data.message)
      }

      // Fetch pending approval requests
      const approvalParams = new URLSearchParams({ status: 'pending' })
      const approvalResponse = await axios.get(
        `${backendUrl}/api/admin/approval-requests?${approvalParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (approvalResponse.data.success) {
        // setApprovalRequests(approvalResponse.data.approvalRequests)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [backendUrl, getToken, searchTerm, statusFilter, approvalFilter])

  const toggleCourseStatus = async (courseId, currentStatus) => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        `${backendUrl}/api/admin/courses/${courseId}/status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchCourses(currentPage)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const deleteCourse = async (courseId, forceDelete = false) => {
    try {
      if (!courseId) {
        toast.error('Invalid course ID')
        return
      }

      const token = await getToken()
      const url = forceDelete 
        ? `${backendUrl}/api/admin/courses/${courseId}?forceDelete=true`
        : `${backendUrl}/api/admin/courses/${courseId}`
        
      const { data } = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success(data.message)
        fetchCourses(currentPage)
      } else {
        // Handle force delete requirement
        if (data.requiresForceDelete) {
          const confirmed = window.confirm(
            `${data.message}\n\nThis will permanently delete the course and all related data. Do you want to proceed?`
          )
          if (confirmed) {
            deleteCourse(courseId, true) // Retry with force delete
          }
        } else {
          toast.error(data.message)
        }
      }
    } catch (error) {
      console.error('Delete course error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete course'
      toast.error(errorMessage)
    }
  }

  const updateCourseInfo = async (courseId, updates) => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        `${backendUrl}/api/admin/courses/${courseId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        setSelectedCourse(null)
        fetchCourses(currentPage)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const approveCourse = async (courseId, adminNote = '') => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        `${backendUrl}/api/admin/courses/${courseId}/approve`,
        { adminNote },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success('Course approved and published successfully')
        fetchCourses(currentPage)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const rejectCourse = async (courseId, adminNote) => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        `${backendUrl}/api/admin/courses/${courseId}/reject`,
        { adminNote },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success('Course rejected and unpublished successfully')
        fetchCourses(currentPage)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [searchTerm, statusFilter, approvalFilter, fetchCourses])

  const getApprovalStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='w-16 h-16 border-4 border-gray-300 border-t-blue-400 rounded-full animate-spin'></div>
      </div>
    )
  }

  return (
    <div className='p-6'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>Course Management</h1>
      </div>

      {/* Filters */}
      <div className='bg-white p-4 rounded-lg shadow mb-6'>
        <div className='flex gap-4'>
          <div className='flex-1'>
            <input
              type='text'
              placeholder='Search courses...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>All Status</option>
            <option value='published'>Published</option>
            <option value='unpublished'>Unpublished</option>
          </select>
          
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>All Approval Status</option>
            <option value='pending'>Pending</option>
            <option value='approved'>Approved</option>
            <option value='rejected'>Rejected</option>
          </select>
        </div>
      </div>

      {/* Courses Table */}
      <div className='bg-white rounded-lg shadow overflow-hidden'>
        {courses.length === 0 ? (
          <div className='text-center py-12'>
            <div className='text-gray-400 text-6xl mb-4'>📚</div>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No courses found</h3>
            <p className='text-gray-500'>No courses match your search criteria.</p>
          </div>
        ) : (
          <>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Course
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Educator
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Price
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Students
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Publish Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Approval Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {courses.map((course) => (
                  <tr key={course._id}>
                    <td className='px-6 py-4'>
                      <div className='flex items-center'>
                        <img
                          className='h-12 w-16 object-cover rounded'
                          src={course.courseThumbnail}
                          alt={course.courseTitle}
                        />
                        <div className='ml-4'>
                          <div className='text-sm font-medium text-gray-900 line-clamp-2'>
                            {course.courseTitle}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {new Date(course.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {course.educator?.name || 'Unknown'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      ${course.coursePrice}
                      {course.discount > 0 && (
                        <span className='ml-1 text-green-600'>
                          (-{course.discount}%)
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {course.enrolledStudents?.length || 0}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          course.isPublished
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {course.isPublished ? 'Published' : 'Unpublished'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {getApprovalStatusBadge(course.approvalStatus || 'pending')}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2'>
                      <button
                        onClick={() => setSelectedCourse(course)}
                        className='text-blue-600 hover:text-blue-900'
                      >
                        View
                      </button>
                      
                      {course.approvalStatus === 'pending' ? (
                        <>
                          <button
                            onClick={() => {
                              const adminNote = window.prompt('Enter admin note (optional):') || 'Course approved by admin'
                              if (window.confirm('Approve this course? It will be automatically published.')) {
                                approveCourse(course._id, adminNote)
                              }
                            }}
                            className='text-green-600 hover:text-green-900'
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const adminNote = window.prompt('Please provide a reason for rejection:')
                              if (adminNote) {
                                if (window.confirm('Reject this course? It will be automatically unpublished.')) {
                                  rejectCourse(course._id, adminNote)
                                }
                              }
                            }}
                            className='text-red-600 hover:text-red-900'
                          >
                            Reject
                          </button>
                        </>
                      ) : course.approvalStatus === 'approved' ? (
                        <button
                          onClick={() => toggleCourseStatus(course._id, course.isPublished)}
                          className={`${
                            course.isPublished
                              ? 'text-orange-600 hover:text-orange-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {course.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                      ) : course.approvalStatus === 'rejected' ? (
                        <button
                          onClick={() => {
                            const adminNote = window.prompt('Enter admin note (optional):') || 'Course re-approved by admin'
                            if (window.confirm('Re-approve this course? It will be automatically published.')) {
                              approveCourse(course._id, adminNote)
                            }
                          }}
                          className='text-blue-600 hover:text-blue-900'
                        >
                          Re-approve
                        </button>
                      ) : (
                        <span className='text-gray-400 text-sm'>No actions available</span>
                      )}
                      
                      <button
                        onClick={() => {
                          if (!course._id) {
                            toast.error('Invalid course ID')
                            return
                          }
                          if (window.confirm('Are you sure you want to delete this course?')) {
                            deleteCourse(course._id)
                          }
                        }}
                        className='text-red-600 hover:text-red-900'
                        title='Delete course'
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className='px-6 py-4 border-t border-gray-200'>
                <div className='flex justify-between items-center'>
                  <button
                    onClick={() => fetchCourses(currentPage - 1)}
                    disabled={currentPage === 1}
                    className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  >
                    Previous
                  </button>
                  
                  <span className='text-sm text-gray-700'>
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => fetchCourses(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onUpdate={updateCourseInfo}
        />
      )}
    </div>
  )
}

// Course Detail Modal Component
const CourseDetailModal = ({ course, onClose, onUpdate }) => {
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    courseTitle: course.courseTitle,
    courseDescription: course.courseDescription,
    coursePrice: course.coursePrice,
    discount: course.discount
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onUpdate(course._id, formData)
  }

  return (
    <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50'>
      <div className='bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-medium text-gray-900'>
            {editMode ? 'Edit Course' : 'Course Details'}
          </h3>
          <div className='space-x-2'>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
            >
              Close
            </button>
          </div>
        </div>

        {editMode ? (
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Course Title</label>
              <input
                type='text'
                value={formData.courseTitle}
                onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700'>Description</label>
              <textarea
                value={formData.courseDescription}
                onChange={(e) => setFormData({ ...formData, courseDescription: e.target.value })}
                rows={4}
                className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                required
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Price ($)</label>
                <input
                  type='number'
                  value={formData.coursePrice}
                  onChange={(e) => setFormData({ ...formData, coursePrice: e.target.value })}
                  className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  min='0'
                  step='0.01'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Discount (%)</label>
                <input
                  type='number'
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  min='0'
                  max='100'
                  required
                />
              </div>
            </div>

            <div className='flex justify-end space-x-3 pt-4'>
              <button
                type='button'
                onClick={() => {
                  setEditMode(false)
                  setFormData({
                    courseTitle: course.courseTitle,
                    courseDescription: course.courseDescription,
                    coursePrice: course.coursePrice,
                    discount: course.discount
                  })
                }}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                type='submit'
                className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className='space-y-4'>
            <div className='flex gap-6'>
              <img
                src={course.courseThumbnail}
                alt={course.courseTitle}
                className='w-48 h-32 object-cover rounded-lg'
              />
              <div className='flex-1'>
                <h4 className='text-lg font-semibold'>{course.courseTitle}</h4>
                <p className='text-gray-600 mt-2'>{course.courseDescription}</p>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Educator</label>
                <p className='text-sm text-gray-900'>{course.educator?.name || 'Unknown'}</p>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Price</label>
                <p className='text-sm text-gray-900'>
                  ${course.coursePrice} {course.discount > 0 && `(${course.discount}% off)`}
                </p>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Enrolled Students</label>
                <p className='text-sm text-gray-900'>{course.enrolledStudents?.length || 0}</p>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Publish Status</label>
                <p className='text-sm text-gray-900'>
                  {course.isPublished ? 'Published' : 'Unpublished'}
                </p>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700'>Approval Status</label>
                <div className='mt-1'>
                  {(() => {
                    const statusConfig = {
                      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
                      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
                      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
                    }
                    const config = statusConfig[course.approvalStatus || 'pending'] || statusConfig.pending
                    return (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700'>Created Date</label>
              <p className='text-sm text-gray-900'>
                {new Date(course.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseManagement