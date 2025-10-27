# Hệ thống Quản lý 3 Vai trò: Student - Educator - Admin

Hệ thống này cung cấp 3 vai trò chính với quy trình phê duyệt để trở thành giáo viên.

## Các Vai trò

### 1. Student (Học sinh) - Mặc định
- Xem và mua khóa học
- Theo dõi tiến độ học tập
- Đánh giá khóa học
- **Gửi yêu cầu** để trở thành giáo viên

### 2. Educator (Giáo viên) - Cần phê duyệt
- Tất cả quyền của học sinh
- Tạo và quản lý khóa học
- Xem thống kê thu nhập
- Quản lý học viên đã đăng ký

### 3. Admin (Quản trị viên) - Quyền cao nhất
- **Tất cả quyền của học sinh và giáo viên**
- Truy cập trực tiếp vào Educator Dashboard
- Quản lý tất cả người dùng
- **Phê duyệt/từ chối** yêu cầu trở thành giáo viên
- Xem thống kê tổng thể hệ thống
- Có thể tạo và quản lý khóa học như giáo viên

## Quy trình trở thành Giáo viên

1. **Học sinh** nhấp vào "Become Educator"
2. Điền form đăng ký với các thông tin:
   - Thông tin cá nhân
   - Học vấn và kinh nghiệm
   - Chuyên môn
   - Kinh nghiệm giảng dạy
   - Động lực
   - Portfolio (tùy chọn)
3. Gửi yêu cầu và chờ admin phê duyệt
4. Admin xem xét và phê duyệt/từ chối
5. Nếu được phê duyệt, vai trò tự động chuyển thành Educator

## Tính năng Admin

### Truy cập Educator
- Admin có thể truy cập trực tiếp vào `/educator` để sử dụng các tính năng giảng dạy
- Không cần chuyển đổi vai trò, admin vẫn giữ quyền admin
- Có nút "Educator Dashboard" trong Admin Panel
- Có nút "Admin Panel" trong Educator Dashboard

### Quản lý Người dùng
- Xem danh sách tất cả người dùng
- Thay đổi vai trò người dùng
- Kích hoạt/vô hiệu hóa tài khoản

### Quản lý Yêu cầu Educator
- Xem danh sách yêu cầu pending
- Xem chi tiết thông tin ứng viên
- Phê duyệt hoặc từ chối với ghi chú

## Cài đặt và Chạy

### Backend Setup
```bash
cd server
npm install
npm start
```

### Frontend Setup
```bash
cd client
npm install
npm run dev
```

### Tạo Admin đầu tiên
1. Đăng ký một tài khoản thông thường
2. Copy User ID từ Clerk Dashboard
3. Sửa file `server/scripts/createFirstAdmin.js` với User ID
4. Chạy script:
```bash
cd server
node scripts/createFirstAdmin.js
```

## API Endpoints

### Admin Routes (`/api/admin`)
- `GET /stats` - Thống kê dashboard
- `GET /users` - Danh sách người dùng
- `PUT /users/:userId/role` - Cập nhật vai trò
- `PUT /users/:userId/status` - Cập nhật trạng thái
- `GET /educator-requests` - Danh sách yêu cầu educator
- `PUT /educator-requests/:requestId/review` - Phê duyệt yêu cầu

### Educator Routes (`/api/educator`)
- `POST /request` - Gửi yêu cầu trở thành educator
- `GET /request-status` - Kiểm tra trạng thái yêu cầu
- Các routes educator hiện có... (admin có thể truy cập tất cả)

## Database Models

### EducatorRequest
```javascript
{
  userId: String,
  fullName: String,
  email: String,
  phone: String,
  education: String,
  experience: String,
  specialization: String,
  teachingExperience: String,
  motivation: String,
  portfolio: String,
  status: 'pending' | 'approved' | 'rejected',
  reviewedBy: String,
  reviewDate: Date,
  reviewNote: String
}
```

## Frontend Components

### Student Components
- `BecomeEducator.jsx` - Form đăng ký trở thành educator
- `Navbar.jsx` - Navbar với nút Admin Panel và educator request

### Admin Components
- `AdminLayout.jsx` - Layout admin với sidebar
- `AdminDashboard.jsx` - Dashboard với thống kê
- `UserManagement.jsx` - Quản lý người dùng
- `EducatorApproval.jsx` - Phê duyệt yêu cầu educator
- `AdminNavbar.jsx` - Navbar với nút chuyển đổi role

### Educator Components
- `Navbar.jsx` - Navbar với nút "Switch to Admin" (nếu là admin)

## Bảo mật

### Middleware
- `protectAdmin` - Chỉ admin mới truy cập được
- `protectEducator` - Admin hoặc educator mới truy cập được
- `protectAdminOrEducator` - Admin hoặc educator (không còn dùng)

### Role Management
- Vai trò được lưu trong Clerk `publicMetadata.role`
- Admin có tất cả quyền của educator mà không cần chuyển đổi vai trò
- Tất cả thay đổi vai trò đều qua Clerk API

## Ghi chú

1. **Admin có tất cả quyền của educator và student**
2. **Admin không cần chuyển đổi vai trò** để sử dụng tính năng educator
3. Yêu cầu educator sẽ tự động từ chối nếu user đã là educator hoặc admin
4. Cần phải có ít nhất một admin trong hệ thống
5. Admin có thể thủ công thay đổi vai trò người dùng bất kỳ
6. **Middleware `protectEducator` cho phép cả admin và educator truy cập**

## Troubleshooting

### Lỗi thường gặp
1. **"Admin access required"** - User không có quyền admin
2. **"You already have a pending request"** - Đã có yêu cầu pending
3. **"User not found"** - User ID không tồn tại

### Debug
- Kiểm tra Clerk Dashboard để xem metadata của user
- Kiểm tra database để xem educator requests
- Kiểm tra logs server để debug API calls