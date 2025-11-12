import { useAuth, useUser } from '@clerk/clerk-react'
import { useEffect } from 'react'

const AuthDebug = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  useEffect(() => {
    console.log('=== AUTH DEBUG ===')
    console.log('Auth loaded:', isLoaded)
    console.log('User signed in:', isSignedIn)
    console.log('User:', user)
    
    if (isSignedIn && getToken) {
      getToken().then(token => {
        console.log('Token:', token ? 'Available' : 'Not available')
      }).catch(err => {
        console.error('Token error:', err)
      })
    }
  }, [isLoaded, isSignedIn, user, getToken])

  if (!isLoaded) {
    return <div>Loading auth...</div>
  }

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold">Auth Debug Info:</h3>
      <p>Loaded: {isLoaded ? '✅' : '❌'}</p>
      <p>Signed In: {isSignedIn ? '✅' : '❌'}</p>
      <p>User ID: {user?.id || 'N/A'}</p>
      <p>User Email: {user?.emailAddresses?.[0]?.emailAddress || 'N/A'}</p>
    </div>
  )
}

export default AuthDebug