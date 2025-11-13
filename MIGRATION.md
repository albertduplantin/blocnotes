# Migration Guide - Architecture Refactor

## Overview
This migration refactors the application with major security and architecture improvements:

### ✅ What's New
- **TypeScript**: Full TypeScript support with strict type checking
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **PostgreSQL Persistence**: Messages now stored in database (no more volatile memory store)
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Zod schemas for all API inputs
- **Proper Error Handling**: Consistent error responses and logging
- **Middleware**: Authentication and rate limiting middleware
- **Constants Management**: Centralized configuration
- **Pagination**: Efficient message loading

### 🗑️ What's Removed
- `utils/crypto.js` - Unused encryption utilities
- `db/schema.js` - Old unused ECDH schema
- `db/index.js` - Replaced with TypeScript version
- In-memory Map storage - Replaced with PostgreSQL
- localStorage-based authentication - Replaced with JWT
- Clerk dependency (optional) - Can be removed if not used elsewhere

## Migration Steps

### 1. Environment Setup
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your values:
# - DATABASE_URL: Your PostgreSQL connection string
# - JWT_SECRET: Generate a strong random secret
# - BLOB_READ_WRITE_TOKEN: Your Vercel Blob token (for images)
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Database Migration
```bash
npm run db:migrate
```

This will create all necessary tables:
- `rooms` - Conversation rooms
- `messages` - Chat messages (now persisted!)
- `conversation_passwords` - Access passwords with bcrypt hashing
- `rate_limits` - Rate limiting tracking

### 4. Update Your Code

#### Frontend Changes Needed

**Authentication Flow**
Old way (localStorage):
```javascript
localStorage.setItem('isAdmin', 'true'); // ❌ Insecure!
```

New way (JWT):
```javascript
// Login/Create room
const response = await fetch('/api/auth', {
  method: 'POST', // Or PUT to create new room
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ roomId, password, isAdmin: true })
});

const { token } = await response.json();

// Token is automatically stored in httpOnly cookie
// Include it in subsequent requests via Authorization header:
fetch('/api/messages/ROOM123', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Message Fetching**
Old way:
```javascript
const response = await fetch(`/api/chat/${roomId}?since=${timestamp}`);
```

New way:
```javascript
// With authentication
const response = await fetch(`/api/messages/${roomId}?page=1&pageSize=50`, {
  headers: {
    'Authorization': `Bearer ${token}` // Or use cookie
  }
});

const { data } = await response.json();
const { messages, pagination } = data;
```

**Sending Messages**
Old way:
```javascript
await fetch(`/api/chat/${roomId}`, {
  method: 'POST',
  body: JSON.stringify({ content, sentByAdmin })
});
```

New way:
```javascript
await fetch(`/api/messages/${roomId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ content, imageUrl, sentByAdmin })
});
```

### 5. Clean Build
```bash
# Remove old build artifacts
rm -rf .next

# Type check
npm run type-check

# Build
npm run build
```

## Breaking Changes

### API Routes
- ❌ `/api/chat/[roomId]` - Removed
- ✅ `/api/auth` - New authentication endpoint
- ✅ `/api/messages/[roomId]` - New message endpoint with auth
- ✅ `/api/passwords` - New password management endpoint

### Authentication
- No more `localStorage.getItem('isAdmin')`
- Use JWT tokens from `/api/auth`
- Tokens stored in httpOnly cookies or Authorization header

### Message Structure
```typescript
// Old (inconsistent)
{
  id: string,
  content: string,
  timestamp: string,
  sentByAdmin: boolean
}

// New (typed)
{
  id: string,
  roomId: string,
  content: string,
  imageUrl?: string | null,
  timestamp: Date,
  sentByAdmin: boolean,
  userId?: string
}
```

## Security Improvements

### Before → After
- ❌ Admin status in localStorage → ✅ JWT tokens with signatures
- ❌ Passwords in plaintext → ✅ Bcrypt hashing (12 rounds)
- ❌ No API protection → ✅ Rate limiting (100 req/15min)
- ❌ No input validation → ✅ Zod schemas on all inputs
- ❌ Public APIs → ✅ Authentication middleware
- ❌ Messages in memory → ✅ PostgreSQL with proper indexes

## Performance Improvements

- **Pagination**: Load 50 messages at a time instead of all
- **Indexes**: Database indexes on roomId and timestamp
- **Rate Limiting**: Prevent abuse and DoS
- **Cleanup**: Automatic cleanup of old messages (24h retention)

## Testing the Migration

1. **Create a new room**:
```bash
curl -X PUT http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","password":"admin123"}'
```

2. **Send a message**:
```bash
curl -X POST http://localhost:3000/api/messages/ROOM123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"content":"Hello World!"}'
```

3. **Get messages**:
```bash
curl http://localhost:3000/api/messages/ROOM123?page=1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Rollback Plan

If you need to rollback:

1. Revert to previous commit
2. Restore old database tables (if any)
3. Check git history for old files

## Support

If you encounter issues:

1. Check `.env` configuration
2. Verify database connection
3. Run `npm run type-check` for TypeScript errors
4. Check server logs for detailed error messages

## Next Steps

After migration:

1. ✅ Update frontend components to use new auth flow
2. ✅ Test all user flows (create room, send messages, etc.)
3. ✅ Update any existing tests
4. ✅ Deploy to production
5. 🔄 Consider implementing WebSocket for real-time updates (optional)

## Additional Notes

- The JWT_SECRET must be kept secure and never committed to git
- Database credentials should use environment variables
- Consider setting up automated backups for PostgreSQL
- Rate limits can be adjusted in `lib/constants.ts`
