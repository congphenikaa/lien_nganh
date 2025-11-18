import React, { useEffect, useState, useCallback } from "react"
import { useContext } from "react"
import { AppContext } from "../../context/AppContext"
import { useParams } from "react-router-dom"
import { assets } from "../../assets/assets"
import humanizeDuration from "humanize-duration"
import YouTube from "react-youtube"
import Footer from "../../components/student/Footer"
import Rating from "../../components/student/Rating"
import axios from "axios"
import { toast } from "react-toastify"

const Player = () => {
  const {enrolledCourses, calculateChapterTime, backendUrl, getToken, userData, fetchUserEnrolledCourses} = useContext(AppContext)

  const {courseId} = useParams()
  const [courseData, setCourseData] = useState(null)
  const [openSections, setOpenSections] = useState({})
  const [playerData, setPlayerData] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [initialRating, setInitialRating] = useState(0)
  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(true)

  // Helper function to extract YouTube video ID from various URL formats
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    
    // If it's already just a video ID (11 characters)
    if (url.length === 11 && !url.includes('http') && !url.includes('/')) {
      return url;
    }
    
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&#?]*)/,
      /youtube\.com\/v\/([^&#?]*)/,
      /youtube\.com\/watch\?.*v=([^&#]*)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Remove any additional parameters (like &list=...)
        return match[1].split('&')[0];
      }
    }
    
    // If no pattern matches, try to extract from the end of the URL
    const lastPart = url.split('/').pop();
    if (lastPart && lastPart.includes('v=')) {
      return lastPart.split('v=')[1].split('&')[0];
    }
    
    // Last resort: if it contains & but no http, assume it's a video ID with parameters
    if (url.includes('&') && !url.includes('http')) {
      return url.split('&')[0];
    }
    
    return null;
  }

  const getCourseData = useCallback(()=>{
    console.log('Getting course data for courseId:', courseId)
    console.log('Enrolled courses:', enrolledCourses ? enrolledCourses.length : 0)
    
    // Kiểm tra enrolledCourses có tồn tại và là array không
    if(!enrolledCourses || !Array.isArray(enrolledCourses)) {
      console.log('Enrolled courses is null or not an array')
      setLoading(false)
      return
    }
    
    const foundCourse = enrolledCourses.find(course => course._id === courseId)
    if(foundCourse){
      console.log('Found course:', foundCourse.courseTitle)
      setCourseData(foundCourse)
      if(foundCourse.courseRatings && foundCourse.courseRatings.length > 0){
        foundCourse.courseRatings.forEach((item)=>{
          if(item.userId === userData._id){
            setInitialRating(item.rating)
          }
        })
      }
      setLoading(false)
    } else {
      console.log('Course not found in enrolled courses')
      setLoading(false)
    }
  }, [enrolledCourses, courseId, userData])

  const toggleSection = (index)=> {
    setOpenSections((prev) => (
      {...prev, 
        [index]: !prev[index],
      }
    ));
  };

  // Fetch enrolled courses when component mounts
  useEffect(()=>{
    if(userData && courseId){
      fetchUserEnrolledCourses()
    }
  }, [userData, courseId, fetchUserEnrolledCourses])

  useEffect(()=>{
    if(enrolledCourses && enrolledCourses.length > 0 && courseId){
      getCourseData()
    } else if(enrolledCourses && enrolledCourses.length === 0 && userData && courseId){
      // If no enrolled courses but user is logged in, show message
      setLoading(false)
    }
  }, [enrolledCourses, courseId, userData, getCourseData])

  const marklectureAsCompleted = async (lectureId)=>{
    try {
      const token = await getToken()
      const {data} = await axios.post(backendUrl + '/api/user/update-course-progress', {courseId, lectureId}, {headers: {Authorization: `Bearer ${token}`}})
      if(data.success){
        toast.success(data.message)
        getCourseProgress()
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
      
    }
  }

  const getCourseProgress = useCallback(async () =>{
    try {
      const token = await getToken()
      const {data} = await axios.post(backendUrl + '/api/user/get-course-progress',{courseId}, {headers: {Authorization: `Bearer ${token}`}})
      if (data.success){
        setProgressData(data.progressData)
      }else{
        toast.error(data.error)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }, [courseId, getToken, backendUrl])

  const handleRate = async ()=>{
    try {
      const token = await getToken()
      const { data} = await axios.post(backendUrl + '/api/user/add-rating', {courseId, rating}, {headers: {Authorization: `Bearer ${token}`}})
      if (data.success) {
        toast.success(data.message)
        fetchUserEnrolledCourses()
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
      
    }
  }

  useEffect(()=>{
    if(courseId){
      getCourseProgress()
    }
  },[courseId, getCourseProgress])

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='flex flex-col items-center space-y-4'>
          <div className='w-16 sm:w-20 aspect-square border-4 border-gray-300 border-t-blue-400 rounded-full animate-spin'></div>
          <p className='text-gray-600 text-center'>Đang tải khóa học...</p>
        </div>
      </div>
    )
  }

  if (!courseData) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='flex flex-col items-center space-y-4'>
          <svg className='w-16 h-16 text-gray-300 mb-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1} d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
          </svg>
          <h3 className='text-lg font-semibold mb-2'>Không tìm thấy khóa học</h3>
          <p className='text-sm mb-4'>Khóa học này có thể không tồn tại hoặc bạn chưa đăng ký.</p>
          <button 
            onClick={() => window.history.back()}
            className='px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
          >
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className='p-4 sm:p-10 flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36'>
      {/* left column */}
      <div className='text-gray-800'>
        <h2 className='text-xl font-semibold'>Course Structure</h2>
        <div className='pt-5'>
          {courseData && courseData.courseContent.map((chapter, index)=> (
            <div key={index} className='border border-gray-300 bg-white mb-2 
            rounded'>
              <div className='flex items-center justify-between px-4 py-3 
              cursor-pointer select-none' onClick={()=> toggleSection(index)}>
                <div className='flex items-center gap-2'>
                  <img className={`transform transition-transform 
                  ${openSections[index] ? 'rotate-180' : 'rotate-0'}`}
                    src={assets.down_arrow_icon} alt="arrow icon" />
                  <p className='font-medium md:text-base text-sm'>{chapter.chapterTitle}</p>
                </div>
                <p className='text-sm md:text-default'>{chapter.chapterContent.length} Lectures - 
                {calculateChapterTime(chapter)}</p>
              </div>

              <div className={`overflow-hidden transition-all duration-300 
              ${openSections[index] ? 'max-h-96' : 'max-h-0'}`}>
                <ul className='list-disc md:pl-10 pl-4 pr-r py-2 text-gray-600
                border-t border-gray-300'>
                  {chapter.chapterContent.map((lecture, i)=> (
                    <li key={i} className='flex items-start gap-2 py-1'>
                      <img src={progressData && progressData.lectureCompleted.includes(lecture.lectureId) ? assets.blue_tick_icon : assets.play_icon} alt="play icon"  className='w-4
                      h-4 mt-1'/>
                      <div className='flex items-center justify-between w-full
                      text-gray-800 text-xs md:text-default'>
                        <p>{lecture.lectureTitle}</p>
                        <div className='flex gap-2'>
                          {lecture.lectureUrl && <p onClick={()=> setPlayerData({
                            ...lecture, chapter: index + 1, lecture: i + 1
                          })} className='text-blue-500
                          cursor-pointer'>Watch</p>}
                          <p>{humanizeDuration(lecture.lectureDuration * 60 
                            * 1000, {units: ['h', 'm']})}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 py-3 mt-10">
          <h1 className="text-xl font-bold">Rate this Course:</h1>
          <Rating initialRating={initialRating} onRate={(newRating) => {
            setRating(newRating);
            handleRate();
          }}/>
        </div>
      </div>
      {/* right column */}
      <div className="md:mt-10">
        {playerData ? (
          <div >
            {/* Debug info - you can remove this after testing */}
            <YouTube 
              videoId={getYouTubeVideoId(playerData.lectureUrl)} 
              iframeClassName="w-full aspect-video"
              opts={{
                height: '390',
                width: '640',
                playerVars: {
                  autoplay: 0,
                  modestbranding: 1,
                  rel: 0
                }
              }}
              onError={(e) => {
                console.error('YouTube Player Error:', e);
                toast.error('Lỗi khi tải video. Vui lòng kiểm tra URL video.');
              }}
            />
            <div className="flex justify-between items-center mt-1">
              <p>{playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}</p>
              <button onClick={()=> marklectureAsCompleted(playerData.lectureId)} className="text-blue-600">{progressData && progressData.lectureCompleted.includes(playerData.lectureId) ? 'Completed' : 'Mark Complete'}</button>
            </div>
          </div>

        )
        :
        <img src={courseData ? courseData.courseThumbnail : ''} alt="" />
        
      }
        
      </div>
    </div>
    <Footer />
    </>
  )
}

export default Player