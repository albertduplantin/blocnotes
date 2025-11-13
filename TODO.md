# TODO List - Future Improvements

## 🔴 High Priority

### 1. WebSocket Implementation
**Status:** Not Started
**Effort:** Medium
**Impact:** High

Replace HTTP polling with WebSocket for real-time messaging:
- [ ] Set up WebSocket server (using `ws` library)
- [ ] Create WebSocket handler in Next.js API route
- [ ] Implement client-side WebSocket connection
- [ ] Add reconnection logic
- [ ] Fallback to polling if WebSocket unavailable
- [ ] Add heartbeat/ping-pong for connection health

**Files to modify:**
- `app/api/ws/route.ts` (new)
- `app/chat/[roomId]/page.js` (update polling logic)
- `lib/constants.ts` (add WebSocket config)

### 2. Improve Secret Phrase Detection
**Status:** Partial
**Effort:** Low
**Impact:** Medium

Current implementation stores plaintext passwords for detection. Improve security:
- [ ] Option 1: Case-sensitive exact match (more secure)
- [ ] Option 2: One-way hash with salt (can't reverse, but can match)
- [ ] Option 3: Server-side detection endpoint (send text, get room ID)
- [ ] Add toggle in admin panel to choose detection method

**Files to modify:**
- `app/api/passwords/route.ts`
- `lib/db/schema.ts` (remove password_plaintext column)
- `app/notes/page.js` (update detection logic)

### 3. Frontend Authentication Integration
**Status:** Not Started
**Effort:** High
**Impact:** Critical

Update all frontend components to use new JWT authentication:
- [ ] Create auth context provider
- [ ] Add login/register pages
- [ ] Update chat page to use JWT tokens
- [ ] Add token refresh logic
- [ ] Handle 401 responses (redirect to login)
- [ ] Store token in cookie/localStorage (with security considerations)
- [ ] Add logout functionality

**Files to modify:**
- `app/chat/[roomId]/page.js`
- `app/chat/page.js`
- `app/notes/page.js`
- `components/AuthProvider.tsx` (new)
- `hooks/useAuth.ts` (new)

## 🟡 Medium Priority

### 4. Message Search
**Status:** Not Started
**Effort:** Medium
**Impact:** Medium

Add full-text search for messages:
- [ ] Add PostgreSQL full-text search index
- [ ] Create search API endpoint
- [ ] Add search UI in chat page
- [ ] Highlight search results
- [ ] Add filters (date range, sender)

**Files to create:**
- `app/api/messages/[roomId]/search/route.ts`
- `components/MessageSearch.tsx`

### 5. User Avatars
**Status:** Not Started
**Effort:** Low
**Impact:** Low

Generate unique identicons for users:
- [ ] Install identicon library (or create custom)
- [ ] Generate avatar based on userId
- [ ] Display in message bubbles
- [ ] Add to user profile

**Dependencies:** `@dicebear/core`, `@dicebear/collection`

### 6. Message Reactions
**Status:** Not Started
**Effort:** Medium
**Impact:** Low

Add emoji reactions to messages:
- [ ] Update database schema (reactions table)
- [ ] Create reaction API endpoints
- [ ] Add reaction picker UI
- [ ] Display reaction counts
- [ ] Real-time reaction updates (WebSocket)

**New tables:**
```sql
CREATE TABLE message_reactions (
  id SERIAL PRIMARY KEY,
  message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 7. Typing Indicators
**Status:** Not Started
**Effort:** Low
**Impact:** Low

Show when other user is typing:
- [ ] Add typing state to WebSocket messages
- [ ] Create typing indicator component
- [ ] Add timeout logic (stop showing after 3s)
- [ ] Display "User is typing..." in chat

**Requires:** WebSocket implementation (TODO #1)

### 8. Read Receipts
**Status:** Not Started
**Effort:** Medium
**Impact:** Low

Track when messages are read:
- [ ] Add `read_at` column to messages table
- [ ] Update message when viewed by recipient
- [ ] Show checkmark indicators (single/double)
- [ ] Add privacy toggle (disable read receipts)

## 🟢 Low Priority

### 9. Message Editing
**Status:** Not Started
**Effort:** Medium
**Impact:** Low

Allow users to edit sent messages:
- [ ] Add `edited_at` column to messages table
- [ ] Create edit API endpoint
- [ ] Add edit button to message bubble
- [ ] Show "edited" indicator
- [ ] Optional: Store edit history

### 10. Voice Messages
**Status:** Not Started
**Effort:** High
**Impact:** Low

Record and send voice messages:
- [ ] Add audio recording UI
- [ ] Use Web Audio API for recording
- [ ] Upload to Vercel Blob
- [ ] Add audio player component
- [ ] Show waveform visualization

**Dependencies:** `wavesurfer.js` or similar

### 11. Video Calls
**Status:** Not Started
**Effort:** Very High
**Impact:** Low

Peer-to-peer video calls:
- [ ] Implement WebRTC signaling
- [ ] Create video call UI
- [ ] Add call notifications
- [ ] Screen sharing support
- [ ] Recording functionality

**Dependencies:** WebRTC, STUN/TURN servers

### 12. Group Chats
**Status:** Not Started
**Effort:** Very High
**Impact:** Medium

Support multiple users in one room:
- [ ] Update database schema for multi-user rooms
- [ ] Add user list UI
- [ ] Implement invite system
- [ ] Add user roles (admin, member)
- [ ] Group permissions management

**Breaking changes:** Major architecture changes required

### 13. Export Chat History
**Status:** Not Started
**Effort:** Low
**Impact:** Low

Export messages to various formats:
- [ ] Create export API endpoint
- [ ] Support formats: JSON, CSV, PDF, HTML
- [ ] Add export button to chat page
- [ ] Include images in export
- [ ] Privacy: Admin only

### 14. Message Scheduling
**Status:** Not Started
**Effort:** Medium
**Impact:** Low

Schedule messages to be sent later:
- [ ] Add scheduled_at column
- [ ] Create cron job to send scheduled messages
- [ ] Add scheduling UI
- [ ] Show pending scheduled messages
- [ ] Allow cancellation

### 15. Multi-language Support
**Status:** Not Started
**Effort:** High
**Impact:** Medium

Internationalization (i18n):
- [ ] Install next-intl or similar
- [ ] Extract all strings to translation files
- [ ] Add language switcher
- [ ] Support: FR, EN, ES, DE
- [ ] RTL support for Arabic, Hebrew

## 🔧 Technical Debt

### 16. Unit Tests
**Status:** Not Started
**Effort:** High
**Impact:** High

Add comprehensive test coverage:
- [ ] Set up Jest + React Testing Library
- [ ] Unit tests for API routes
- [ ] Unit tests for utilities
- [ ] Integration tests for auth flow
- [ ] E2E tests with Playwright
- [ ] Target: 80%+ coverage

**Files to create:**
- `__tests__/` directory
- `jest.config.js`
- `playwright.config.ts`

### 17. Performance Monitoring
**Status:** Not Started
**Effort:** Medium
**Impact:** Medium

Add observability:
- [ ] Install Sentry for error tracking
- [ ] Add performance monitoring
- [ ] Track API latency
- [ ] Monitor database query performance
- [ ] Set up alerts for errors

### 18. Database Migrations
**Status:** Partial
**Effort:** Medium
**Impact:** High

Proper migration system:
- [ ] Use Drizzle Kit for migrations
- [ ] Create migration files for all schema changes
- [ ] Add rollback capability
- [ ] Document migration process
- [ ] Test migrations on staging

### 19. API Documentation
**Status:** Not Started
**Effort:** Low
**Impact:** Medium

Auto-generated API docs:
- [ ] Install Swagger/OpenAPI
- [ ] Add JSDoc comments to all endpoints
- [ ] Generate interactive docs
- [ ] Host at /api/docs
- [ ] Include example requests/responses

### 20. Security Audit
**Status:** Not Started
**Effort:** Medium
**Impact:** Critical

Professional security review:
- [ ] Run npm audit and fix vulnerabilities
- [ ] Check for SQL injection risks
- [ ] Review authentication flow
- [ ] Test rate limiting effectiveness
- [ ] Penetration testing
- [ ] Add security headers (CSP, HSTS, etc.)

## 📱 Mobile App

### 21. React Native App
**Status:** Not Started
**Effort:** Very High
**Impact:** High

Native mobile apps:
- [ ] Set up React Native project
- [ ] Share code with web app (if possible)
- [ ] Implement native features (push notifications)
- [ ] App Store submission
- [ ] Play Store submission
- [ ] Automatic updates

## 🚀 DevOps

### 22. CI/CD Pipeline
**Status:** Not Started
**Effort:** Medium
**Impact:** High

Automated deployment:
- [ ] GitHub Actions workflow
- [ ] Run tests on PR
- [ ] Type check on push
- [ ] Auto-deploy to staging
- [ ] Manual approval for production
- [ ] Rollback capability

### 23. Database Backups
**Status:** Not Started
**Effort:** Low
**Impact:** Critical

Automated backups:
- [ ] Daily PostgreSQL backups
- [ ] Store backups in S3 or similar
- [ ] Test restore process
- [ ] 30-day retention
- [ ] Document recovery procedure

---

## Notes

- **Effort Estimation:**
  - Low: < 1 day
  - Medium: 1-3 days
  - High: 3-7 days
  - Very High: > 1 week

- **Impact:**
  - Low: Nice to have
  - Medium: Improves user experience
  - High: Core functionality
  - Critical: Security/stability

## Contributing

When working on a TODO item:
1. Move it to "In Progress"
2. Create a feature branch
3. Update this file when complete
4. Link to PR in description
5. Move to "Completed" section

## Completed Items

- [x] TypeScript migration
- [x] JWT authentication
- [x] PostgreSQL persistence
- [x] Rate limiting
- [x] Input validation with Zod
- [x] Pagination
- [x] Bcrypt password hashing
- [x] Authentication middleware
- [x] Proper logging
- [x] Constants management
- [x] Database schema design
