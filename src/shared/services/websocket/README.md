# WebSocket Service

A comprehensive WebSocket service for NestJS applications that provides real-time communication capabilities with support for rooms, private messaging, and broadcasting.

## Features

- 🔌 **Real-time Communication**: WebSocket connections with Socket.IO
- 👥 **Room Management**: Join/leave rooms for group communication
- 💬 **Private Messaging**: Direct messages between users
- 📡 **Broadcasting**: Send messages to all clients or specific rooms
- 🔐 **Authentication**: User authentication and connection management
- 📊 **Connection Monitoring**: Track active connections and rooms
- 🚀 **Scalable**: Built with performance and scalability in mind

## Installation

First, install the required dependencies:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install -D @types/socket.io
```

## Usage

### 1. Import the WebSocket Module

```typescript
import { WebSocketModule } from './shared/services/websocket';

@Module({
  imports: [WebSocketModule],
  // ... other module configuration
})
export class AppModule {}
```

### 2. Use the WebSocket Service

```typescript
import { WebSocketService } from './shared/services/websocket';

@Injectable()
export class NotificationService {
  constructor(private readonly webSocketService: WebSocketService) {}

  // Send notification to all users
  async sendGlobalNotification(message: string): Promise<void> {
    this.webSocketService.broadcastToAll('notification', {
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // Send notification to specific user
  async sendUserNotification(userId: string, message: string): Promise<void> {
    this.webSocketService.sendToUser(userId, 'notification', {
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // Send notification to specific room
  async sendRoomNotification(roomName: string, message: string): Promise<void> {
    this.webSocketService.broadcastToRoom(roomName, 'notification', {
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 3. Client-Side Connection

```javascript
import { io } from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
});

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected to WebSocket server:', data);
});

// Authenticate user
socket.emit('authenticate', { userId: 'user123' }, (response) => {
  if (response.success) {
    console.log('Authenticated successfully');
  }
});

// Join a room
socket.emit('join-room', { roomName: 'general' }, (response) => {
  if (response.success) {
    console.log('Joined room successfully');
  }
});

// Send private message
socket.emit('private-message', {
  targetUserId: 'user456',
  message: 'Hello!',
  messageType: 'text'
}, (response) => {
  if (response.success) {
    console.log('Message sent successfully');
  }
});

// Listen for messages
socket.on('private-message', (data) => {
  console.log('Received private message:', data);
});

// Listen for room events
socket.on('user-joined', (data) => {
  console.log('User joined room:', data);
});

socket.on('user-left', (data) => {
  console.log('User left room:', data);
});

// Keep-alive ping
setInterval(() => {
  socket.emit('ping');
}, 30000); // Every 30 seconds

socket.on('pong', (data) => {
  console.log('Pong received:', data);
});
```

## API Reference

### WebSocketService Methods

#### Broadcasting

- `broadcastToAll(event: string, data: unknown, options?: BroadcastOptions)`: Broadcast to all connected clients
- `broadcastToRoom(roomName: string, event: string, data: unknown, options?: BroadcastOptions)`: Broadcast to specific room
- `sendToUser(userId: string, event: string, data: unknown)`: Send message to specific user
- `sendToSocket(socketId: string, event: string, data: unknown)`: Send message to specific socket

#### Connection Management

- `getActiveConnections()`: Get all active connections
- `getActiveRooms()`: Get all active rooms
- `getConnectionCount()`: Get total connection count
- `getRoomCount()`: Get total room count
- `getUserConnections(userId: string)`: Get user's active connections
- `isUserOnline(userId: string)`: Check if user is online

### WebSocket Events

#### Client to Server

- `authenticate`: Authenticate user with userId
- `join-room`: Join a specific room
- `leave-room`: Leave a specific room
- `private-message`: Send private message to another user
- `custom-event`: Send custom event with data
- `ping`: Keep-alive ping

#### Server to Client

- `connected`: Connection established
- `authenticated`: Authentication successful
- `room-joined`: Successfully joined room
- `room-left`: Successfully left room
- `user-joined`: Another user joined the room
- `user-left`: Another user left the room
- `private-message`: Received private message
- `message-sent`: Private message sent confirmation
- `user-online`: User came online
- `pong`: Response to ping
- `error`: Error message

## Configuration

The WebSocket service can be configured through environment variables:

```env
# CORS origin for WebSocket connections
CORS_ORIGIN=http://localhost:3000

# WebSocket namespace (default: '/')
WEBSOCKET_NAMESPACE=/

# WebSocket transports (default: websocket,polling)
WEBSOCKET_TRANSPORTS=websocket,polling
```

## Room Management

Rooms are automatically created when users join and deleted when they become empty. This provides efficient memory management and automatic cleanup.

### Room Features

- **Automatic Creation**: Rooms are created when first user joins
- **Automatic Cleanup**: Rooms are deleted when last user leaves
- **User Tracking**: Track which users are in which rooms
- **Activity Monitoring**: Monitor room activity and last activity time

## Private Messaging

Private messaging allows direct communication between users without going through rooms.

### Message Types

- `text`: Plain text messages
- `image`: Image messages (URLs or base64)
- `file`: File messages (URLs or file data)
- `notification`: System notifications

## Error Handling

The service includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection handling
- **Validation Errors**: Input validation with descriptive error messages
- **Authentication Errors**: Proper error responses for failed authentication
- **Room Errors**: Validation for room operations

## Performance Considerations

- **Connection Pooling**: Efficient connection management
- **Memory Management**: Automatic cleanup of disconnected users and empty rooms
- **Scalability**: Built to handle multiple concurrent connections
- **Keep-alive**: Ping/pong mechanism to detect stale connections

## Security Features

- **CORS Configuration**: Configurable CORS settings
- **Input Validation**: Comprehensive input validation
- **Authentication**: User authentication system
- **Rate Limiting**: Built-in rate limiting capabilities

## Examples

### Chat Application

```typescript
@Injectable()
export class ChatService {
  constructor(private readonly webSocketService: WebSocketService) {}

  // Send message to chat room
  async sendChatMessage(roomName: string, userId: string, message: string): Promise<void> {
    this.webSocketService.broadcastToRoom(roomName, 'chat-message', {
      userId,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  // Notify user typing
  async notifyTyping(roomName: string, userId: string): Promise<void> {
    this.webSocketService.broadcastToRoom(roomName, 'user-typing', {
      userId,
      timestamp: new Date().toISOString(),
    }, { exclude: [userId] });
  }
}
```

### Notification System

```typescript
@Injectable()
export class NotificationService {
  constructor(private readonly webSocketService: WebSocketService) {}

  // Send system notification
  async sendSystemNotification(message: string, userIds?: string[]): Promise<void> {
    if (userIds) {
      // Send to specific users
      userIds.forEach(userId => {
        this.webSocketService.sendToUser(userId, 'system-notification', {
          message,
          timestamp: new Date().toISOString(),
        });
      });
    } else {
      // Send to all users
      this.webSocketService.broadcastToAll('system-notification', {
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check CORS settings and server configuration
2. **Authentication Issues**: Verify userId format and authentication logic
3. **Room Join Failures**: Ensure room names are valid strings
4. **Message Delivery**: Check if target user is online and authenticated

### Debug Mode

Enable debug logging by setting the environment variable:

```env
NODE_ENV=development
```

This will provide detailed logging for WebSocket operations.

## Contributing

When contributing to the WebSocket service:

1. Follow the existing code style and patterns
2. Add comprehensive error handling
3. Include proper TypeScript types
4. Add unit tests for new functionality
5. Update documentation for new features

## License

This WebSocket service is part of the NestJS PostgreSQL project and follows the same licensing terms.
