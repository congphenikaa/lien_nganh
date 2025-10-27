import React, { useState, useEffect, useContext, useCallback } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const EducatorApproval = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { backendUrl, getToken } = useContext(AppContext)

  const fetchRequests = useCallback(async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(backendUrl + '/api/admin/educator-requests', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setRequests(data.requests)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [backendUrl, getToken])

  const handleReview = async (requestId, status) => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        backendUrl + `/api/admin/educator-requests/${requestId}/review`,
        { status, reviewNote },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (data.success) {
        toast.success(data.message)
        setSelectedRequest(null)
        setReviewNote('')
        fetchRequests()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleCleanup = async () => {
    if (!window.confirm('Are you sure you want to delete all educator requests older than 7 days?')) {
      return
    }
    
    setCleanupLoading(true)
    try {
      const token = await getToken()
      const { data } = await axios.delete(
        backendUrl + '/api/admin/educator-requests/cleanup',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (data.success) {
        toast.success(data.message)
        fetchRequests() // Refresh the list
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setCleanupLoading(false)
    }
  }

  // Calculate days remaining until auto-delete
  const getDaysRemaining = (createdAt) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffTime = 7 * 24 * 60 * 60 * 1000 - (now - created) // 7 days in ms
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Format countdown display
  const getCountdownDisplay = (createdAt) => {
    const daysLeft = getDaysRemaining(createdAt)
    if (daysLeft === 0) {
      return { text: 'Expires today', color: 'text-red-600 font-bold' }
    } else if (daysLeft === 1) {
      return { text: '1 day left', color: 'text-orange-600 font-medium' }
    } else if (daysLeft <= 3) {
      return { text: `${daysLeft} days left`, color: 'text-orange-600' }
    } else {
      return { text: `${daysLeft} days left`, color: 'text-gray-500' }
    }
  }

  // Handle checkbox selection
  const handleSelectRequest = (requestId) => {
    setSelectedIds(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    )
  }

  // Handle select all checkbox
  const handleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(requests.map(req => req._id))
    }
  }

  // Delete selected requests immediately
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Please select requests to delete')
      return
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected request(s)?`)) {
      return
    }

    setDeleteLoading(true)
    try {
      const token = await getToken()
      
      // Delete each selected request
      const deletePromises = selectedIds.map(id =>
        axios.delete(backendUrl + `/api/admin/educator-requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      )

      await Promise.all(deletePromises)
      
      toast.success(`Successfully deleted ${selectedIds.length} request(s)`)
      setSelectedIds([])
      fetchRequests()
    } catch (error) {
      toast.error('Error deleting requests: ' + error.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

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
        <h1 className='text-2xl font-bold'>Educator Approval</h1>
        <div className='flex gap-3'>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleteLoading}
              className='bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg font-medium'
            >
              {deleteLoading ? '🗑️ Deleting...' : `🗑️ Delete Selected (${selectedIds.length})`}
            </button>
          )}
          <button
            onClick={handleCleanup}
            disabled={cleanupLoading}
            className='bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium'
          >
            {cleanupLoading ? '🧹 Cleaning...' : '🧹 Cleanup Old Requests'}
          </button>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow overflow-hidden'>
        {requests.length === 0 ? (
          <div className='text-center py-12'>
            <div className='text-gray-400 text-6xl mb-4'>📋</div>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No educator requests</h3>
            <p className='text-gray-500'>All educator requests have been processed or auto-deleted.</p>
          </div>
        ) : (
          <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                <input
                  type='checkbox'
                  checked={selectedIds.length === requests.length && requests.length > 0}
                  onChange={handleSelectAll}
                  className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Applicant
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Specialization
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Status
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Applied Date
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Auto-Delete
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {requests.map((request) => {
              const countdown = getCountdownDisplay(request.createdAt)
              return (
                <tr key={request._id} className={getDaysRemaining(request.createdAt) === 0 ? 'bg-red-50' : ''}>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <input
                      type='checkbox'
                      checked={selectedIds.includes(request._id)}
                      onChange={() => handleSelectRequest(request._id)}
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <div className='flex items-center'>
                      <div className='flex-shrink-0 h-10 w-10'>
                        <img
                          className='h-10 w-10 rounded-full'
                          src={request.userId?.imageUrl || '/default-avatar.png'}
                          alt={request.fullName}
                        />
                      </div>
                      <div className='ml-4'>
                        <div className='text-sm font-medium text-gray-900'>
                          {request.fullName}
                        </div>
                        <div className='text-sm text-gray-500'>
                          {request.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                    {request.specialization}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm'>
                    <span className={countdown.color}>
                      {countdown.text}
                    </span>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className='text-blue-600 hover:text-blue-900 mr-3'
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>
              Educator Application Details
            </h3>
            
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Full Name</label>
                  <p className='text-sm text-gray-900'>{selectedRequest.fullName}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Email</label>
                  <p className='text-sm text-gray-900'>{selectedRequest.email}</p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Phone</label>
                  <p className='text-sm text-gray-900'>{selectedRequest.phone}</p>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Specialization</label>
                  <p className='text-sm text-gray-900'>{selectedRequest.specialization}</p>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Education</label>
                <p className='text-sm text-gray-900'>{selectedRequest.education}</p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Experience</label>
                <p className='text-sm text-gray-900'>{selectedRequest.experience}</p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Teaching Experience</label>
                <p className='text-sm text-gray-900'>{selectedRequest.teachingExperience}</p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Motivation</label>
                <p className='text-sm text-gray-900'>{selectedRequest.motivation}</p>
              </div>

              {selectedRequest.portfolio && (
                <div>
                  <label className='block text-sm font-medium text-gray-700'>Portfolio</label>
                  <a
                    href={selectedRequest.portfolio}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 hover:text-blue-800'
                  >
                    {selectedRequest.portfolio}
                  </a>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Review Note (Optional)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={3}
                    className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Add a note for your decision...'
                  />
                </div>
              )}
            </div>

            <div className='flex justify-between mt-6'>
              <button
                onClick={() => {
                  setSelectedRequest(null)
                  setReviewNote('')
                }}
                className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
              >
                Close
              </button>
              
              {selectedRequest.status === 'pending' && (
                <div className='space-x-3'>
                  <button
                    onClick={() => handleReview(selectedRequest._id, 'rejected')}
                    className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReview(selectedRequest._id, 'approved')}
                    className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700'
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EducatorApproval