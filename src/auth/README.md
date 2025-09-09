# Auth Module - OTP Login Feature

## Overview
Tính năng đăng nhập bằng OTP qua email được tích hợp trực tiếp vào `AuthService` hiện có, không tạo service riêng biệt.

## Cấu trúc

### Controllers
- `AuthController` - Chứa tất cả endpoints auth bao gồm OTP

### Services  
- `AuthService` - Service chính xử lý tất cả logic authentication (password + OTP)

### Providers
- `RedisOtpStore` - Lưu trữ OTP data trong Redis với atomic operations
- `MailerEmailOtpSender` - Gửi email OTP sử dụng MailService có sẵn

### DTOs
- `OtpRequestDto` - Request OTP
- `OtpVerifyDto` - Verify OTP

### Interfaces
- `OtpData` - Cấu trúc dữ liệu OTP
- `OtpStore` - Interface cho OTP storage
- `EmailOtpSender` - Interface cho email sending

## API Endpoints

### OTP Request
```
POST /auth/otp/request
{
  "email": "user@example.com"
}
```

### OTP Verify
```
POST /auth/otp/verify
{
  "email": "user@example.com", 
  "code": "123456",
  "requestId": "otp_1234567890_abc123"
}
```

## Configuration
- OTP Length: 6 digits
- TTL: 5 minutes
- Max Attempts: 5
- Store: Redis với prefix `otp:login:`

## Security Features
- Email masking trong logs
- Rate limiting cho email
- One-time use OTP
- Atomic operations với Redis Lua scripts
- Không tiết lộ email có tồn tại hay không
