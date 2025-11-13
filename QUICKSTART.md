# Quick Start Guide

Get up and running with the refactored SecureNotes in 5 minutes!

## Prerequisites

- Node.js 18+
- PostgreSQL database (Vercel Postgres, Neon, Supabase, etc.)
- npm or yarn

## Step 1: Environment Setup (2 min)

```bash
# Copy the environment template
cp .env.example .env
```

Edit `.env` and fill in:

```bash
# Your PostgreSQL connection string
DATABASE_URL="postgresql://username:password@host:5432/database"

# Generate a secret key for JWT (use any random string)
# or run: openssl rand -base64 32
JWT_SECRET="your-super-secret-key-min-32-characters"

# Optional: Vercel Blob for image uploads
BLOB_READ_WRITE_TOKEN="vercel_blob_token"
```

## Step 2: Install Dependencies (1 min)

```bash
npm install
```

## Step 3: Database Migration (1 min)

```bash
npm run db:migrate
```

This creates all necessary tables:
- ✅ rooms
- ✅ messages
- ✅ conversation_passwords
- ✅ rate_limits

## Step 4: Start Development Server (< 1 min)

```bash
npm run dev
```

Visit http://localhost:3000

## Step 5: Test the Application

### Create a Room (via API)

```bash
curl -X PUT http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Test Room",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "roomId": "ABC12345",
    "roomName": "My Test Room",
    "isAdmin": true
  }
}
```

Save the `token` and `roomId`!

### Send a Message

```bash
export TOKEN="your-token-from-above"
export ROOM_ID="ABC12345"

curl -X POST http://localhost:3000/api/messages/$ROOM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "Hello, World!",
    "sentByAdmin": true
  }'
```

### Get Messages

```bash
curl http://localhost:3000/api/messages/$ROOM_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Set Access Password (Secret Phrase)

```bash
curl -X PUT http://localhost:3000/api/passwords/$ROOM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "accessPassword": "sandwich au jambon"
  }'
```

Now when a user types "sandwich au jambon" in a note, they'll be redirected to this chat!

## What's New?

### ✅ Secure Authentication
- No more `localStorage.setItem('isAdmin', 'true')`!
- JWT tokens with proper signing
- httpOnly cookies for XSS protection

### ✅ Persistent Messages
- All messages saved to PostgreSQL
- No data loss on server restart
- 24-hour auto-cleanup for privacy

### ✅ Rate Limiting
- 100 requests per 15 minutes
- Prevents abuse and DoS attacks
- Distributed across instances

### ✅ Input Validation
- Zod schemas on all inputs
- Type-safe API calls
- Clear error messages

### ✅ TypeScript
- Full type safety
- Better IDE autocomplete
- Catch errors at compile time

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check

# Lint code
npm run lint

# Run migrations
npm run db:migrate
```

## Testing the Frontend

### Notes Page
1. Go to http://localhost:3000/notes
2. Create a note with title: "sandwich au jambon"
3. Click "Ajouter"
4. You should be redirected to the chat room!

### Chat Page
1. Open http://localhost:3000/chat
2. Enter room code: `ABC12345`
3. You'll see the messages you sent via API

## Troubleshooting

### "JWT_SECRET not set" Warning
**Solution:** Add `JWT_SECRET` to your `.env` file

### "Database connection failed"
**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Ensure firewall allows connection

### "Rate limit exceeded"
**Solution:** Wait 15 minutes or adjust limits in `lib/constants.ts`

### TypeScript Errors
**Solution:** Run `npm run type-check` to see all errors

## API Reference Quick Guide

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth` | POST | No | Login to room |
| `/api/auth` | PUT | No | Create new room |
| `/api/messages/[roomId]` | GET | Yes | Get messages |
| `/api/messages/[roomId]` | POST | Yes | Send message |
| `/api/messages/[roomId]` | DELETE | Yes (admin) | Delete all messages |
| `/api/passwords` | GET | No | Get room IDs with passwords |
| `/api/passwords/[roomId]` | PUT | Yes (admin) | Set access password |

## Example: Complete Flow

```bash
# 1. Create a room
RESPONSE=$(curl -s -X PUT http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","password":"admin123"}')

TOKEN=$(echo $RESPONSE | jq -r '.data.token')
ROOM_ID=$(echo $RESPONSE | jq -r '.data.roomId')

echo "Room created: $ROOM_ID"
echo "Token: $TOKEN"

# 2. Send some messages
for i in {1..5}; do
  curl -s -X POST http://localhost:3000/api/messages/$ROOM_ID \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"content\":\"Message $i\"}" > /dev/null
  echo "Sent message $i"
done

# 3. Get all messages
curl -s http://localhost:3000/api/messages/$ROOM_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data.messages'

# 4. Set secret phrase
curl -s -X PUT http://localhost:3000/api/passwords/$ROOM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"accessPassword":"secret phrase"}' > /dev/null

echo "✅ Complete! Room $ROOM_ID ready with secret phrase"
```

## Next Steps

1. **Read the docs**: Check out `ARCHITECTURE.md` for detailed information
2. **Migrate existing code**: Follow `MIGRATION.md` to update your frontend
3. **Deploy**: Push to Vercel with your environment variables
4. **Customize**: Adjust rate limits, message retention, etc. in `lib/constants.ts`

## Need Help?

- 📖 [Architecture Documentation](./ARCHITECTURE.md)
- 🔄 [Migration Guide](./MIGRATION.md)
- 📋 [Changelog](./CHANGELOG.md)

## Pro Tips

💡 **Use httpOnly cookies**: They're automatically sent with requests
```javascript
// No need to manually add Authorization header if using cookies
fetch('/api/messages/ABC12345')
```

💡 **Paginate messages**: Load in chunks for better performance
```javascript
fetch('/api/messages/ABC12345?page=1&pageSize=20')
```

💡 **Poll for new messages**: Use the `since` parameter
```javascript
const lastTimestamp = Date.now();
// Later...
fetch(`/api/messages/ABC12345?since=${lastTimestamp}`)
```

💡 **Type safety**: Import types from `lib/types.ts`
```typescript
import { Message, ApiResponse } from '@/lib/types';
```

---

Happy coding! 🚀
