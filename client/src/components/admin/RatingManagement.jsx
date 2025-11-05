// components/admin/RatingManagement.jsx
import React, { useState, useEffect, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const RatingManagement = () => {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({})
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReviews, setSelectedReviews] = useState([])
  const [filters, setFilters] = useState({
    courseId: '',
    rating: '',
    sortBy: 'newest'
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  })

  const { backendUrl, getToken } = useContext(AppContext)

  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true)
      const token = await getToken()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.courseId && { courseId: filters.courseId }),
        ...(filters.rating && { rating: filters.rating }),
        sortBy: filters.sortBy
      })

      const { data } = await axios.get(
        `${backendUrl}/api/admin/reviews?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        setReviews(data.reviews)
        setStats(data.stats)
        setPagination(data.pagination)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(
        `${backendUrl}/api/admin/reviews/courses`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        setCourses(data.courses)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const deleteReview = async (courseId, reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return
    }

    try {
      const token = await getToken()
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/reviews/${courseId}/${reviewId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchReviews(pagination.currentPage)
        setSelectedReviews(selectedReviews.filter(id => id !== reviewId))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const bulkDeleteReviews = async () => {
    if (selectedReviews.length === 0) {
      toast.warning('Please select reviews to delete')
      return
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedReviews.length} selected review(s)?`)) {
      return
    }

    try {
      const token = await getToken()
      const { data } = await axios.post(
        `${backendUrl}/api/admin/reviews/bulk-delete`,
        { reviewIds: selectedReviews },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        setSelectedReviews([])
        fetchReviews(pagination.currentPage)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleSelectReview = (reviewId) => {
    setSelectedReviews(prev =>
      prev.includes(reviewId)
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    )
  }

  const handleSelectAll = () => {
    if (selectedReviews.length === reviews.length) {
      setSelectedReviews([])
    } else {
      setSelectedReviews(reviews.map(review => ({
        courseId: review.courseId,
        reviewId: review._id
      })))
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const renderStars = (rating) => {
    return (
      <div className='flex items-center'>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
        <span className='ml-2 text-sm text-gray-600'>({rating}.0)</span>
      </div>
    )
  }

  useEffect(() => {
    fetchReviews()
    fetchCourses()
  }, [filters])

  if (loading && reviews.length === 0) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='w-16 h-16 border-4 border-gray-300 border-t-blue-400 rounded-full animate-spin'></div>
      </div>
    )
  }

  return (
    <div className='p-6'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>Rating Management</h1>
        {selectedReviews.length > 0 && (
          <button
            onClick={bulkDeleteReviews}
            className='bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium'
          >
            🗑️ Delete Selected ({selectedReviews.length})
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-6'>
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600'>Total Reviews</p>
              <p className='text-2xl font-bold text-gray-900'>{stats.totalRatings || 0}</p>
            </div>
            <span className='text-2xl'>📝</span>
          </div>
        </div>

        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600'>Average Rating</p>
              <p className='text-2xl font-bold text-gray-900'>{stats.averageRating || 0}</p>
            </div>
            <span className='text-2xl'>⭐</span>
          </div>
        </div>

        {/* Rating Distribution */}
        {stats.distribution && (
          <>
            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>5 Stars</p>
                  <p className='text-2xl font-bold text-gray-900'>{stats.distribution[0] || 0}</p>
                </div>
                <span className='text-2xl'>★★★★★</span>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>4 Stars</p>
                  <p className='text-2xl font-bold text-gray-900'>{stats.distribution[1] || 0}</p>
                </div>
                <span className='text-2xl'>★★★★☆</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className='bg-white p-4 rounded-lg shadow mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Course</label>
            <select
              value={filters.courseId}
              onChange={(e) => handleFilterChange('courseId', e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>All Courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseTitle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Rating</label>
            <select
              value={filters.rating}
              onChange={(e) => handleFilterChange('rating', e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>All Ratings</option>
              <option value='5'>5 Stars</option>
              <option value='4'>4 Stars</option>
              <option value='3'>3 Stars</option>
              <option value='2'>2 Stars</option>
              <option value='1'>1 Star</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value='newest'>Newest First</option>
              <option value='highest'>Highest Rating</option>
              <option value='lowest'>Lowest Rating</option>
            </select>
          </div>

          <div className='flex items-end'>
            <button
              onClick={() => {
                setFilters({ courseId: '', rating: '', sortBy: 'newest' })
                setPagination(prev => ({ ...prev, currentPage: 1 }))
              }}
              className='w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50'
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className='bg-white rounded-lg shadow overflow-hidden'>
        {reviews.length === 0 ? (
          <div className='text-center py-12'>
            <div className='text-gray-400 text-6xl mb-4'>⭐</div>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>No reviews found</h3>
            <p className='text-gray-500'>No reviews match your search criteria.</p>
          </div>
        ) : (
          <>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8'>
                    <input
                      type='checkbox'
                      checked={selectedReviews.length === reviews.length && reviews.length > 0}
                      onChange={handleSelectAll}
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    User & Rating
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Course
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Date
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {reviews.map((review) => (
                  <tr key={review._id}>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <input
                        type='checkbox'
                        checked={selectedReviews.some(selected => 
                          selected.reviewId === review._id && selected.courseId === review.courseId
                        )}
                        onChange={() => handleSelectReview({
                          courseId: review.courseId,
                          reviewId: review._id
                        })}
                        className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center'>
                        <img
                          className='h-10 w-10 rounded-full'
                          src={review.userImage || '/default-avatar.png'}
                          alt={review.userName}
                        />
                        <div className='ml-4'>
                          <div className='text-sm font-medium text-gray-900'>
                            {review.userName}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {review.userEmail}
                          </div>
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center'>
                        <img
                          className='h-12 w-16 object-cover rounded'
                          src={review.courseThumbnail}
                          alt={review.courseTitle}
                        />
                        <div className='ml-4'>
                          <div className='text-sm font-medium text-gray-900 line-clamp-2'>
                            {review.courseTitle}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <button
                        onClick={() => deleteReview(review.courseId, review._id)}
                        className='text-red-600 hover:text-red-900'
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className='px-6 py-4 border-t border-gray-200'>
                <div className='flex justify-between items-center'>
                  <button
                    onClick={() => fetchReviews(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className='px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  >
                    Previous
                  </button>
                  
                  <span className='text-sm text-gray-700'>
                    Page {pagination.currentPage} of {pagination.totalPages} 
                    ({pagination.total} total reviews)
                  </span>
                  
                  <button
                    onClick={() => fetchReviews(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
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
    </div>
  )
}

export default RatingManagement