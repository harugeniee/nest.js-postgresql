# BaseGateway

BaseGateway là một abstract class cung cấp common functionality cho WebSocket gateways trong NestJS application.

## **🔑 Tính năng chính**

- **Connection Management**: Quản lý cả authenticated và anonymous connections
- **Client Tracking**: Theo dõi clients, metadata và room subscriptions
- **Room Management**: Join/leave rooms và broadcasting
- **Error Handling**: Xử lý lỗi với I18nWsExceptionFilter
- **Flexible Authentication**: Cho phép child gateway quyết định method nào cần auth

## **🚀 Cách sử dụng**

### **1. Extend BaseGateway**

```typescript
@WebSocketGateway()
export class MyGateway extends BaseGateway<MyMetadata, AuthPayload> {
  
  // Implement abstract methods
  protected async extractClientMetadata(
    client: Socket,
    authPayload: AuthPayload,
  ): Promise<MyMetadata> {
    // Extract metadata from authenticated client
    return {
      userId: authPayload.uid,
      permissions: authPayload.permissions,
    };
  }

  protected async sendConnectionConfirmation(
    client: Socket,
    metadata: MyMetadata,
    authPayload: AuthPayload,
  ): Promise<void> {
    client.emit('connected', { 
      message: 'Connected successfully',
      user: authPayload.uid 
    });
  }

  // Override connection hooks
  protected async onClientConnected(
    client: Socket,
    metadata: MyMetadata,
    authPayload: AuthPayload,
  ): Promise<void> {
    // Handle authenticated client connection
    this.logger.log(`User ${authPayload.uid} connected`);
  }

  protected async onAnonymousClientConnected(client: Socket): Promise<void> {
    // Handle anonymous client connection
    this.logger.log(`Anonymous client ${client.id} connected`);
  }
}
```

### **2. Authentication Strategies**

#### **Method Level Authentication (Recommended)**

```typescript
@WebSocketGateway()
export class QrGateway extends BaseGateway<Metadata, AuthPayload> {
  
  // Method cần JWT authentication
  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('qr_action')
  async handleQrAction(client: Socket, payload: any) {
    const user = this.getUser(client); // User đã được authenticate
    // Handle authenticated action
  }
  
  // Method KHÔNG cần JWT (anonymous)
  @SubscribeMessage('wait_qr_approval')
  async handleWaitQrApproval(client: Socket, payload: any) {
    // Anonymous client có thể gọi method này
    // Perfect cho QR login waiting
  }
  
  // Method cần JWT
  @UseGuards(WebSocketAuthGuard)
  @SubscribeMessage('authenticated_action')
  async handleAuthenticatedAction(client: Socket, payload: any) {
    const user = this.getUser(client);
    // Handle authenticated action
  }
}
```

#### **Class Level Authentication (Legacy)**

```typescript
@WebSocketGateway()
@UseGuards(WebSocketAuthGuard) // Tất cả methods đều cần JWT
export class SecureGateway extends BaseGateway<Metadata, AuthPayload> {
  // Tất cả methods đều yêu cầu authentication
}
```

## **🔧 Helper Methods**

### **Authentication Helpers**

```typescript
// Check if client is authenticated
const isAuth = this.isAuthenticated(client);

// Get authenticated user
const user = this.getUser(client);

// Check if specific client ID is authenticated
const isAuth = this.isClientAuthenticated(clientId);
const user = this.getClientAuthPayload(clientId);
```

### **Room Management**

```typescript
// Join room
await this.joinRoom(clientId, 'room_name', client);

// Leave room
await this.leaveRoom(clientId, 'room_name', client);

// Broadcast to room
await this.broadcastToRoom('room_name', 'event', data);

// Send to specific client
await this.sendToClient(clientId, 'event', data);
```

### **Connection Statistics**

```typescript
const stats = this.getConnectionStats();
console.log(`Total clients: ${stats.totalClients}`);
console.log(`Authenticated clients: ${stats.authenticatedClients}`);
console.log(`Total rooms: ${stats.totalRooms}`);
```

## **📋 Abstract Methods**

Child gateway **PHẢI** implement các methods sau:

### **extractClientMetadata**
```typescript
protected abstract extractClientMetadata(
  client: Socket,
  authPayload: U,
): Promise<T>;
```
- Extract metadata từ authenticated client
- Return metadata object

### **sendConnectionConfirmation**
```typescript
protected abstract sendConnectionConfirmation(
  client: Socket,
  metadata: T,
  authPayload: U,
): Promise<void>;
```
- Gửi confirmation message khi client connect
- Customize connection response

## **🎯 Optional Hooks**

Child gateway **CÓ THỂ** override các hooks sau:

### **onClientConnected**
```typescript
protected async onClientConnected(
  client: Socket,
  metadata: T,
  authPayload: U,
): Promise<void>
```
- Được gọi khi authenticated client connect thành công

### **onAnonymousClientConnected**
```typescript
protected async onAnonymousClientConnected(client: Socket): Promise<void>
```
- Được gọi khi anonymous client connect

### **onClientDisconnected**
```typescript
protected async onClientDisconnected(
  client: Socket,
  authPayload?: U,
): Promise<void>
```
- Được gọi khi client disconnect

## **💡 Best Practices**

1. **Sử dụng Method Level Authentication** thay vì Class Level
2. **Override hooks** để customize connection logic
3. **Sử dụng helper methods** thay vì truy cập trực tiếp properties
4. **Handle errors gracefully** trong custom methods
5. **Log important events** để debugging

## **🔒 Security Considerations**

- **Anonymous connections** có thể join rooms và nhận broadcasts
- **Sensitive operations** nên sử dụng `@UseGuards(WebSocketAuthGuard)`
- **Validate data** trong tất cả message handlers
- **Rate limiting** có thể cần thiết cho anonymous connections

## **📚 Examples**

Xem `src/common/gateways/base.gateway.ts` để biết cách implement cụ thể.
