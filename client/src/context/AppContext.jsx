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
      console.log('Backend URL:', backendUrl);
      console.log('Retry attempt:', retryCount);
      
      // Wait for user to be fully loaded
      if (!user) {
        console.log('❌ User not available, skipping fetch');
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
        console.log('Token available:', !!token);
        console.log('Token length:', token ? token.length : 0);
        console.log('Token starts with:', token ? token.substring(0, 20) + '...' : 'null');
        
        if (!token || token.length < 10) {
          console.error('❌ Invalid or missing token');
          
          // Retry with longer wait for token
          if (retryCount < 3) {
            console.log(`🔄 Retrying for token in ${(retryCount + 1) * 500}ms...`);
            setTimeout(() => {
              fetchUserData(retryCount + 1);
            }, (retryCount + 1) * 500);
            return;
          }
          
          throw new Error('No valid authentication token available');
        }
        
        const {data} = await axios.get(backendUrl + '/api/user/data',{headers:{Authorization: `Bearer ${token}`}})
        console.log('API Response:', data);
        
        if(data.success){
          setUserData(data.user)
          console.log('✅ User data set successfully:', data.user.name);
        }else{
          console.error('❌ API returned error:', data.message);
          
          // Retry up to 3 times with increasing delay
          if(retryCount < 3 && data.message === 'User not authenticated') {
            console.log(`🔄 Retrying fetchUserData in ${(retryCount + 1) * 1000}ms...`);
            setTimeout(() => {
              fetchUserData(retryCount + 1);
            }, (retryCount + 1) * 1000);
            return;
          }
          
          toast.error(data.message)
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
        
        if(data.success){
          setEnrolledCourses(data.enrolledCourses.reverse())
        }else{
          toast.error(data.message)
        }
      } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        toast.error(error.message)
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
