import { useContext, useEffect } from 'react'
import { AppContext } from '../context/AppContext'
import { useUser } from '@clerk/clerk-react'

const ContextDebug = () => {
  const context = useContext(AppContext)
  const { user } = useUser()
  
  useEffect(() => {
    console.log('=== CONTEXT DEBUG ===')
    console.log('Context:', context)
    console.log('User from Clerk:', user)
    console.log('User data from context:', context?.userData)
  }, [context, user])

  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-4">
      <h3 className="font-bold text-yellow-800">Context Debug:</h3>
      <div className="mt-2 text-sm">
        <p><strong>Backend URL:</strong> {context?.backendUrl || 'Not available'}</p>
        <p><strong>User Data:</strong> {context?.userData ? `✅ ${context.userData.name}` : '❌ Not available'}</p>
        <p><strong>Clerk User:</strong> {user ? `✅ ${user.id}` : '❌ Not available'}</p>
        <p><strong>Enrolled Courses:</strong> {context?.enrolledCourses?.length || 0}</p>
        
        <button 
          onClick={() => {
            console.log('Manual fetch trigger...')
            if (context?.fetchUserData) {
              context.fetchUserData()
            }
          }}
          className="mt-2 bg-yellow-500 text-white px-3 py-1 rounded text-xs"
        >
          Trigger Manual Fetch
        </button>
      </div>
    </div>
  )
}

export default ContextDebug