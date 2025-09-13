# Firebase Authentication Implementation

## Overview

Firebase authentication feature allows users to login using Firebase ID token instead of traditional email/password. After successful authentication, the system issues JWT tokens similar to regular login.

## Workflow

1. **Frontend Firebase login** → Obtain Firebase ID token
2. **Send ID token to Backend** → POST `/auth/firebase/login`
3. **Backend verify ID token** → Authenticate with Firebase Admin SDK
4. **Check user in database** → Find user by Firebase UID
5. **Create new user (if not exists)** → Automatically create user from Firebase data
6. **Issue JWT token** → Return access token and refresh token

## API Endpoints

### POST /auth/firebase/login

**Request Body:**
```json
{
  "idToken": "firebase_id_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "messageKey": "auth.FIREBASE_LOGIN_SUCCESS",
  "data": {
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "firebaseUid": "firebase_uid",
      "photoUrl": "https://example.com/photo.jpg",
      "isEmailVerified": true,
      "authMethod": "firebase"
    },
    "token": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

## Usage

### Frontend (JavaScript/TypeScript)

```javascript
// 1. Firebase login
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';

const auth = getAuth();
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// 2. Send ID token to backend
const response = await fetch('/auth/firebase/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ idToken })
});

const result = await response.json();
if (result.success) {
  // Save JWT token for other API calls
  localStorage.setItem('accessToken', result.data.token.accessToken);
  localStorage.setItem('refreshToken', result.data.token.refreshToken);
}
```

### Backend - Using JWT token

After successful Firebase login, you can use JWT token as usual:

```typescript
// In controller
@Get('protected')
@UseGuards(JwtAccessTokenGuard)
async getProtectedData(@Request() req) {
  // req.user contains authenticated user information
  return { message: 'This is protected data', user: req.user };
}
```

## Firebase Configuration

### 1. Update Firebase config

File: `src/shared/services/firebase/firebase.config.ts`

```typescript
export const firebaseConfig = {
  type: 'service_account',
  project_id: 'your-project-id',
  private_key_id: 'your-private-key-id',
  private_key: 'your-private-key',
  client_email: 'your-service-account-email@your-project.iam.gserviceaccount.com',
  client_id: 'your-client-id',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'your-cert-url',
};
```

### 2. Environment Variables

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
```

## Database Schema

### User Entity - New fields

```typescript
// Firebase specific fields
@Index({ unique: true })
@Column('varchar', { length: 255, nullable: true })
firebaseUid: string; // Firebase UID

@Column('varchar', { length: 500, nullable: true })
photoUrl: string; // Profile photo URL from Firebase
```

### Auth Method

```typescript
AUTH_METHODS: {
  EMAIL_PASSWORD: 'email_password',
  OAUTH: 'oauth',
  PHONE_OTP: 'phone_otp',
  FIREBASE: 'firebase', // Newly added
}
```

## Error Handling

### Message keys

**English:**
- `FIREBASE_LOGIN_SUCCESS`: "Firebase login successful"
- `FIREBASE_AUTH_FAILED`: "Firebase authentication failed"
- `FIREBASE_LOGIN_ERROR`: "Firebase login failed. Please try again later."

**Vietnamese:**
- `FIREBASE_LOGIN_SUCCESS`: "Đăng nhập Firebase thành công"
- `FIREBASE_AUTH_FAILED`: "Xác thực Firebase thất bại"
- `FIREBASE_LOGIN_ERROR`: "Đăng nhập Firebase thất bại. Vui lòng thử lại sau."

### Error cases

1. **Invalid Firebase ID token** → `FIREBASE_AUTH_FAILED`
2. **Firebase service unavailable** → `FIREBASE_LOGIN_ERROR`
3. **Error creating new user** → `FIREBASE_LOGIN_ERROR`

## Migration

If you need to migrate existing users to Firebase:

1. User logs in with Firebase for the first time → Automatically creates new record
2. User logs in with Firebase again → Updates information from Firebase
3. User can login with both email/password and Firebase

## Security

1. **Token validation**: All Firebase ID tokens are verified using Firebase Admin SDK
2. **User verification**: User is verified with database before issuing JWT
3. **Automatic user creation**: New users are created with appropriate default values
4. **JWT token generation**: JWT tokens are generated same as regular login
5. **Session management**: Uses the same session system as email/password login

## Testing

### Test Firebase authentication

1. Setup Firebase project
2. Configure Firebase Admin SDK credentials
3. Get Firebase ID token from frontend application
4. Send POST request to `/auth/firebase/login` with token

### Test cases

- ✅ Login with valid Firebase ID token
- ✅ Create new user when not exists in database
- ✅ Update existing user with new Firebase information
- ✅ Handle error when Firebase ID token is invalid
- ✅ Handle error when Firebase service is unavailable
