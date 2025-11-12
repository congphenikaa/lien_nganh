# Authentication Setup Guide

## Vấn đề Authentication

Nếu bạn gặp vấn đề với authentication, hãy làm theo các bước sau:

## 1. Cấu hình Environment Variables

### Server (.env)
```bash
# Copy từ .env.example
cp .env.example .env
```

Điền các thông tin:
- `CLERK_WEBHOOK_SECRET`: Lấy từ Clerk Dashboard
- `MONGODB_URI`: Connection string MongoDB
- `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`: Thông tin MoMo

### Client (.env)
```bash
# Copy từ .env.example  
cp .env.example .env
```

Điền:
- `VITE_CLERK_PUBLISHABLE_KEY`: Publishable key từ Clerk Dashboard

## 2. Cài đặt Dependencies

### Server
```bash
cd server
npm install
```

### Client  
```bash
cd client
npm install
```

## 3. Kiểm tra Authentication

1. Khởi động server: `npm run server`
2. Khởi động client: `npm run dev`
3. Truy cập: `http://localhost:5173/test-auth`

Trang này sẽ hiển thị:
- Trạng thái authentication 
- Thông tin user
- Kết quả test các API endpoints

## 4. Debug Steps

### Nếu token không available:
1. Kiểm tra Clerk configuration trong `main.jsx`
2. Verify publishable key
3. Check browser network tab cho JWT token

### Nếu server lỗi:
1. Check server console logs
2. Test endpoint: `GET /test-auth`
3. Verify Clerk middleware setup

### Nếu API calls fail:
1. Check CORS settings
2. Verify Bearer token format
3. Test với Postman/curl

## 5. Troubleshooting

### Common Issues:

1. **"Missing Publishable Key"**
   - Thêm `VITE_CLERK_PUBLISHABLE_KEY` vào client/.env

2. **"Clerk middleware not working"**  
   - Check `@clerk/express` version
   - Verify server.js middleware order

3. **"User not authenticated"**
   - Login trước khi test
   - Check token expiration
   - Verify user session

4. **Database connection issues**
   - Check MongoDB connection string
   - Verify database permissions

## 6. Payment Flow

Sau khi fix authentication:

1. User tạo payment → `createMomoPayment`
2. MoMo redirect → `PaymentStatus` component  
3. Webhook xử lý → `momoWebhooks`
4. Update enrollment → Database update
5. User sees course → `MyEnrollments`

## Test URLs

- Auth Debug: `/test-auth`
- Payment Status: `/payment-status`
- My Enrollments: `/my-enrollments`
- Server Health: `GET /test-auth`