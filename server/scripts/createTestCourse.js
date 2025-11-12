// Test script để tạo một khóa học sample
import connectDB from '../configs/mongodb.js'
import Course from '../models/Course.js'

const createTestCourse = async () => {
  try {
    await connectDB()
    
    const testCourse = {
      courseTitle: "Test Course for Payment",
      courseDescription: "This is a test course to test payment functionality",
      coursePrice: 100000, // 100k VND
      discount: 10, // 10% discount = 90k VND final price
      courseThumbnail: "https://via.placeholder.com/300x200/4CAF50/white?text=Test+Course",
      courseContent: [
        {
          chapterTitle: "Chapter 1: Introduction",
          chapterContent: [
            {
              lectureTitle: "Welcome to the course",
              lectureDescription: "Introduction lecture",
              lectureVideo: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              lectureDuration: 5
            }
          ]
        }
      ],
      courseCategory: "Technology",
      courseLevel: "Beginner",
      courseRatings: [],
      enrolledStudents: [],
      educatorId: "test_educator_id"
    }
    
    const newCourse = await Course.create(testCourse)
    console.log('✅ Test course created:', newCourse._id)
    console.log('Title:', newCourse.courseTitle)
    console.log('Price:', newCourse.coursePrice, 'VND')
    console.log('Final price after discount:', Math.floor(newCourse.coursePrice - (newCourse.discount * newCourse.coursePrice / 100)), 'VND')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating test course:', error)
    process.exit(1)
  }
}

createTestCourse()