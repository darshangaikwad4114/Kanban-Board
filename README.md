# Real-time Collaborative Kanban Board

A full-stack collaborative Kanban board demonstrating WebSocket architecture, presence tracking, live sync, and production-grade connection handling.

## Architecture

### Split Frontend/Backend Deployment

This project uses a **separated frontend and backend deployment** strategy:

- **Backend (Express + Socket.io)**: Deployed on **Render** or **Railway** — these platforms support persistent HTTP and WebSocket connections required by Socket.io. Node.js/Express runs as a long-lived process.
- **Frontend (Next.js)**: Deployed on **Vercel** — Vercel's serverless edge functions work perfectly for the Next.js App Router, but they **cannot hold persistent WebSocket connections**, which is why Socket.io runs on a separate server.
- **API Proxy**: In development, Next.js rewrites proxy `/api/*` requests to the backend. In production, the frontend connects directly to the backend URL via environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`).

**Why not deploy everything on Vercel?**
Vercel serverless functions are stateless and ephemeral. Socket.io requires a persistent TCP connection. Running Socket.io on Vercel would require workarounds like using WebSocketUpgrade on Edge Functions (limited) or third-party services. A dedicated Node.js server is the correct architecture for real-time features.

### Data Flow

```
MongoDB (single source of truth)
    ↕
REST API (Express) — all durable writes
    ↕
Socket.io — broadcasts changes to room members (no state stored)
    ↕
Next.js Client — Zustand store, re-sync via REST on reconnect
```

### Key Design Decisions

- **MongoDB is the single source of truth.** All writes go through REST endpoints. Socket.io never persists data — it only broadcasts changes to connected clients in the same board room.
- **On reconnect, clients perform a full REST re-fetch.** Never trust stale local state.
- **Optimistic local updates** with server confirmation. If the server write fails, the state reverts via a full re-fetch.
- **Last-write-wins conflict resolution** using `updatedAt` timestamps. This is a deliberate tradeoff: simpler than CRDT or OT, but means the last saved change overwrites concurrent edits. For a Kanban board where conflicts are rare (users typically edit different cards), this is acceptable.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript (strict), Tailwind CSS |
| State | Zustand |
| Backend | Node.js + Express + Socket.io |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod (shared between client/server via `@kanban/shared`) |
| Testing | Jest + Supertest + React Testing Library |
| CI/CD | GitHub Actions |

## Project Structure

```
kanban-board/
├── packages/
│   ├── shared/          # Zod schemas, types, socket event payloads
│   ├── server/          # Express + Socket.io backend
│   └── client/          # Next.js frontend
├── .github/workflows/   # CI/CD pipeline
└── package.json         # Monorepo root (npm workspaces)
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- npm

### Installation

```bash
git clone <repo-url>
cd kanban-board
npm install
npm run build -w packages/shared
```

### Environment Variables

**Server** (`packages/server/.env`):
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/kanban
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
```

**Client** (`packages/client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### Development

```bash
# Start both frontend and backend
npm run dev

# Or separately:
npm run dev:server  # http://localhost:4000
npm run dev:client  # http://localhost:3000
```

### Testing

```bash
npm test
```

## Features

### Phase 1: Foundation ✅
- JWT authentication (register, login, refresh, logout)
- REST CRUD for boards, lists, cards
- MongoDB models with proper indexes
- Rate limiting on all mutations
- Input validation via Zod (shared schemas)
- Activity logging

### Phase 2: Presence ✅
- Socket.io rooms per board (`board:{id}`)
- Real-time user join/leave broadcasting
- Avatar stack showing active users
- 3-second debounce on leave to prevent flicker
- Connection status indicator

### Phase 3: Live Sync ✅
- Card changes broadcasted to room after DB write
- Zustand store merges socket events
- Optimistic local updates
- Last-write-wins conflict resolution (via `updatedAt`)
- Auto re-sync on reconnect via REST fetch

### Phase 4: Resilience ✅
- Socket.io reconnection with exponential backoff
- Full board re-fetch on reconnect
- Visible connection status (connected/connecting/reconnecting/disconnected)
- Token refresh on reconnection

### Phase 5: Collaborative Rich Text (Optional)
- Yjs + y-socket.io for CRDT-based collaborative editing on card descriptions

## Deployment

1. Push to GitHub — CI runs lint, typecheck, and tests.
2. Deploy the server to Render or Railway:
   - Set the build command: `npm run build -w packages/shared && npm run build -w packages/server`
   - Set the start command: `npm run start -w packages/server`
   - Add environment variables
3. Deploy the client to Vercel:
   - Set the build command: `npm run build -w packages/client`
   - Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to your server URL
   - Set `ROOT_DIR` to `packages/client`

## CI/CD Pipeline

On push to `main`:
1. **Lint & Typecheck** — ESLint + TypeScript compilation check
2. **Test** — Runs Jest tests (server + client) against a MongoDB service container
3. **Deploy Server** — Builds and deploys the server package
4. **Deploy Client** — Builds and deploys the client package

## License

MIT