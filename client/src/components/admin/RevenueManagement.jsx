// components/admin/RevenueManagement.jsx
import React, { useState, useEffect, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const RevenueManagement = () => {
  const [revenueStats, setRevenueStats] = useState({})
  const [topCourses, setTopCourses] = useState([])
  const [paymentAnalytics, setPaymentAnalytics] = useState({})
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const { backendUrl, getToken } = useContext(AppContext)

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      const token = await getToken()

      // Fetch all revenue data in parallel
      const [revenueRes, topCoursesRes, analyticsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/revenue?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${backendUrl}/api/admin/top-courses?limit=10&sortBy=revenue`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${backendUrl}/api/admin/analytics/payments?days=30`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (revenueRes.data.success) {
        setRevenueStats(revenueRes.data)
      }

      if (topCoursesRes.data.success) {
        setTopCourses(topCoursesRes.data.topCourses)
      }

      if (analyticsRes.data.success) {
        setPaymentAnalytics(analyticsRes.data.analytics)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenueData()
  }, [period])

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='w-16 h-16 border-4 border-gray-300 border-t-blue-400 rounded-full animate-spin'></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${revenueStats.stats?.totalRevenue?.toLocaleString() || 0}`,
      color: 'bg-green-500',
      icon: '💰'
    },
    {
      title: 'Total Enrollments',
      value: revenueStats.stats?.totalEnrollments || 0,
      color: 'bg-blue-500',
      icon: '👥'
    },
    {
      title: 'Average Order Value',
      value: `$${revenueStats.stats?.averageOrderValue?.toFixed(2) || 0}`,
      color: 'bg-purple-500',
      icon: '📊'
    },
    {
      title: 'Top Courses',
      value: topCourses.length,
      color: 'bg-orange-500',
      icon: '🏆'
    }
  ]

  return (
    <div className='p-6'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>Revenue & Analytics</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className='px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
        >
          <option value='day'>Today</option>
          <option value='week'>This Week</option>
          <option value='month'>This Month</option>
          <option value='year'>This Year</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {statCards.map((stat, index) => (
          <div
            key={index}
            className='bg-white rounded-lg shadow p-6 border-l-4 border-blue-500'
          >
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>{stat.title}</p>
                <p className='text-2xl font-bold text-gray-900'>{stat.value}</p>
              </div>
              <span className='text-2xl'>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Top Courses */}
        <div className='bg-white rounded-lg shadow p-6'>
          <h3 className='text-lg font-semibold mb-4'>Top Performing Courses</h3>
          <div className='space-y-4'>
            {topCourses.slice(0, 5).map((course, index) => (
              <div key={course._id} className='flex items-center justify-between p-3 border rounded-lg'>
                <div className='flex items-center space-x-3'>
                  <span className='text-sm font-medium text-gray-500'>#{index + 1}</span>
                  <div>
                    <p className='text-sm font-medium text-gray-900 line-clamp-1'>
                      {course.courseTitle}
                    </p>
                    <p className='text-xs text-gray-500'>{course.educatorName}</p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-semibold text-green-600'>
                    ${course.revenue?.toLocaleString()}
                  </p>
                  <p className='text-xs text-gray-500'>{course.enrollments} enrollments</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Course */}
        <div className='bg-white rounded-lg shadow p-6'>
          <h3 className='text-lg font-semibold mb-4'>Revenue Distribution</h3>
          <div className='space-y-3'>
            {revenueStats.revenueByCourse?.slice(0, 5).map((course) => (
              <div key={course._id}>
                <div className='flex justify-between text-sm mb-1'>
                  <span className='font-medium line-clamp-1'>{course.courseTitle}</span>
                  <span className='text-green-600'>${course.totalRevenue?.toLocaleString()}</span>
                </div>
                <div className='w-full bg-gray-200 rounded-full h-2'>
                  <div
                    className='bg-green-600 h-2 rounded-full'
                    style={{
                      width: `${(course.totalRevenue / (revenueStats.stats?.totalRevenue || 1)) * 100}%`
                    }}
                  ></div>
                </div>
                <div className='flex justify-between text-xs text-gray-500 mt-1'>
                  <span>{course.enrollments} enrollments</span>
                  <span>
                    {((course.totalRevenue / (revenueStats.stats?.totalRevenue || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Analytics */}
        <div className='bg-white rounded-lg shadow p-6 lg:col-span-2'>
          <h3 className='text-lg font-semibold mb-4'>Payment Analytics</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {/* Payment Methods */}
            <div>
              <h4 className='font-medium text-gray-700 mb-3'>Payment Methods</h4>
              <div className='space-y-2'>
                {paymentAnalytics.paymentMethods?.map((method) => (
                  <div key={method._id} className='flex justify-between text-sm'>
                    <span className='capitalize'>{method._id || 'Unknown'}</span>
                    <span>{method.count} payments</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <h4 className='font-medium text-gray-700 mb-3'>Payment Status</h4>
              <div className='space-y-2'>
                {paymentAnalytics.paymentStatus?.map((status) => (
                  <div key={status._id} className='flex justify-between text-sm'>
                    <span className='capitalize'>{status._id}</span>
                    <span>{status.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Growth */}
            <div>
              <h4 className='font-medium text-gray-700 mb-3'>Monthly Growth</h4>
              <div className='space-y-2'>
                {paymentAnalytics.monthlyGrowth?.slice(-3).map((month) => (
                  <div key={`${month._id.year}-${month._id.month}`} className='flex justify-between text-sm'>
                    <span>{month._id.month}/{month._id.year}</span>
                    <span className='text-green-600'>${month.revenue?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart (Simple) */}
      {revenueStats.dailyRevenue && revenueStats.dailyRevenue.length > 0 && (
        <div className='bg-white rounded-lg shadow p-6 mt-6'>
          <h3 className='text-lg font-semibold mb-4'>Revenue Trend</h3>
          <div className='h-64 flex items-end space-x-2 overflow-x-auto'>
            {revenueStats.dailyRevenue.map((day, index) => (
              <div key={index} className='flex flex-col items-center'>
                <div
                  className='bg-blue-500 rounded-t w-8'
                  style={{
                    height: `${(day.revenue / Math.max(...revenueStats.dailyRevenue.map(d => d.revenue))) * 200}px`
                  }}
                ></div>
                <div className='text-xs text-gray-500 mt-2'>
                  {day._id.month}/{day._id.day}
                </div>
                <div className='text-xs font-medium'>
                  ${day.revenue}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RevenueManagement