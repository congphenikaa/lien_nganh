import React, { useContext } from 'react'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { Link } from 'react-router-dom'

const CourseCard = ({course}) => {
  const {currency, calculateRating} = useContext(AppContext)
  
  return (
    <Link to={'/course/' + course._id} onClick={()=> scrollTo(0,0)} 
    className='border border-gray-500/30 pb-6 overflow-hidden rounded-lg flex flex-col h-full'> {/* Thêm flex flex-col h-full để thẻ bằng nhau */}
      
      {/* --- PHẦN SỬA ĐỔI --- */}
      <img 
        className='w-full aspect-video object-cover' 
        src={course.courseThumbnail} 
        alt="" 
      />
      {/* - w-full: Rộng 100%
         - aspect-video: Ép tỉ lệ 16:9 (đẹp cho course)
         - object-cover: Giữ ảnh không bị méo/dẹt
      */}

      <div className='p-3 text-left flex flex-col flex-1'>
        <h3 className='text-base font-semibold line-clamp-2'>{course.courseTitle}</h3> {/* line-clamp-2: Giới hạn tên 2 dòng cho đều */}
        <p className='text-gray-500 mt-1'>{course.educator.name}</p>
        
        <div className='flex items-center space-x-2 mt-auto pt-2'> {/* mt-auto: Đẩy giá xuống đáy */}
          <p>{calculateRating(course)}</p>
          <div className='flex'>
            {[...Array(5)].map((_, i)=>(
                <img key={i} 
                src={i < Math.floor(calculateRating(course)) ? assets.star : assets.star_blank } 
                alt='' 
                className='w-3.5 h-3.5'/>
            ))}
          </div>
          <p className='text-gray-500'>({course.courseRatings.length})</p>
        </div>
        
        <p className='text-base font-semibold text-gray-800 mt-2'>
            {currency}{(course.coursePrice - course.discount * course.coursePrice / 100).toFixed(2)}
        </p>
      </div>
    </Link>
  )
}

export default CourseCard