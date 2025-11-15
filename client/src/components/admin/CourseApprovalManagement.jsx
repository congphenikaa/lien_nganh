import React, { useState, useEffect, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const CourseApprovalManagement = () => {
  const [approvalRequests, setApprovalRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { backendUrl, getToken } = useContext(AppContext)

  const fetchApprovalRequests = async (page = 1) => {
    try {
      const token = await getToken()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(statusFilter && { status: statusFilter })
      })

      const { data } = await axios.get(
        `${backendUrl}/api/admin/approval-requests?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        setApprovalRequests(data.approvalRequests)
        setTotalPages(data.totalPages)
        setCurrentPage(data.currentPage)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const approveRequest = async (requestId, modifications = {}, message = '') => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        `${backendUrl}/api/admin/approval-requests/${requestId}/approve`,
        { message, modifications },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        setSelectedRequest(null)
        fetchApprovalRequests(currentPage)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const rejectRequest = async (requestId, message) => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        `${backendUrl}/api/admin/approval-requests/${requestId}/reject`,
        { message },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        setSelectedRequest(null)
        fetchApprovalRequests(currentPage)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchApprovalRequests()
  }, [statusFilter])

  const getStatusBadge = (status) => {
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
        <h1 className='text-2xl font-bold'>Course Approval Management</h1>
      </div>

      {/* Filters */}
      <div className='bg-white p-4 rounded-lg shadow mb-6'>
        <div className='flex gap-4'>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>All Status</option>
            <option value='pending'>Pending</option>
            <option value='approved'>Approved</option>
            <option value='rejected'>Rejected</option>
          </select>
        </div>
      </div>

      {/* Approval Requests Table */}
      <div className='bg-white rounded-lg shadow overflow-hidden'>
        {approvalRequests.length === 0 ? (
          <div className='text-center py-12'>
            <div className='text-gray-400 text-6xl mb-4'>📋</div>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No approval requests found</h3>
            <p className='text-gray-500'>No approval requests match your search criteria.</p>
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
                    Submitted Date
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {approvalRequests.map((request) => (
                  <tr key={request._id}>
                    <td className='px-6 py-4'>
                      <div className='flex items-center'>
                        <img
                          className='h-12 w-16 object-cover rounded'
                          src={request.courseSnapshot?.courseThumbnail || request.courseId?.courseThumbnail}
                          alt={request.courseSnapshot?.courseTitle || request.courseId?.courseTitle}
                        />
                        <div className='ml-4'>
                          <div className='text-sm font-medium text-gray-900 line-clamp-2'>
                            {request.courseSnapshot?.courseTitle || request.courseId?.courseTitle}
                          </div>
                          <div className='text-sm text-gray-500'>
                            ${request.courseSnapshot?.coursePrice || request.courseId?.coursePrice}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {request.educator?.name || 'Unknown'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                      {new Date(request.submittedAt).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {getStatusBadge(request.status)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className='text-blue-600 hover:text-blue-900 mr-3'
                      >
                        Review
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
                    onClick={() => fetchApprovalRequests(currentPage - 1)}
                    disabled={currentPage === 1}
                    className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  >
                    Previous
                  </button>
                  
                  <span className='text-sm text-gray-700'>
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => fetchApprovalRequests(currentPage + 1)}
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

      {/* Request Detail Modal */}
      {selectedRequest && (
        <ApprovalRequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={approveRequest}
          onReject={rejectRequest}
        />
      )}
    </div>
  )
}

// Approval Request Modal Component
const ApprovalRequestModal = ({ request, onClose, onApprove, onReject }) => {
  const [response, setResponse] = useState('')
  const [modifications, setModifications] = useState({
    courseTitle: request.courseSnapshot?.courseTitle || '',
    courseDescription: request.courseSnapshot?.courseDescription || '',
    coursePrice: request.courseSnapshot?.coursePrice || 0,
    discount: request.courseSnapshot?.discount || 0
  })

  const handleApprove = () => {
    if (!response.trim()) {
      toast.error('Please provide a response message')
      return
    }
    onApprove(request._id, modifications, response)
  }

  const handleReject = () => {
    if (!response.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    onReject(request._id, response)
  }

  const courseData = request.courseSnapshot || request.courseId

  return (
    <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50'>
      <div className='bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-lg font-medium text-gray-900'>Review Course Approval Request</h3>
          <button
            onClick={onClose}
            className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
          >
            Close
          </button>
        </div>

        <div className='space-y-6'>
          {/* Course Info */}
          <div className='flex gap-6'>
            <img
              src={courseData?.courseThumbnail}
              alt={courseData?.courseTitle}
              className='w-48 h-32 object-cover rounded-lg'
            />
            <div className='flex-1'>
              <input
                type='text'
                value={modifications.courseTitle}
                onChange={(e) => setModifications({ ...modifications, courseTitle: e.target.value })}
                className='text-lg font-semibold w-full p-2 border rounded-md'
                disabled={request.status !== 'pending'}
              />
              <div className='mt-2'>
                <label className='block text-sm font-medium text-gray-700'>Educator</label>
                <p className='text-sm text-gray-900'>{request.educator?.name || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Course Description */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Course Description</label>
            <textarea
              value={modifications.courseDescription}
              onChange={(e) => setModifications({ ...modifications, courseDescription: e.target.value })}
              rows={4}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              disabled={request.status !== 'pending'}
            />
          </div>

          {/* Price and Discount */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Price ($)</label>
              <input
                type='number'
                value={modifications.coursePrice}
                onChange={(e) => setModifications({ ...modifications, coursePrice: parseFloat(e.target.value) })}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                min='0'
                step='0.01'
                disabled={request.status !== 'pending'}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Discount (%)</label>
              <input
                type='number'
                value={modifications.discount}
                onChange={(e) => setModifications({ ...modifications, discount: parseFloat(e.target.value) })}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                min='0'
                max='100'
                disabled={request.status !== 'pending'}
              />
            </div>
          </div>

          {/* Course Content Preview */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Course Content</label>
            <div className='max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3'>
              {courseData?.courseContent?.map((chapter, index) => (
                <div key={index} className='mb-2'>
                  <h4 className='font-medium'>{chapter.chapterTitle}</h4>
                  <p className='text-sm text-gray-600'>{chapter.chapterContent?.length || 0} lectures</p>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Message */}
          {request.submissionMessage && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Submission Message</label>
              <p className='text-sm text-gray-600 bg-gray-50 p-3 rounded-md'>{request.submissionMessage}</p>
            </div>
          )}

          {/* Admin Response */}
          {request.status === 'pending' && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Response Message</label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='Enter your response message...'
              />
            </div>
          )}

          {/* Previous Response */}
          {request.adminResponse?.message && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Previous Response</label>
              <div className='bg-gray-50 p-3 rounded-md'>
                <p className='text-sm text-gray-600'>{request.adminResponse.message}</p>
                <p className='text-xs text-gray-500 mt-1'>
                  Reviewed by {request.adminResponse.reviewedBy?.name} on{' '}
                  {new Date(request.adminResponse.reviewedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {request.status === 'pending' && (
            <div className='flex justify-end space-x-3 pt-4'>
              <button
                onClick={handleReject}
                className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
              >
                Approve & Publish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourseApprovalManagement