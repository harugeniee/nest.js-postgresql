# Cloudflare R2 Integration

Tài liệu này mô tả cách tích hợp Cloudflare R2 vào MediaService để lưu trữ và quản lý file.

## 🚀 Tổng quan

Cloudflare R2 là một object storage service tương thích với S3 API, cung cấp:
- **Không có egress fees** - Tiết kiệm chi phí bandwidth
- **Global CDN** - Tốc độ truy cập nhanh toàn cầu
- **S3-compatible API** - Dễ dàng tích hợp
- **Unlimited storage** - Không giới hạn dung lượng

## 📋 Cài đặt

### 1. Cài đặt dependencies

```bash
yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Cấu hình Environment Variables

Thêm các biến môi trường sau vào file `.env`:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-r2-bucket-name
R2_REGION=auto

# R2 Public URL (Custom domain hoặc R2.dev subdomain)
R2_PUBLIC_URL=https://your-custom-domain.com
# Hoặc sử dụng R2.dev subdomain: https://your-bucket-name.your-account-id.r2.cloudflarestorage.com

# Upload settings
R2_MAX_FILE_SIZE=104857600
R2_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,application/pdf,text/plain

# Cache settings
R2_CACHE_CONTROL=public, max-age=31536000
R2_EXPIRES=31536000

# CDN settings (optional)
R2_CDN_ENABLED=false
R2_CDN_URL=https://your-cdn-domain.com

# Security settings
R2_PRESIGNED_URL_EXPIRY=3600
R2_CORS_ENABLED=true

# Image processing settings (optional)
R2_IMAGE_PROCESSING_ENABLED=false
R2_IMAGE_QUALITY=85
R2_IMAGE_FORMAT=webp
```

### 3. Tạo R2 Bucket

1. Đăng nhập vào Cloudflare Dashboard
2. Vào R2 Object Storage
3. Tạo bucket mới
4. Cấu hình CORS nếu cần
5. Tạo API Token với quyền R2:Object:Read và R2:Object:Write

## 🏗️ Kiến trúc

### R2Service

Service chính để tương tác với Cloudflare R2:

```typescript
@Injectable()
export class R2Service {
  // Upload file
  async uploadFile(file: Buffer | Readable, options: UploadOptions): Promise<UploadResult>
  
  // Download file
  async downloadFile(key: string): Promise<Readable>
  
  // Delete file
  async deleteFile(key: string): Promise<void>
  
  // Generate presigned URLs
  async generatePresignedUploadUrl(key: string, options: PresignedUrlOptions): Promise<string>
  async generatePresignedDownloadUrl(key: string, expiresIn: number): Promise<string>
  
  // File operations
  async getFileMetadata(key: string): Promise<any>
  async fileExists(key: string): Promise<boolean>
  async listFiles(prefix: string, maxKeys: number): Promise<string[]>
}
```

### MediaService Integration

MediaService được tích hợp với R2Service:

```typescript
@Injectable()
export class MediaService extends BaseService<Media> {
  constructor(
    private readonly r2Service: R2Service,
    // ... other dependencies
  ) {}

  // Upload media files
  async uploadMedia(files: Array<Express.Multer.File>): Promise<Media[]>
  
  // Generate presigned URLs
  async generatePresignedUploadUrl(filename: string, contentType: string): Promise<{presignedUrl: string, key: string, publicUrl: string}>
  async generatePresignedDownloadUrl(id: string, expiresIn: number): Promise<string>
  
  // File operations
  async getMediaFileStream(id: string): Promise<Readable>
  async checkMediaFileExists(id: string): Promise<boolean>
  async getMediaFileMetadata(id: string): Promise<any>
}
```

## 🔧 Sử dụng

### 1. Upload File qua API

```bash
# Upload multiple files
POST /media/upload
Content-Type: multipart/form-data

# Form data:
files: [file1, file2, ...]
description: "Media description"
altText: "Alt text for accessibility"
```

### 2. Upload File qua Presigned URL

```bash
# 1. Lấy presigned URL
POST /media/presigned-upload
Content-Type: application/json

{
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "contentLength": 1024000
}

# Response:
{
  "success": true,
  "data": {
    "presignedUrl": "https://bucket.r2.cloudflarestorage.com/...",
    "key": "media/1234567890_123456789.jpg",
    "publicUrl": "https://your-domain.com/media/1234567890_123456789.jpg"
  }
}

# 2. Upload trực tiếp lên R2
PUT {presignedUrl}
Content-Type: image/jpeg
Content-Length: 1024000

[file content]
```

### 3. Download File

```bash
# Lấy presigned download URL
GET /media/{id}/presigned-download?expiresIn=3600

# Response:
{
  "success": true,
  "data": {
    "presignedUrl": "https://bucket.r2.cloudflarestorage.com/...",
    "expiresIn": 3600
  }
}

# Hoặc stream trực tiếp
GET /media/{id}/stream
```

### 4. Quản lý Media

```bash
# Lấy danh sách media
GET /media?page=1&limit=10&type=image&search=profile

# Lấy media theo ID
GET /media/{id}

# Cập nhật media
PATCH /media/{id}
{
  "title": "New title",
  "description": "New description",
  "isPublic": true
}

# Xóa media (soft delete)
DELETE /media/{id}

# Activate/Deactivate media
POST /media/{id}/activate
POST /media/{id}/deactivate
```

## 📁 Cấu trúc File

### Folder Organization

```
r2-bucket/
├── media/                    # Original files
│   ├── 1234567890_123456789.jpg
│   ├── 1234567891_123456790.mp4
│   └── ...
├── thumbnails/              # Image thumbnails
│   ├── media/
│   │   ├── 1234567890_123456789_small.jpg
│   │   ├── 1234567890_123456789_medium.jpg
│   │   └── 1234567890_123456789_large.jpg
│   └── ...
├── previews/                # File previews
│   ├── media/
│   │   ├── 1234567890_123456789_preview.jpg
│   │   └── ...
│   └── ...
└── temp/                    # Temporary files
    └── ...
```

### File Naming Convention

- **Original files**: `{timestamp}_{random}.{extension}`
- **Thumbnails**: `{original_name}_{size}.{extension}`
- **Previews**: `{original_name}_preview.{extension}`

## 🔒 Bảo mật

### 1. CORS Configuration

Cấu hình CORS cho R2 bucket:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2. Presigned URLs

- **Upload URLs**: Có thời hạn ngắn (1-2 giờ)
- **Download URLs**: Có thể cấu hình thời hạn linh hoạt
- **Content-Type validation**: Kiểm tra MIME type
- **Content-Length validation**: Kiểm tra kích thước file

### 3. Access Control

- **Private by default**: Files không public trừ khi được cấu hình
- **User-based access**: Chỉ owner có thể xóa/sửa
- **Admin override**: Admin có thể quản lý tất cả files

## 📊 Monitoring & Logging

### 1. R2 Metrics

- **Storage usage**: Dung lượng sử dụng
- **Request count**: Số lượng requests
- **Error rate**: Tỷ lệ lỗi
- **Latency**: Thời gian phản hồi

### 2. Application Logs

```typescript
// R2Service logs
this.logger.log(`File uploaded successfully: ${key}`);
this.logger.error('Failed to upload file to R2:', error);

// MediaService logs
this.logger.log(`Media uploaded: ${media.id}`);
this.logger.warn(`Failed to delete thumbnail for media ${id}:`, error);
```

## 🚀 Performance Optimization

### 1. CDN Integration

```env
R2_CDN_ENABLED=true
R2_CDN_URL=https://your-cdn-domain.com
```

### 2. Caching

```env
R2_CACHE_CONTROL=public, max-age=31536000
R2_EXPIRES=31536000
```

### 3. Image Processing

```env
R2_IMAGE_PROCESSING_ENABLED=true
R2_IMAGE_QUALITY=85
R2_IMAGE_FORMAT=webp
```

## 🐛 Troubleshooting

### 1. Common Issues

**Upload fails:**
- Kiểm tra R2 credentials
- Kiểm tra bucket permissions
- Kiểm tra file size limits

**Download fails:**
- Kiểm tra file key
- Kiểm tra presigned URL expiry
- Kiểm tra CORS configuration

**CORS errors:**
- Cấu hình CORS cho R2 bucket
- Kiểm tra allowed origins
- Kiểm tra allowed methods

### 2. Debug Mode

```typescript
// Enable debug logging
this.logger.debug('R2 upload details:', {
  key,
  size: file.length,
  contentType: file.mimetype,
  bucket: this.config.bucketName
});
```

## 📚 API Reference

### MediaController Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/media/upload` | Upload multiple files |
| GET | `/media` | List media with pagination |
| GET | `/media/:id` | Get media by ID |
| PATCH | `/media/:id` | Update media metadata |
| DELETE | `/media/:id` | Delete media (soft delete) |
| POST | `/media/:id/activate` | Activate media |
| POST | `/media/:id/deactivate` | Deactivate media |
| POST | `/media/presigned-upload` | Generate presigned upload URL |
| GET | `/media/:id/presigned-download` | Generate presigned download URL |
| GET | `/media/:id/stream` | Stream media file |
| GET | `/media/:id/metadata` | Get file metadata from R2 |
| GET | `/media/:id/exists` | Check if file exists in R2 |

## 🔄 Migration từ Local Storage

Nếu bạn đang sử dụng local storage và muốn migrate sang R2:

1. **Backup existing files**
2. **Update MediaService** để sử dụng R2Service
3. **Run migration script** để upload files lên R2
4. **Update URLs** trong database
5. **Test thoroughly** trước khi deploy

## 📈 Cost Optimization

### 1. Storage Classes

- **Standard**: Cho files thường xuyên truy cập
- **Infrequent Access**: Cho files ít truy cập
- **Archive**: Cho files lưu trữ dài hạn

### 2. Lifecycle Policies

```json
{
  "Rules": [
    {
      "ID": "ArchiveOldFiles",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "INFREQUENT_ACCESS"
        },
        {
          "Days": 90,
          "StorageClass": "ARCHIVE"
        }
      ]
    }
  ]
}
```

## 🎯 Best Practices

1. **Use presigned URLs** cho uploads lớn
2. **Implement retry logic** cho failed uploads
3. **Use CDN** cho better performance
4. **Monitor costs** và optimize storage
5. **Implement cleanup** cho temporary files
6. **Use appropriate MIME types** cho better caching
7. **Implement file validation** trước khi upload
8. **Use compression** cho images và videos
