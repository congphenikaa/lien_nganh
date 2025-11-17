// Test script để kiểm tra edit course functionality
const testEditCourse = async () => {
  console.log('🧪 Testing Edit Course API...')
  
  // Test data for editing (không phải tạo mới)
  const editData = {
    courseTitle: 'Khóa học đã được cập nhật - Test Edit',
    courseDescription: '<p>Mô tả khóa học đã được <strong>cập nhật</strong> thành công!</p>',
    coursePrice: 299,
    discount: 25,
    courseContent: [
      {
        chapterId: 'edit-chapter-1',
        chapterTitle: 'Chương 1 - Đã chỉnh sửa',
        chapterContent: [
          {
            lectureId: 'edit-lecture-1',
            lectureTitle: 'Bài học đầu tiên (đã sửa)',
            lectureDuration: '12',
            lectureUrl: 'https://updated-example.com/video1',
            isPreviewFree: true,
            lectureOrder: 1
          }
        ],
        collapsed: false,
        chapterOrder: 1
      }
    ]
  }
  
  console.log('📝 Dữ liệu để edit (JSON format):')
  console.log(JSON.stringify(editData, null, 2))
  
  console.log('\n📷 Dữ liệu để edit với hình ảnh (FormData format):')
  console.log('FormData structure:')
  console.log('- courseData:', 'JSON string của editData ở trên')
  console.log('- image:', 'File object (hình ảnh mới)')
  
  console.log('\n🎯 API Endpoint sẽ được gọi:')
  console.log('PUT /api/admin/courses/:courseId')
  console.log('- courseId: ID của khóa học cần chỉnh sửa')
  console.log('- Method: PUT (để cập nhật, không phải POST để tạo mới)')
  
  console.log('\n✅ Các tính năng edit được hỗ trợ:')
  console.log('🔸 Chỉnh sửa tiêu đề khóa học')
  console.log('🔸 Cập nhật mô tả (HTML từ Quill editor)')
  console.log('🔸 Thay đổi giá và giảm giá')
  console.log('🔸 Upload hình ảnh mới (tùy chọn)')
  console.log('🔸 Quản lý nội dung khóa học (chapters/lectures)')
  console.log('🔸 Giữ nguyên dữ liệu cũ nếu không thay đổi')
  
  return editData
}

// Export để có thể sử dụng từ frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testEditCourse }
}

// Run test
testEditCourse()