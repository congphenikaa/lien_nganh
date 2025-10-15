import React, { useState, useEffect, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { backendUrl, getToken } = useContext(AppContext)

  const fetchUsers = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(backendUrl + '/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setUsers(data.users)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        backendUrl + '/api/admin/users/' + userId + '/role',
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        toast.success('User role updated successfully')
        fetchUsers()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = await getToken()
      const { data } = await axios.put(
        backendUrl + '/api/admin/users/' + userId + '/status',
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        toast.success('User status updated successfully')
        fetchUsers()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='w-16 h-16 border-4 border-gray-300 border-t-blue-400 rounded-full animate-spin'></div>
      </div>
    )
  }

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold mb-6'>User Management</h1>
      
      <div className='bg-white rounded-lg shadow overflow-hidden'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                User
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Email
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Role
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
            {users.map((user) => (
              <tr key={user._id}>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <div className='flex items-center'>
                    <div className='flex-shrink-0 h-10 w-10'>
                      <img
                        className='h-10 w-10 rounded-full'
                        src={user.profileImage || assets.user_icon}
                        alt={user.name}
                      />
                    </div>
                    <div className='ml-4'>
                      <div className='text-sm font-medium text-gray-900'>{user.name}</div>
                    </div>
                  </div>
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                  {user.email}
                </td>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <select
                    value={user.role}
                    onChange={(e) => updateUserRole(user._id, e.target.value)}
                    className='text-sm border border-gray-300 rounded px-2 py-1'
                  >
                    <option value='student'>Student</option>
                    <option value='educator'>Educator</option>
                    <option value='admin'>Admin</option>
                  </select>
                </td>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                  <button
                    onClick={() => toggleUserStatus(user._id, user.isActive)}
                    className={`mr-3 ${
                      user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                    }`}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UserManagement