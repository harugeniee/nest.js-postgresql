# Permission Decorator Implementation Guide

## Tổng quan

`@RequirePermissions` decorator được triển khai trong `ArticlesController` để kiểm soát quyền truy cập các endpoint dựa trên hệ thống phân quyền bitfield của Discord-style.

## Cách triển khai trong ArticlesController

### 1. Import Decorator

```typescript
import { Auth, RequirePermissions } from 'src/common/decorators';
```

### 2. Các Endpoint và Quyền hạn

#### **POST /articles** - Tạo bài viết
```typescript
@RequirePermissions({ all: ['ARTICLE_CREATE'] })
```
- **Mục đích**: Chỉ những user có quyền `ARTICLE_CREATE` mới có thể tạo bài viết
- **Logic**: Phải có quyền `ARTICLE_CREATE` (AND operation)

#### **GET /articles** - Xem danh sách bài viết
```typescript
@RequirePermissions({
  any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
  none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish, không cần quyền tạo
})
```
- **Mục đích**: 
  - User có quyền `ARTICLE_VIEW_DRAFTS` hoặc `ARTICLE_MANAGE_ALL` có thể xem tất cả bài viết (kể cả draft)
  - User không có quyền `ARTICLE_CREATE` chỉ xem được bài viết đã publish
- **Logic**: (ARTICLE_VIEW_DRAFTS OR ARTICLE_MANAGE_ALL) AND NOT ARTICLE_CREATE

#### **GET /articles/cursor** - Xem danh sách với cursor pagination
```typescript
@RequirePermissions({
  any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
  none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish, không cần quyền tạo
})
```
- **Logic**: Tương tự như GET /articles

#### **GET /articles/:id** - Xem chi tiết bài viết
```typescript
@RequirePermissions({
  any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
  none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish, không cần quyền tạo
})
```
- **Logic**: Tương tự như GET /articles

#### **PATCH /articles/:id** - Cập nhật bài viết
```typescript
@RequirePermissions({
  all: ['ARTICLE_EDIT'],
  any: ['ARTICLE_MANAGE_ALL'], // Admin có thể edit tất cả bài viết
})
```
- **Mục đích**: 
  - User có quyền `ARTICLE_EDIT` có thể edit bài viết của mình
  - Admin có quyền `ARTICLE_MANAGE_ALL` có thể edit tất cả bài viết
- **Logic**: ARTICLE_EDIT AND (ARTICLE_MANAGE_ALL OR ownership check)

#### **PATCH /articles/:id/publish** - Publish bài viết
```typescript
@RequirePermissions({
  all: ['ARTICLE_PUBLISH'],
  any: ['ARTICLE_MANAGE_ALL'], // Admin có thể publish tất cả bài viết
})
```
- **Mục đích**: Chỉ user có quyền `ARTICLE_PUBLISH` hoặc admin mới có thể publish bài viết
- **Logic**: ARTICLE_PUBLISH AND (ARTICLE_MANAGE_ALL OR ownership check)

#### **PATCH /articles/:id/unpublish** - Unpublish bài viết
```typescript
@RequirePermissions({
  all: ['ARTICLE_PUBLISH'],
  any: ['ARTICLE_MANAGE_ALL'], // Admin có thể unpublish tất cả bài viết
})
```
- **Logic**: Tương tự như publish

#### **DELETE /articles/:id** - Xóa bài viết
```typescript
@RequirePermissions({
  all: ['ARTICLE_DELETE'],
  any: ['ARTICLE_MANAGE_ALL'], // Admin có thể xóa tất cả bài viết
})
```
- **Mục đích**: Chỉ user có quyền `ARTICLE_DELETE` hoặc admin mới có thể xóa bài viết
- **Logic**: ARTICLE_DELETE AND (ARTICLE_MANAGE_ALL OR ownership check)

## Các Pattern Sử Dụng

### 1. **Simple Permission Check**
```typescript
@RequirePermissions({ all: ['ARTICLE_CREATE'] })
```
- Kiểm tra user phải có quyền cụ thể

### 2. **OR Logic**
```typescript
@RequirePermissions({ any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'] })
```
- User có thể có một trong các quyền được liệt kê

### 3. **AND Logic**
```typescript
@RequirePermissions({ all: ['ARTICLE_EDIT'] })
```
- User phải có tất cả quyền được liệt kê

### 4. **Complex Logic**
```typescript
@RequirePermissions({
  all: ['ARTICLE_EDIT'],
  any: ['ARTICLE_MANAGE_ALL'],
  none: ['BANNED_USER']
})
```
- User phải có `ARTICLE_EDIT` AND (`ARTICLE_MANAGE_ALL` OR ownership) AND không bị ban

### 5. **Exclusion Logic**
```typescript
@RequirePermissions({
  any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
  none: ['ARTICLE_CREATE']
})
```
- User có thể xem draft HOẶC có quyền admin, NHƯNG không được có quyền tạo bài viết

## Quyền hạn theo Role

### **OWNER** (Tất cả quyền)
- `ARTICLE_CREATE`, `ARTICLE_EDIT`, `ARTICLE_DELETE`, `ARTICLE_PUBLISH`, `ARTICLE_VIEW_DRAFTS`, `ARTICLE_MANAGE_ALL`

### **ADMIN** (Quyền quản lý)
- `ARTICLE_CREATE`, `ARTICLE_EDIT`, `ARTICLE_PUBLISH`, `ARTICLE_VIEW_DRAFTS`, `ARTICLE_MANAGE_ALL`

### **MEMBER** (Quyền cơ bản)
- `ARTICLE_CREATE`, `ARTICLE_EDIT`

## Lợi ích của Implementation

### 1. **Granular Control**
- Kiểm soát chi tiết từng hành động
- Phân biệt quyền xem draft vs published content

### 2. **Flexible Logic**
- Hỗ trợ AND/OR/NOT operations
- Có thể kết hợp nhiều điều kiện phức tạp

### 3. **Role-based Access**
- Dễ dàng phân quyền theo vai trò
- Admin có thể override các quyền hạn thông thường

### 4. **Security**
- Ngăn chặn unauthorized access
- Kiểm tra quyền ở controller level

### 5. **Maintainability**
- Code rõ ràng, dễ hiểu
- Dễ dàng thay đổi quyền hạn mà không ảnh hưởng business logic

## Best Practices

### 1. **Luôn kết hợp với @Auth()**
```typescript
@Auth()
@RequirePermissions({ all: ['ARTICLE_CREATE'] })
```

### 2. **Sử dụng comments để giải thích logic phức tạp**
```typescript
@RequirePermissions({
  any: ['ARTICLE_VIEW_DRAFTS', 'ARTICLE_MANAGE_ALL'],
  none: ['ARTICLE_CREATE'], // Chỉ xem được bài viết đã publish
})
```

### 3. **Kiểm tra ownership trong service layer**
- Decorator chỉ kiểm tra quyền hạn
- Service layer kiểm tra ownership và business rules

### 4. **Sử dụng consistent naming**
- Tất cả permission names đều có prefix `ARTICLE_`
- Dễ dàng identify và maintain

## Kết luận

Việc triển khai `@RequirePermissions` trong `ArticlesController` cung cấp một hệ thống phân quyền linh hoạt và mạnh mẽ, đảm bảo security và maintainability cho ứng dụng. Pattern này có thể được áp dụng cho các controller khác trong hệ thống.
