import { clerkClient} from '@clerk/express'
import Course from '../models/Course.js'
import CourseApprovalRequest from '../models/CourseApprovalRequest.js'
import { v2 as cloudinary } from 'cloudinary'
import { Purchase } from '../models/Purchase.js'
import User from '../models/User.js'
import EducatorRequest from '../models/EducatorRequest.js'

// Submit educator request for approval
export const submitEducatorRequest = async (req, res) => {
    try {
        const userId = req.auth().userId
        const {
            fullName,
            email,
            phone,
            education,
            experience,
            specialization,
            teachingExperience,
            motivation,
            portfolio
        } = req.body

        // Check if user already has a pending request
        const existingRequest = await EducatorRequest.findOne({
            userId,
            status: 'pending'
        })

        if (existingRequest) {
            return res.json({
                success: false,
                message: 'You already have a pending educator request'
            })
        }

        // Check if user is already an educator or admin
        const user = await clerkClient.users.getUser(userId)
        if (user.publicMetadata.role === 'educator' || user.publicMetadata.role === 'admin') {
            return res.json({
                success: false,
                message: 'You already have educator access'
            })
        }

        const educatorRequest = new EducatorRequest({
            userId,
            fullName,
            email,
            phone,
            education,
            experience,
            specialization,
            teachingExperience,
            motivation,
            portfolio: portfolio || ''
        })

        await educatorRequest.save()

        res.json({
            success: true,
            message: 'Educator request submitted successfully. Please wait for admin approval.'
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get user's educator request status
export const getEducatorRequestStatus = async (req, res) => {
    try {
        const userId = req.auth().userId
        
        const request = await EducatorRequest.findOne({ userId })
            .sort({ createdAt: -1 })
        
        if (!request) {
            return res.json({
                success: true,
                status: 'none',
                message: 'No educator request found'
            })
        }
        
        res.json({
            success: true,
            status: request.status,
            request: request,
            message: `Your educator request is ${request.status}`
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const addCourse = async (req, res) => {
    try{
        const {courseData} = req.body
        const imageFile = req.file
        const educatorId = req.auth().userId

        if (!imageFile) {
            return res.json({ success: false, message: 'Thumbnail Not Attached' })
        }

        const parsedCourseData = await JSON.parse(courseData)
        parsedCourseData.educator = educatorId
        parsedCourseData.isPublished = false // Khóa học mới sẽ không được xuất bản ngay
        parsedCourseData.approvalStatus = 'pending' // Trạng thái ban đầu là pending approval
        
        const newCourse = await Course.create(parsedCourseData)
        const imageUpload = await cloudinary.uploader.upload(imageFile.path)
        newCourse.courseThumbnail = imageUpload.secure_url
        await newCourse.save()

        res.json({ success: true, message: 'Course created successfully. Submit for approval to publish.', courseId: newCourse._id})

    }catch (error) {
        res.json({ success: false, message: error.message})
    }
}

export const getEducatorCourses = async (req, res) => {
    try {
        const educator = req.auth().userId
        const courses = await Course.find({educator})
        res.json({success:true, courses})

    }catch (error) {
        res.json({success:false, message: error.message})
    }
}

// Get educator dashborad data {total earning, entolled students , No. of Courses}

export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth().userId; // Updated
    const courses = await Course.find({ educator });
    const totalCourses = courses.length;
    const courseIds = courses.map(course => course._id);

    // Lấy tất cả purchase của các course đã tạo
    const purchases = await Purchase.find({ courseId: { $in: courseIds }, status: 'completed' });
    const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    // Collect unique enrolled students
    const enrolledStudentsData = [];
    for (const course of courses) {
      const students = await User.find(
        { _id: { $in: course.enrolledStudents } },
        'name imageUrl'
      );

      students.forEach(student => {
        enrolledStudentsData.push({ courseTitle: course.courseTitle, student });
      });
    }
    res.json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses
      }
    });

  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};


// Get Enrolled Students Data with Purchase Data

export const getEnrolledStudentsData = async (req, res)=> {
    try {
        const educator = req.auth().userId;
        const courses = await Course.find({educator});
        const courseIds = courses.map(course => course._id);

        const purchases = await Purchase.find({
            courseId: {$in: courseIds},
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle')

        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }));

        res.json({success: true, enrolledStudents})
        
    } catch (error) {
        res.json({success:false, message: error.message});
    }

}

// Gửi yêu cầu phê duyệt khóa học
export const submitCourseForApproval = async (req, res) => {
    try {
        const { courseId, submissionMessage = '' } = req.body;
        const educatorId = req.auth().userId;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        if (course.educator !== educatorId) {
            return res.json({ success: false, message: 'Unauthorized' });
        }

        if (course.approvalStatus === 'pending_approval') {
            return res.json({ success: false, message: 'Course is already pending approval' });
        }

        if (course.approvalStatus === 'approved') {
            return res.json({ success: false, message: 'Course is already approved and published' });
        }

        // Kiểm tra khóa học có đủ nội dung không
        if (!course.courseContent || course.courseContent.length === 0) {
            return res.json({ success: false, message: 'Course must have at least one chapter to submit for approval' });
        }

        // Tạo snapshot của khóa học
        const courseSnapshot = {
            courseTitle: course.courseTitle,
            courseDescription: course.courseDescription,
            coursePrice: course.coursePrice,
            discount: course.discount,
            courseThumbnail: course.courseThumbnail,
            courseContent: course.courseContent
        };

        // Tạo yêu cầu phê duyệt
        const approvalRequest = new CourseApprovalRequest({
            courseId: course._id,
            educator: educatorId,
            submissionMessage,
            courseSnapshot
        });

        await approvalRequest.save();

        // Cập nhật trạng thái khóa học
        course.approvalStatus = 'pending_approval';
        course.latestApprovalRequest = approvalRequest._id;
        await course.save();

        res.json({
            success: true,
            message: 'Course submitted for approval successfully. You will be notified once reviewed.'
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Lấy trạng thái phê duyệt của khóa học
export const getCourseApprovalStatus = async (req, res) => {
    try {
        const { courseId } = req.params;
        const educatorId = req.auth().userId;

        const course = await Course.findById(courseId)
            .populate('latestApprovalRequest');

        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        if (course.educator !== educatorId) {
            return res.json({ success: false, message: 'Unauthorized' });
        }

        res.json({
            success: true,
            approvalStatus: course.approvalStatus,
            isPublished: course.isPublished,
            approvalRequest: course.latestApprovalRequest
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Lấy danh sách yêu cầu phê duyệt của educator
export const getMyApprovalRequests = async (req, res) => {
    try {
        const educatorId = req.auth().userId;
        
        const approvalRequests = await CourseApprovalRequest.find({ educator: educatorId })
            .populate('courseId', 'courseTitle courseThumbnail coursePrice approvalStatus isPublished')
            .populate('adminResponse.reviewedBy', 'name email')
            .sort({ submittedAt: -1 });

        res.json({
            success: true,
            approvalRequests
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}