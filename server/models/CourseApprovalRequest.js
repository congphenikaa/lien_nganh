import mongoose from 'mongoose'

const courseApprovalRequestSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    educator: {
        type: String,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    submissionMessage: {
        type: String,
        default: ''
    },
    adminResponse: {
        message: {
            type: String,
            default: ''
        },
        reviewedBy: {
            type: String,
            ref: 'User'
        },
        reviewedAt: {
            type: Date
        }
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    // Snapshot của khóa học tại thời điểm gửi yêu cầu
    courseSnapshot: {
        courseTitle: String,
        courseDescription: String,
        coursePrice: Number,
        discount: Number,
        courseThumbnail: String,
        courseContent: [{
            chapterTitle: String,
            chapterContent: [{
                lectureTitle: String,
                lectureUrl: String,
                lectureDuration: Number,
                lectureId: String
            }]
        }]
    }
}, {
    timestamps: true
})

const CourseApprovalRequest = mongoose.model('CourseApprovalRequest', courseApprovalRequestSchema)
export default CourseApprovalRequest