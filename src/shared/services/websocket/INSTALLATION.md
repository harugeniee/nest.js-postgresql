# WebSocket Service Installation Guide

## Required Dependencies

To use the WebSocket service, you need to install the following packages:

### Core Dependencies

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Development Dependencies

```bash
npm install -D @types/socket.io
```

## Alternative Installation Methods

### Using Yarn

```bash
yarn add @nestjs/websockets @nestjs/platform-socket.io socket.io
yarn add -D @types/socket.io
```

### Using PNPM

```bash
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add -D @types/socket.io
```

## Package Versions

The service is compatible with the following versions:

- `@nestjs/websockets`: ^11.0.0 (for NestJS 11)
- `@nestjs/platform-socket.io`: ^11.0.0 (for NestJS 11)
- `socket.io`: ^4.7.0
- `@types/socket.io`: ^3.0.0

## Verification

After installation, verify that the packages are correctly installed:

```bash
npm list @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## Next Steps

1. Install the dependencies using one of the commands above
2. Import `WebSocketModule` in your `AppModule`
3. Use the `WebSocketService` in your application
4. Refer to the README.md for usage examples

## Troubleshooting

If you encounter any issues during installation:

1. **Clear npm cache**: `npm cache clean --force`
2. **Delete node_modules**: `rm -rf node_modules && npm install`
3. **Check Node.js version**: Ensure you're using Node.js 18+ and NestJS 11
4. **Check package-lock.json conflicts**: Delete package-lock.json and reinstall

## Environment Variables

Add these environment variables to your `.env` file:

```env
# CORS origin for WebSocket connections
CORS_ORIGIN=http://localhost:3000

# WebSocket namespace (optional, default: '/')
WEBSOCKET_NAMESPACE=/

# WebSocket transports (optional, default: websocket,polling)
WEBSOCKET_TRANSPORTS=websocket,polling
```
