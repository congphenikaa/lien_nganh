import { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext'
import AuthDebug from '../components/AuthDebug'
import ContextDebug from '../components/ContextDebug'
import axios from 'axios'
import { useAuth } from '@clerk/clerk-react'

const TestAuth = () => {
  const { backendUrl, userData, fetchUserData } = useContext(AppContext)
  const { getToken } = useAuth()
  const [testResults, setTestResults] = useState({})
  const [loading, setLoading] = useState(false)

  const testEndpoint = async (endpoint, method = 'GET', body = null) => {
    setLoading(true)
    try {
      const token = await getToken()
      console.log('Testing endpoint:', endpoint)
      console.log('Token available:', !!token)
      
      const config = {
        method,
        url: `${backendUrl}/api/user/${endpoint}`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
      
      if (body) {
        config.data = body
        config.headers['Content-Type'] = 'application/json'
      }
      
      const response = await axios(config)
      
      setTestResults(prev => ({
        ...prev,
        [endpoint]: {
          success: true,
          data: response.data,
          status: response.status
        }
      }))
      
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error)
      setTestResults(prev => ({
        ...prev,
        [endpoint]: {
          success: false,
          error: error.response?.data || error.message,
          status: error.response?.status
        }
      }))
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      <AuthDebug />
      <ContextDebug />
      
      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">Context Data:</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p>Backend URL: {backendUrl}</p>
          <p>User Data: {userData ? '✅ Available' : '❌ Not available'}</p>
          {userData && (
            <div className="mt-2">
              <p>Name: {userData.name}</p>
              <p>Email: {userData.email}</p>
              <p>ID: {userData._id}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">API Tests:</h2>
        <div className="space-y-2">
          <button
            onClick={() => testEndpoint('data')}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
          >
            Test /data
          </button>
          
          <button
            onClick={() => testEndpoint('enrolled-courses')}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
          >
            Test /enrolled-courses
          </button>
          
          <button
            onClick={() => testEndpoint('refresh-enrolled-courses')}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Test /refresh-enrolled-courses
          </button>
          
          <button
            onClick={() => {
              console.log('Force refreshing user data...');
              fetchUserData();
            }}
            disabled={loading}
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Force Refresh Context
          </button>
          
          <button
            onClick={async () => {
              console.log('=== DIRECT API TEST ===');
              try {
                const token = await getToken();
                console.log('Token for direct call:', !!token);
                
                const response = await axios.get(`${backendUrl}/api/user/data`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                console.log('Direct API Response:', response.data);
                alert(`Direct API Success: ${response.data.success ? response.data.user.name : 'Failed'}`);
              } catch (error) {
                console.error('Direct API Error:', error);
                alert(`Direct API Error: ${error.message}`);
              }
            }}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Test Direct API Call
          </button>
          
          <button
            onClick={async () => {
              console.log('=== TEST PAYMENT API ===');
              try {
                const token = await getToken();
                
                // Test với course ID đầu tiên (nếu có)
                const coursesResponse = await axios.get(`${backendUrl}/api/course/all`);
                console.log('Available courses:', coursesResponse.data);
                
                if (coursesResponse.data.success && coursesResponse.data.courses.length > 0) {
                  const testCourse = coursesResponse.data.courses[0];
                  console.log('Testing payment for course:', testCourse.courseTitle);
                  
                  const paymentResponse = await axios.post(`${backendUrl}/api/user/momo-payment`, {
                    courseId: testCourse._id
                  }, {
                    headers: { 
                      Authorization: `Bearer ${token}`,
                      Origin: window.location.origin
                    }
                  });
                  
                  console.log('Payment Response:', paymentResponse.data);
                  
                  if (paymentResponse.data.success) {
                    alert('Payment URL created! Check console for details');
                    window.open(paymentResponse.data.payment_url, '_blank');
                  } else {
                    alert(`Payment failed: ${paymentResponse.data.message}`);
                  }
                } else {
                  alert('No courses available for testing');
                }
              } catch (error) {
                console.error('Payment test error:', error);
                alert(`Payment test error: ${error.message}`);
              }
            }}
            disabled={loading}
            className="bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            🔥 Test Payment API
          </button>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">Test Results:</h2>
        <div className="space-y-4">
          {Object.entries(testResults).map(([endpoint, result]) => (
            <div key={endpoint} className={`p-4 rounded border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className="font-semibold">{endpoint}</h3>
              <p className={`${result.success ? 'text-green-600' : 'text-red-600'}`}>
                Status: {result.status} - {result.success ? 'Success' : 'Failed'}
              </p>
              <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result.success ? result.data : result.error, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TestAuth