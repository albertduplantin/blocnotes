# Application Architecture Documentation

## Overview
SecureNotes is a secure, ephemeral messaging application with note-taking capabilities. This document outlines the refactored architecture with enterprise-grade security and best practices.

## Technology Stack

### Core
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **PostgreSQL**: Primary database (via @vercel/postgres)
- **Vercel Blob**: File storage for images

### Security
- **JWT**: Stateless authentication with httpOnly cookies
- **bcryptjs**: Password hashing (12 rounds)
- **Zod**: Runtime input validation

### Development
- **Drizzle ORM**: Type-safe database queries
- **ESLint**: Code linting
- **Tailwind CSS**: Styling

## Project Structure

```
blocnotes/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   │   └── route.ts         # Login, create room
│   │   ├── messages/            # Message management
│   │   │   └── [roomId]/
│   │   │       └── route.ts     # CRUD operations for messages
│   │   ├── passwords/           # Access password management
│   │   │   └── route.ts         # Set/verify secret phrases
│   │   └── upload/              # File upload (images)
│   │       └── route.js
│   ├── chat/                    # Chat interface
│   │   ├── [roomId]/
│   │   │   └── page.js          # Chat room page
│   │   └── page.js              # Chat list
│   ├── notes/                   # Notes interface
│   │   └── page.js              # Notes management
│   ├── layout.js                # Root layout
│   └── page.js                  # Landing page
│
├── lib/                         # Shared utilities
│   ├── db/                      # Database layer
│   │   ├── schema.ts            # Drizzle schema definitions
│   │   └── index.ts             # DB client & helpers
│   ├── middleware/              # Request middleware
│   │   ├── auth.ts              # JWT authentication
│   │   └── rateLimit.ts         # Rate limiting
│   ├── auth.ts                  # Auth utilities (JWT, bcrypt)
│   ├── constants.ts             # Application constants
│   ├── logger.ts                # Logging utilities
│   ├── types.ts                 # TypeScript type definitions
│   ├── utils.ts                 # General utilities
│   └── validations.ts           # Zod schemas
│
├── components/                  # React components
│   ├── PanicWrapper.js          # Panic mode handler
│   ├── MessageBubble.js         # Chat message component
│   ├── MobileMenu.js            # Mobile navigation
│   └── InstallButton.js         # PWA install prompt
│
├── hooks/                       # Custom React hooks
│   ├── useDoubleClickTrigger.js
│   ├── useKeyComboTrigger.js
│   └── useCodeDetection.js
│
├── scripts/                     # Utility scripts
│   └── migrate.ts               # Database migration
│
├── public/                      # Static assets
├── .env.example                 # Environment variables template
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies & scripts
├── MIGRATION.md                 # Migration guide
└── ARCHITECTURE.md              # This file
```

## Database Schema

### Tables

#### `rooms`
Conversation rooms created by admins.

```sql
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,              -- 8-char room code (e.g., "ABC12345")
  name TEXT NOT NULL,               -- Display name
  password_hash TEXT,               -- Optional admin password (bcrypt)
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

#### `messages`
Chat messages within rooms.

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,              -- Unique message ID
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,            -- Message text
  image_url TEXT,                   -- Optional image URL (Vercel Blob)
  sent_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  user_id TEXT,                     -- Session user ID
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX messages_room_id_idx ON messages(room_id);
CREATE INDEX messages_timestamp_idx ON messages(timestamp);
```

#### `conversation_passwords`
Secret phrases that grant access to rooms (used in notes detection).

```sql
CREATE TABLE conversation_passwords (
  room_id VARCHAR(255) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,      -- Bcrypt hash of phrase
  password_plaintext TEXT,          -- Lowercase for search (security trade-off)
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

#### `rate_limits`
Track API rate limiting per identifier (IP or user).

```sql
CREATE TABLE rate_limits (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,         -- IP address or user ID
  endpoint TEXT NOT NULL,           -- API endpoint path
  count INTEGER NOT NULL DEFAULT 1,
  reset_time TIMESTAMP NOT NULL
);

CREATE INDEX rate_limits_identifier_idx ON rate_limits(identifier);
```

## API Endpoints

### Authentication

#### `POST /api/auth`
Login to existing room or create guest session.

**Request:**
```json
{
  "roomId": "ABC12345",
  "password": "optional-admin-password",
  "isAdmin": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "userId": "user_1234567890_abc",
    "roomId": "ABC12345",
    "roomName": "My Room",
    "isAdmin": false
  }
}
```

#### `PUT /api/auth`
Create a new room.

**Request:**
```json
{
  "name": "My Secure Chat",
  "password": "optional-admin-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "userId": "user_1234567890_abc",
    "roomId": "XYZ78901",
    "roomName": "My Secure Chat",
    "isAdmin": true
  }
}
```

### Messages

#### `GET /api/messages/[roomId]`
Retrieve messages from a room (paginated or filtered by timestamp).

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Messages per page (default: 50, max: 100)
- `since` (timestamp): Get messages after this timestamp

**Headers:**
- `Authorization: Bearer {token}` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_abc123",
        "roomId": "ABC12345",
        "content": "Hello!",
        "imageUrl": null,
        "sentByAdmin": true,
        "userId": "user_123",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "totalCount": 123,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

#### `POST /api/messages/[roomId]`
Send a new message.

**Headers:**
- `Authorization: Bearer {token}` (required)

**Request:**
```json
{
  "content": "Hello world!",
  "imageUrl": "https://blob.vercel-storage.com/...",
  "sentByAdmin": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "msg_abc123",
    "roomId": "ABC12345",
    "content": "Hello world!",
    "imageUrl": null,
    "sentByAdmin": false,
    "userId": "user_123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### `DELETE /api/messages/[roomId]`
Delete all messages in a room (admin only).

**Headers:**
- `Authorization: Bearer {token}` (required, admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 42
  }
}
```

### Passwords

#### `GET /api/passwords`
Get list of room IDs with secret phrases (for client-side detection).

**Response:**
```json
{
  "success": true,
  "data": {
    "roomIds": ["ABC12345", "XYZ78901"]
  }
}
```

#### `POST /api/passwords`
Verify if text contains a secret phrase (future implementation).

#### `PUT /api/passwords/[roomId]`
Set access password for a room (admin only).

**Headers:**
- `Authorization: Bearer {token}` (required, admin)

**Request:**
```json
{
  "accessPassword": "sandwich au jambon"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mot de passe enregistré"
}
```

## Security Features

### Authentication Flow

1. **User Access**:
   - User enters room code
   - Client calls `POST /api/auth` with roomId
   - Server generates JWT with `isAdmin: false`
   - JWT stored in httpOnly cookie + returned to client

2. **Admin Access**:
   - Admin creates room via `PUT /api/auth`
   - Server generates unique room code
   - Admin password hashed with bcrypt (12 rounds)
   - JWT with `isAdmin: true` returned

3. **Token Verification**:
   - Each API request checks Authorization header or cookie
   - JWT verified with secret key
   - Invalid/expired tokens rejected with 401

### Password Security

- **Admin Passwords**: Bcrypt hashed (12 rounds), never stored plaintext
- **Secret Phrases**: Stored as bcrypt hash + lowercase plaintext for search
  - Trade-off: enables user-friendly phrase detection in notes
  - Alternative: Require exact case-sensitive match (more secure)

### Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Stricter for writes**: 30 messages per minute
- **Auth endpoints**: 10 attempts per minute
- **Tracked in PostgreSQL**: Distributed rate limiting across instances
- **Headers added**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Input Validation

All inputs validated with Zod schemas:
- Message content: Max 10,000 characters
- Room names: 1-100 characters
- Passwords: Min 3 characters
- File uploads: Max 5MB, image types only

### Data Retention

- **Messages**: Auto-deleted after 24 hours (configurable)
- **Rate limits**: Cleaned up when expired
- **No user accounts**: Ephemeral sessions via JWT

## Performance Optimizations

### Database

- **Indexes**: On `room_id` and `timestamp` for fast queries
- **Cascading deletes**: Automatic cleanup when room deleted
- **Connection pooling**: Via Vercel Postgres

### API

- **Pagination**: Load 50 messages at a time
- **Conditional fetching**: `since` parameter for polling
- **Rate limiting**: Prevents DoS attacks

### Frontend

- **IndexedDB**: Local message cache
- **Optimistic updates**: Show messages immediately
- **Polling**: 3-second interval (TODO: replace with WebSocket)

## Future Improvements

### High Priority
1. **WebSocket Implementation**: Replace polling with real-time updates
2. **End-to-End Encryption**: Implement Web Crypto API with ECDH
3. **Message Search**: Full-text search in messages
4. **File Attachments**: Support PDFs, docs beyond images

### Medium Priority
5. **User Avatars**: Unique identicons per user
6. **Message Reactions**: Emoji reactions
7. **Typing Indicators**: Show when other user is typing
8. **Read Receipts**: Track message read status

### Low Priority
9. **Message Editing**: Edit sent messages (with history)
10. **Voice Messages**: Audio recording & playback
11. **Video Calls**: WebRTC integration
12. **Mobile Apps**: React Native versions

## Development

### Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

### Scripts
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run type-check` - TypeScript validation
- `npm run lint` - ESLint check
- `npm run db:migrate` - Run database migrations

### Environment Variables
See `.env.example` for required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob access token

## Deployment

### Prerequisites
- PostgreSQL database (Vercel Postgres, Neon, or other)
- Vercel Blob storage for images
- Node.js 18+ runtime

### Steps
1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy
5. Run migrations: `npm run db:migrate`

### Production Considerations
- Set strong `JWT_SECRET` (32+ random characters)
- Enable HTTPS only
- Configure CORS if needed
- Monitor rate limit logs
- Set up database backups
- Configure CDN for static assets

## Monitoring & Logging

### Logs
- **Production**: Only warnings and errors
- **Development**: All levels (debug, info, warn, error)
- **Categories**: DB, AUTH, API for easy filtering

### Metrics to Track
- API response times
- Rate limit hits
- Authentication failures
- Database query performance
- Message throughput

## Support & Maintenance

### Common Issues

**JWT_SECRET warning**:
- Ensure `JWT_SECRET` is set in `.env`
- Generate with: `openssl rand -base64 32`

**Database connection errors**:
- Verify `DATABASE_URL` format
- Check network access to database
- Ensure SSL is configured if required

**Rate limiting too strict**:
- Adjust in `lib/constants.ts`
- Increase `RATE_LIMIT_MAX_REQUESTS` or `RATE_LIMIT_WINDOW_MS`

### Debug Mode
Set `NODE_ENV=development` to enable:
- Debug logs
- Detailed error messages
- Hot module reloading

## License & Credits

Built with Next.js, TypeScript, PostgreSQL, and modern web technologies.
Refactored for security, scalability, and maintainability.
