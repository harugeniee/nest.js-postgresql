# QR Actions Feature

## Overview

The QR Actions feature enables secure, one-time actions via QR codes with real-time status updates. It supports login, adding friends, joining organizations, and device pairing through a secure PKCE-based flow.

## Supported Actions

- **LOGIN**: Web client login via mobile approval
- **ADD_FRIEND**: Add friend to user's network
- **JOIN_ORG**: Join organization with role assignment
- **PAIR**: Device pairing and key exchange

## Architecture

The feature consists of:
- **QrModule**: Main module orchestrating all components
- **QrService**: Core business logic for ticket management
- **QrGateway**: WebSocket gateway for real-time updates
- **QrController**: REST API endpoints
- **Action Executors**: Pluggable action implementations
- **Redis Cache**: Ephemeral state management

## Security Features

- **PKCE (Proof Key for Code Exchange)**: Prevents replay attacks
- **One-time tickets**: Each ticket can only be used once
- **Short TTL**: Tickets expire in 2-5 minutes, grants in 30 seconds
- **JWT authentication**: Mobile users must be authenticated to approve actions
- **Rate limiting**: IP-based rate limiting on sensitive endpoints

## API Endpoints

### Public Endpoints

#### Create Ticket
```http
POST /qr/tickets
Content-Type: application/json

{
  "type": "LOGIN",
  "payload": {
    "redirectUrl": "https://example.com/dashboard"
  },
  "webSessionId": "session_123"
}
```

#### Get Ticket Preview
```http
GET /qr/tickets/{ticketId}
```

### Protected Endpoints (JWT Required)

#### Mark Ticket as Scanned
```http
POST /qr/tickets/{ticketId}/scan
Authorization: Bearer {jwt_token}
```

#### Approve Ticket
```http
POST /qr/tickets/{ticketId}/approve
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "codeVerifier": "base64url_encoded_verifier"
}
```

#### Reject Ticket
```http
POST /qr/tickets/{ticketId}/reject
Authorization: Bearer {jwt_token}
```

#### Exchange Grant for Tokens
```http
POST /auth/qr/grant
Content-Type: application/json

{
  "tid": "ticket_id",
  "grantToken": "grant_token"
}
```

### Utility Endpoints

#### Get Statistics
```http
GET /qr/stats
```

#### Get Supported Actions
```http
GET /qr/actions
```

#### Health Check
```http
GET /qr/health
```

## WebSocket Events

### Client Events

- `qr:subscribe`: Subscribe to ticket status updates
- `qr:unsubscribe`: Unsubscribe from updates

### Server Events

- `qr:status:update`: Real-time status updates

## Complete Flow Example

### 1. Web Client Creates Ticket

```bash
curl -X POST http://localhost:3000/qr/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "type": "LOGIN",
    "payload": {
      "redirectUrl": "https://example.com/dashboard"
    },
    "webSessionId": "web_session_123"
  }'
```

**Response:**
```json
{
  "ticketId": "base64url_ticket_id",
  "codeChallenge": "base64url_code_challenge",
  "qrContent": "app://qr?tid=...&cc=...",
  "status": "PENDING"
}
```

### 2. Web Client Opens WebSocket Connection

```javascript
const socket = io('http://localhost:3000/qr');
socket.emit('qr:subscribe', { ticketId: 'base64url_ticket_id' });

socket.on('qr:status:update', (event) => {
  console.log('Status update:', event);
  // Handle status changes: SCANNED, APPROVED, REJECTED, USED
});
```

### 3. Mobile User Scans QR Code

The mobile app scans the QR code and extracts the ticket ID and code challenge.

### 4. Mobile App Fetches Ticket Info

```bash
curl -X GET http://localhost:3000/qr/tickets/base64url_ticket_id
```

### 5. Mobile App Marks Ticket as Scanned

```bash
curl -X POST http://localhost:3000/qr/tickets/base64url_ticket_id/scan \
  -H "Authorization: Bearer {mobile_user_jwt}"
```

### 6. Mobile App Approves Action

```bash
curl -X POST http://localhost:3000/qr/tickets/base64url_ticket_id/approve \
  -H "Authorization: Bearer {mobile_user_jwt}" \
  -H "Content-Type: application/json" \
  -d '{
    "codeVerifier": "base64url_code_verifier"
  }'
```

**Response:**
```json
{
  "grantToken": "base64url_grant_token"
}
```

### 7. Web Client Receives Status Update

The WebSocket connection receives:
```json
{
  "tid": "base64url_ticket_id",
  "status": "APPROVED",
  "message": "Action approved by user",
  "timestamp": 1640995200000
}
```

### 8. Web Client Exchanges Grant for Tokens

```bash
curl -X POST http://localhost:3000/auth/qr/grant \
  -H "Content-Type: application/json" \
  -d '{
    "tid": "base64url_ticket_id",
    "grantToken": "base64url_grant_token"
  }'
```

**Response:**
```json
{
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

## Configuration

### Environment Variables

```bash
# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# QR configuration
QR_TICKET_TTL_SECONDS=180
QR_GRANT_TTL_SECONDS=30
QR_HMAC_SECRET=your_hmac_secret
```

### Default Values

- **Ticket TTL**: 180 seconds (3 minutes)
- **Grant TTL**: 30 seconds
- **Rate Limiting**: 10 requests per minute per IP

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid input, expired ticket, wrong status
- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: Ticket or grant not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side errors

## Testing

### Unit Tests

```bash
npm test -- qr.service.spec.ts
```

### E2E Tests

```bash
npm run test:e2e
```

## Troubleshooting

### Common Issues

1. **Ticket Expired**: Check `QR_TICKET_TTL_SECONDS` configuration
2. **PKCE Verification Failed**: Ensure code verifier matches challenge
3. **WebSocket Connection Issues**: Verify CORS and Socket.IO configuration
4. **Rate Limiting**: Check IP-based rate limiting configuration

### Debug Mode

Enable debug logging by setting the log level to debug in your application configuration.

## Future Enhancements

- **Audit Logging**: Database persistence for audit trails
- **Advanced Rate Limiting**: User-based and action-based limits
- **Push Notifications**: Mobile push notifications for pending actions
- **Bulk Operations**: Support for multiple actions in single QR code
- **Custom Actions**: Plugin system for custom action types

## How to Run

### Prerequisites

1. **Redis Server**: Ensure Redis is running and accessible
2. **Environment Variables**: Set required environment variables
3. **Dependencies**: Install all required packages

### Quick Start

1. **Start the application:**
   ```bash
   npm run start:dev
   ```

2. **Test the QR Actions feature:**
   ```bash
   # Create a login ticket
   curl -X POST http://localhost:3000/qr/tickets \
     -H "Content-Type: application/json" \
     -d '{
       "type": "LOGIN",
       "payload": {
         "redirectUrl": "https://example.com/dashboard"
       },
       "webSessionId": "test_session"
     }'
   ```

3. **Check ticket status:**
   ```bash
   # Replace {ticketId} with the actual ticket ID from step 2
   curl -X GET http://localhost:3000/qr/tickets/{ticketId}
   ```

4. **View statistics:**
   ```bash
   curl -X GET http://localhost:3000/qr/stats
   ```

### Demo Flow

For a complete demo, you can:

1. **Create a ticket** using the curl command above
2. **Open a WebSocket connection** to monitor status updates
3. **Simulate mobile approval** by calling the approve endpoint (requires a valid JWT)
4. **Exchange the grant** for access/refresh tokens

### Testing with Postman/Insomnia

Import these example requests:

```json
{
  "name": "QR Actions Demo",
  "requests": [
    {
      "name": "Create Login Ticket",
      "method": "POST",
      "url": "http://localhost:3000/qr/tickets",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "type": "LOGIN",
        "payload": {
          "redirectUrl": "https://example.com/dashboard"
        },
        "webSessionId": "demo_session"
      }
    },
    {
      "name": "Get Ticket Preview",
      "method": "GET",
      "url": "http://localhost:3000/qr/tickets/{{ticketId}}"
    },
    {
      "name": "Get QR Statistics",
      "method": "GET",
      "url": "http://localhost:3000/qr/stats"
    }
  ]
}
```

### WebSocket Testing

Use a WebSocket client (like wscat or browser console) to test real-time updates:

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3000/qr

# Subscribe to ticket updates
{"event":"qr:subscribe","data":{"ticketId":"your_ticket_id"}}
```

The QR Actions feature is now fully implemented and ready for use!
