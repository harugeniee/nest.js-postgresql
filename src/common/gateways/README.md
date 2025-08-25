# WebSocket Gateway với JWT Authentication

## Tổng quan

`BaseGateway` cung cấp một foundation hoàn chỉnh cho việc xây dựng WebSocket gateway với JWT authentication. **Điểm đặc biệt**: Nó có thể tái sử dụng logic authentication từ `AuthGuard` hiện có, đảm bảo tính nhất quán giữa HTTP và WebSocket.

## Tính năng chính

- ✅ **JWT Authentication** - Xác thực client bằng JWT token
- ✅ **AuthGuard Integration** - Tái sử dụng logic từ `JwtAccessTokenGuard`
- ✅ **Connection Management** - Quản lý kết nối với user context
- ✅ **Room Management** - Quản lý phòng với authentication
- ✅ **Event Broadcasting** - Gửi tin nhắn đến phòng hoặc client cụ thể
- ✅ **Error Handling** - Xử lý lỗi tập trung
- ✅ **Logging** - Logging pattern nhất quán
- ✅ **Statistics** - Thống kê kết nối với thông tin authentication

## Cách sử dụng

### 1. Sử dụng AuthGuard có sẵn (Khuyến nghị)

```typescript
@WebSocketGateway({ namespace: 'my-feature' })
export class MyGateway extends BaseGateway<
  { userId: string; permissions: string[] }, // Client metadata type
  AuthPayload // JWT payload type
> {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly myService: MyService,
  ) {
    super();
    // Sử dụng AuthGuard có sẵn thay vì custom authentication
    this.useCustomAuthentication = false;
  }

  // Implement abstract methods để cung cấp services
  protected getJwtService(): JwtService {
    return this.jwtService;
  }

  protected getCacheService(): CacheService {
    return this.cacheService;
  }

  protected getConfigService(): ConfigService {
    return this.configService;
  }

  // Implement các method bắt buộc
  protected async extractClientMetadata(
    client: Socket,
    authPayload: AuthPayload,
  ): Promise<{ userId: string; permissions: string[] }> {
    return {
      userId: authPayload.uid,
      permissions: authPayload.permissions || [],
    };
  }

  protected async sendConnectionConfirmation(
    client: Socket,
    metadata: { userId: string; permissions: string[] },
    authPayload: AuthPayload,
  ): Promise<void> {
    client.emit('connected', {
      userId: metadata.userId,
      permissions: metadata.permissions,
      message: 'Successfully connected',
    });
  }
}
```

### 2. Sử dụng Custom Authentication (Nếu cần)

```typescript
@WebSocketGateway({ namespace: 'my-feature' })
export class MyCustomGateway extends BaseGateway<
  { userId: string; customField: string },
  AuthPayload
> {
  constructor(
    private readonly jwtService: JwtService,
    private readonly myService: MyService,
  ) {
    super();
    // Sử dụng custom authentication
    this.useCustomAuthentication = true;
  }

  // Override authentication method
  protected async authenticateClient(client: Socket): Promise<AuthPayload | null> {
    // Custom authentication logic
    const token = (client.handshake.auth as { token?: string })?.token;
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload?.uid ? payload : null;
    } catch {
      return null;
    }
  }

  // Implement các method khác...
}
```

### 3. Client kết nối với JWT token

```javascript
// Client-side JavaScript
const socket = io('ws://localhost:3000/my-feature', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

socket.on('connected', (data) => {
  console.log('Connected as user:', data.userId);
  console.log('Permissions:', data.permissions);
});

socket.on('auth:error', (error) => {
  console.error('Authentication failed:', error.message);
});
```

### 4. Sử dụng các method có sẵn

```typescript
// Join room (chỉ authenticated clients)
await this.joinRoom(clientId, 'room-name', client);

// Leave room
await this.leaveRoom(clientId, 'room-name', client);

// Broadcast to room
await this.broadcastToRoom('room-name', 'event-name', data);

// Send to specific client
await this.sendToClient(clientId, 'event-name', data);

// Check authentication status
const isAuth = this.isClientAuthenticated(clientId);
const authPayload = this.getClientAuthPayload(clientId);

// Get statistics
const stats = this.getConnectionStats();
```

## Tích hợp với AuthGuard hiện có

### Lợi ích của việc tái sử dụng AuthGuard:

1. **Tính nhất quán** - Cùng logic JWT verification cho HTTP và WebSocket
2. **Cache validation** - Tự động kiểm tra token trong cache (nếu sử dụng `JwtAccessTokenGuard`)
3. **Error handling** - Cùng pattern xử lý lỗi
4. **Maintenance** - Chỉ cần update một chỗ khi thay đổi logic authentication
5. **Testing** - Có thể reuse test cases từ HTTP guards

### Cách hoạt động:

1. **Client kết nối** với JWT token trong `handshake.auth.token`
2. **BaseGateway** tạo mock execution context
3. **WebSocketAuthGuard** verify JWT token sử dụng logic từ `AuthGuard`
4. **Nếu valid** - Client được authenticate và có thể join room
5. **Nếu invalid** - Client bị disconnect với error message

## Cấu trúc JWT Payload

JWT payload phải có ít nhất một trong các field sau để `getUserId()` hoạt động:

```typescript
interface AuthPayload {
  uid: string;        // User ID (required)
  userId?: string;    // Alternative user ID field
  email?: string;     // User email
  permissions?: string[]; // User permissions
  roles?: string[];   // User roles
  // ... other fields
}
```

## Error Handling

Gateway tự động xử lý các trường hợp lỗi:

- **Authentication failed** - Client bị disconnect với error message
- **Invalid JWT** - Token không hợp lệ
- **Missing token** - Không có token trong handshake auth
- **Cache validation failed** - Token hết hạn hoặc bị revoke
- **Connection errors** - Lỗi kết nối được log và xử lý

## Security Features

- **JWT validation** - Mỗi connection đều được xác thực
- **Cache validation** - Kiểm tra token trong cache (nếu sử dụng `JwtAccessTokenGuard`)
- **Room access control** - Chỉ authenticated clients mới có thể join room
- **User isolation** - Mỗi client được track với user context riêng biệt
- **Permission tracking** - Permissions được extract và store

## Monitoring & Debugging

```typescript
// Get connection statistics
const stats = this.getConnectionStats();
console.log('Total clients:', stats.totalClients);
console.log('Authenticated clients:', stats.authenticatedClients);
console.log('Total rooms:', stats.totalRooms);

// Get user-specific information
const userRooms = this.getUserSubscribedTickets(userId);
const roomClients = this.getAuthenticatedClientsInRoom(roomName);

// Check authentication status
const isAuth = this.isClientAuthenticated(clientId);
const authPayload = this.getClientAuthPayload(clientId);
```

## Best Practices

1. **Sử dụng AuthGuard có sẵn** - Đảm bảo tính nhất quán với HTTP endpoints
2. **Always validate JWT** - Không bao giờ bỏ qua authentication
3. **Handle errors gracefully** - Luôn có fallback cho authentication failures
4. **Log authentication events** - Track successful/failed connections
5. **Use room-based isolation** - Separate different user contexts
6. **Implement reconnection logic** - Handle token expiration gracefully

## Example Implementation

### Sử dụng AuthGuard (Khuyến nghị):
Xem `QrGateway` trong `src/qr/qr.gateway.ts`

### Sử dụng Custom Authentication:
Xem ví dụ trong phần "Sử dụng Custom Authentication" ở trên

## Migration từ Custom Authentication

Nếu bạn đã có gateway với custom authentication, migration rất đơn giản:

```typescript
// Trước (Custom authentication)
export class MyGateway extends BaseGateway {
  protected async authenticateClient(client: Socket): Promise<AuthPayload | null> {
    // Custom logic...
  }
}

// Sau (Sử dụng AuthGuard)
export class MyGateway extends BaseGateway {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.useCustomAuthentication = false; // Sử dụng AuthGuard
  }

  // Implement các method bắt buộc
  protected getJwtService() { return this.jwtService; }
  protected getCacheService() { return this.cacheService; }
  protected getConfigService() { return this.configService; }
  
  // Xóa authenticateClient method - không cần nữa!
}
```
