import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import humanizeDuration from 'humanize-duration';
import { useAuth, useUser} from "@clerk/clerk-react"
import axios from 'axios'
import { toast } from "react-toastify";
export const AppContext = createContext();

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const currency = import.meta.env.VITE_CURRENCY
    const navigate = useNavigate()

    const {getToken} = useAuth()
    const {user} = useUser()

    const [allCourses, setAllCourses] = useState([])
    const [isEducator, setIsEducator] = useState(false)
    const [enrolledCourses, setEnrolledCourses] = useState([])
    const [userData, setUserData] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)


    const fetchAllCourses = async ()=>{
      try {
        const {data} = await axios.get(backendUrl + '/api/course/all')
        if(data.success){
          setAllCourses(data.courses)
        }else {
          toast.error(data.message)
        }
      } catch (error) {
        toast.error(error.message)
      }
    }

    const fetchUserData = async (retryCount = 0) => {
      console.log('=== FETCH USER DATA IN CONTEXT ===');
      console.log('User available:', !!user);
      console.log('User ID:', user?.id);
      console.log('Backend URL:', backendUrl);
      console.log('Retry attempt:', retryCount);
      
      // Wait for user to be fully loaded
      if (!user || !user.id) {
        console.log(' User or User ID not available, skipping fetch');
        return;
      }
      
      // Check user role and set flags safely
      if(user && user.publicMetadata && user.publicMetadata.role){
        const role = user.publicMetadata.role
        if(role === 'educator' || role === 'admin'){
          setIsEducator(true)
        }
        if(role === 'admin'){
          setIsAdmin(true)
        }
      }
      
      try {
        // Wait a bit for token to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const token = await getToken();
        console.log('🔑 Token available:', !!token);
        console.log('🔑 Token length:', token ? token.length : 0);
        console.log('🔑 Token preview:', token ? token.substring(0, 30) + '...' : 'null');
        
        // 🛡️ Enhanced token validation
        if (!token || token === 'null' || token === 'undefined' || token.length < 10) {
          console.error('❌ Invalid or missing token');
          console.error(`   Token value: "${token}"`);
          console.error(`   Token type: ${typeof token}`);
          
          // Retry with progressive backoff
          if (retryCount < 5) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5s delay
            console.log(`🔄 Retrying for token in ${delay}ms... (attempt ${retryCount + 1}/5)`);
            setTimeout(() => {
              fetchUserData(retryCount + 1);
            }, delay);
            return;
          }
          
          console.error('❌ Max retry attempts reached for token');
          throw new Error('Authentication token unavailable after multiple attempts');
        }
        
        const {data} = await axios.get(backendUrl + '/api/user/data',{headers:{Authorization: `Bearer ${token}`}})
        console.log('API Response:', data);
        
        if(data.success){
          setUserData(data.user)
          console.log('✅ User data set successfully:', data.user.name);
        }else{
          console.error('❌ API returned error:', data.message);
          
          // Retry for both authentication and user not found errors
          if(retryCount < 3 && (data.message === 'User not authenticated' || data.message === 'User Not Found')) {
            console.log(`🔄 Retrying fetchUserData in ${(retryCount + 1) * 1000}ms... (attempt ${retryCount + 1})`);
            setTimeout(() => {
              fetchUserData(retryCount + 1);
            }, (retryCount + 1) * 1000);
            return;
          }
          
          // Only show toast error if not a user creation issue
          if(data.message !== 'User Not Found' && data.message !== 'Failed to create user profile') {
            toast.error(data.message)
          }
        }
      } catch (error) {
        console.error('❌ Error fetching user data:', error);
        
        // Retry on network errors too
        if(retryCount < 3) {
          console.log(`🔄 Retrying fetchUserData on error in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => {
            fetchUserData(retryCount + 1);
          }, (retryCount + 1) * 1000);
          return;
        }
        
        toast.error(error.message)
      }
    }

    // function to calculate average rating of a course
    const calculateRating = (course)=>{
      if(course.courseRatings.length === 0){
        return 0;
      }
      let totalRating = 0
      course.courseRatings.forEach(rating => {
        totalRating += rating.rating
      })
      return Math.floor(totalRating / course.courseRatings.length)
    }

    // Function to Calculate Course Chapter Time
    const calculateChapterTime = (chapter) => {
      let time = 0;
      chapter.chapterContent.map((lecture)=> time += lecture.lectureDuration);
      return humanizeDuration(time * 60 * 1000, {units: ["h", "m"]});
    }

    // function to Calculate course duration
    const calculateCourseDuration = (course) => {
      let time = 0;

      course.courseContent.map((chapter)=> chapter.chapterContent.map(
        (lecture) => time += lecture.lectureDuration
      ))

      return humanizeDuration(time * 60 * 1000, {units: ["h", "m"]});
    }

    // function calculate to No of Lectures in the course
    const calculateNoOfLectures = (course)=> {
      let totalLectures = 0;
      course.courseContent.forEach(chapter => {
        if(Array.isArray(chapter.chapterContent)) {
          totalLectures += chapter.chapterContent.length;
        }
      });

      return totalLectures;
    }

    const fetchUserEnrolledCourses = async ()=>{
      try {
        const token = await getToken();
        const {data} = await axios.get(backendUrl + '/api/user/enrolled-courses',{headers: {Authorization: `Bearer ${token}`}})
        
        if(data && data.success){
          // Kiểm tra nếu enrolledCourses tồn tại và là array
          if(data.enrolledCourses && Array.isArray(data.enrolledCourses)){
            setEnrolledCourses(data.enrolledCourses.reverse())
          } else {
            // Nếu không có enrolled courses, set empty array
            setEnrolledCourses([])
          }
        }else{
          console.error('API response:', data);
          setEnrolledCourses([])
          if(data && data.message){
            toast.error(data.message)
          } else {
            toast.error('Có lỗi khi tải danh sách khóa học')
          }
        }
      } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        setEnrolledCourses([]) // Set empty array on error
        toast.error(error.message || 'Có lỗi khi kết nối server')
      }

    }

    useEffect(()=>{
      fetchAllCourses()
    },[]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(()=>{
      console.log('=== USEEFFECT TRIGGERED ===');
      console.log('User changed:', !!user);
      console.log('User ID:', user?.id);
      
      if(user){
        console.log('Calling fetchUserData...');
        // Add delay to ensure user is fully loaded
        setTimeout(() => {
          fetchUserData()
          fetchUserEnrolledCourses()
        }, 100)
      }
    },[user]) // eslint-disable-line react-hooks/exhaustive-deps
    
    // Additional effect to force fetch when userData is null but user exists
    useEffect(() => {
      if (user && !userData) {
        console.log('=== FORCE FETCH: User exists but userData is null ===');
        setTimeout(() => {
          fetchUserData()
        }, 500)
      }
    }, [user, userData]) // eslint-disable-line react-hooks/exhaustive-deps
    
    // Backup mechanism - retry every 30s if userData is still null and user exists
    useEffect(() => {
      const interval = setInterval(() => {
        if (user && !userData) {
          console.log('=== BACKUP RETRY: Still no userData after 30s ===');
          fetchUserData();
        }
      }, 30000); // 30 second intervals
      
      return () => clearInterval(interval);
    }, [user, userData]) // eslint-disable-line react-hooks/exhaustive-deps

    const value = {
      currency, allCourses, navigate, calculateRating, isEducator, setIsEducator, isAdmin, setIsAdmin,
      calculateChapterTime, calculateCourseDuration, calculateNoOfLectures, enrolledCourses, fetchUserEnrolledCourses, backendUrl, userData, setUserData, getToken, fetchAllCourses, fetchUserData
    }

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
}
