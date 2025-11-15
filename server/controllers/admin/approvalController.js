import Course from '../../models/Course.js'
import CourseApprovalRequest from '../../models/CourseApprovalRequest.js'
import User from '../../models/User.js'

// Lấy danh sách tất cả yêu cầu phê duyệt
export const getAllApprovalRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = '', search = '' } = req.query;
        
        const query = {};
        if (status) {
            query.status = status;
        }
        
        const approvalRequests = await CourseApprovalRequest.find(query)
            .populate('courseId', 'courseTitle courseThumbnail coursePrice')
            .populate('educator', 'name email imageUrl')
            .populate('adminResponse.reviewedBy', 'name email')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ submittedAt: -1 });

        // Nếu có search, lọc theo tên khóa học
        let filteredRequests = approvalRequests;
        if (search) {
            filteredRequests = approvalRequests.filter(request => 
                request.courseId?.courseTitle?.toLowerCase().includes(search.toLowerCase()) ||
                request.educator?.name?.toLowerCase().includes(search.toLowerCase())
            );
        }

        const total = await CourseApprovalRequest.countDocuments(query);

        res.json({
            success: true,
            approvalRequests: filteredRequests,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Lấy chi tiết một yêu cầu phê duyệt
export const getApprovalRequestDetail = async (req, res) => {
    try {
        const { requestId } = req.params;
        
        const approvalRequest = await CourseApprovalRequest.findById(requestId)
            .populate('courseId')
            .populate('educator', 'name email imageUrl')
            .populate('adminResponse.reviewedBy', 'name email');

        if (!approvalRequest) {
            return res.json({ success: false, message: 'Approval request not found' });
        }

        res.json({
            success: true,
            approvalRequest
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Phê duyệt khóa học
export const approveCourse = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { message = '', modifications = {} } = req.body;
        const adminId = req.auth().userId;

        const approvalRequest = await CourseApprovalRequest.findById(requestId);
        if (!approvalRequest) {
            return res.json({ success: false, message: 'Approval request not found' });
        }

        if (approvalRequest.status !== 'pending') {
            return res.json({ success: false, message: 'This request has already been processed' });
        }

        const course = await Course.findById(approvalRequest.courseId);
        if (!course) {
            return res.json({ success: false, message: 'Course not found' });
        }

        // Cập nhật khóa học nếu admin có sửa đổi
        if (Object.keys(modifications).length > 0) {
            if (modifications.courseTitle) course.courseTitle = modifications.courseTitle;
            if (modifications.courseDescription) course.courseDescription = modifications.courseDescription;
            if (modifications.coursePrice !== undefined) course.coursePrice = modifications.coursePrice;
            if (modifications.discount !== undefined) course.discount = modifications.discount;
        }

        // Cập nhật trạng thái khóa học
        course.approvalStatus = 'approved';
        course.isPublished = true;
        await course.save();

        // Cập nhật yêu cầu phê duyệt
        approvalRequest.status = 'approved';
        approvalRequest.adminResponse = {
            message,
            reviewedBy: adminId,
            reviewedAt: new Date()
        };
        await approvalRequest.save();

        res.json({
            success: true,
            message: 'Course approved and published successfully'
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Từ chối khóa học
export const rejectCourse = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { message } = req.body;
        const adminId = req.auth().userId;

        const approvalRequest = await CourseApprovalRequest.findById(requestId);
        if (!approvalRequest) {
            return res.json({ success: false, message: 'Approval request not found' });
        }

        if (approvalRequest.status !== 'pending') {
            return res.json({ success: false, message: 'This request has already been processed' });
        }

        const course = await Course.findById(approvalRequest.courseId);
        if (course) {
            course.approvalStatus = 'rejected';
            await course.save();
        }

        // Cập nhật yêu cầu phê duyệt
        approvalRequest.status = 'rejected';
        approvalRequest.adminResponse = {
            message,
            reviewedBy: adminId,
            reviewedAt: new Date()
        };
        await approvalRequest.save();

        res.json({
            success: true,
            message: 'Course rejected successfully'
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Cập nhật thông tin khóa học trong yêu cầu phê duyệt
export const updateApprovalRequestCourse = async (req, res) => {
    try {
        const { requestId } = req.params;
        const updates = req.body;

        const approvalRequest = await CourseApprovalRequest.findById(requestId);
        if (!approvalRequest) {
            return res.json({ success: false, message: 'Approval request not found' });
        }

        // Cập nhật courseSnapshot
        if (updates.courseTitle) approvalRequest.courseSnapshot.courseTitle = updates.courseTitle;
        if (updates.courseDescription) approvalRequest.courseSnapshot.courseDescription = updates.courseDescription;
        if (updates.coursePrice !== undefined) approvalRequest.courseSnapshot.coursePrice = updates.coursePrice;
        if (updates.discount !== undefined) approvalRequest.courseSnapshot.discount = updates.discount;

        await approvalRequest.save();

        res.json({
            success: true,
            message: 'Approval request updated successfully',
            approvalRequest
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}