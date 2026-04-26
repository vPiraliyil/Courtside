# Courtside — CLAUDE.md

## Project Overview

Courtside is a social sports pick'em app where friend groups create private rooms, make picks on who wins each NBA game, and settle up money at the end using a Splitwise-style minimum-transfer debt algorithm. The app never handles real money — it only does the math and tells you who pays who.

**Core user journey:**
1. Create a room tied to a live NBA game
2. Share invite link with friends
3. Everyone declares a stake amount and locks in their pick (who wins)
4. Watch a live leaderboard update in real-time as scores change
5. When game ends, see a settlement screen showing minimum transfers to resolve all debts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Real-time | Socket.io |
| Sports Data | API-Sports (NBA endpoint) |
| Auth | JWT (access + refresh tokens) |
| Deployment | Railway (backend + DB), Vercel (frontend) |

---

## Project Structure

```
courtside/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React context (auth, socket)
│   │   ├── lib/             # API client, utils
│   │   └── main.jsx
│   └── vite.config.js
│
├── server/                  # Node/Express backend
│   ├── routes/              # Express route handlers
│   ├── controllers/         # Business logic
│   ├── middleware/          # Auth, error handling
│   ├── services/            # Sports API, socket, settlement
│   ├── db/
│   │   ├── schema.sql       # All table definitions
│   │   └── index.js         # pg pool connection
│   └── index.js             # Entry point
│
└── CLAUDE.md
```

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games (seeded from API-Sports)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(100) UNIQUE NOT NULL,
  sport VARCHAR(50) DEFAULT 'basketball',
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  home_score INT DEFAULT 0,
  away_score INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'scheduled',
  starts_at TIMESTAMPTZ NOT NULL,
  winner VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code VARCHAR(12) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  game_id UUID REFERENCES games(id),
  created_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room members
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  stake DECIMAL(10,2) NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Picks (designed for extensibility to support future prop bets)
CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  game_id UUID REFERENCES games(id),
  pick_type VARCHAR(50) NOT NULL DEFAULT 'winner',
  pick_value VARCHAR(100) NOT NULL,
  target VARCHAR(100),
  is_correct BOOLEAN,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id, game_id, pick_type)
);

-- Settlements
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Conventions

### General
- Use async/await everywhere, no raw promise chains
- All errors must be caught and forwarded to Express error middleware with next(err)
- Never expose stack traces to the client in production
- Use environment variables for all secrets, never hardcode API keys
- Commit messages follow Conventional Commits: feat:, fix:, chore:, refactor:

### Backend
- Controllers handle HTTP request/response only — business logic lives in services
- All DB queries go through server/db/index.js pool — no direct pg imports in routes
- Use parameterized queries always — never string interpolation in SQL
- Socket.io rooms are named room:{roomId} — always use this pattern
- Sports API polling runs every 30 seconds for live games only — never poll finished games
- On score update: update games table, emit score:update to all Socket.io rooms watching that game
- On game finish: set winner, mark picks correct/incorrect, run settlement, emit game:finished
- Settlement algorithm lives in server/services/settlement.js as a pure function with no side effects

### Frontend
- All API calls go through client/src/lib/api.js — never use fetch directly in components
- Socket connection managed in client/src/context/SocketContext.jsx
- Auth state managed in client/src/context/AuthContext.jsx
- Pages in client/src/pages/, reusable components in client/src/components/
- Use TailwindCSS utility classes only — no inline styles, no separate CSS files
- Every page must handle loading state and error state explicitly

### Naming
- Files: camelCase.js for JS, PascalCase.jsx for React components
- DB columns: snake_case
- JS variables/functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- React components: PascalCase

---

## Settlement Algorithm

Lives in server/services/settlement.js as a pure function. Takes room members and their picks, returns an array of transfer objects.

**Logic:**
1. For each game, determine winners (picked correctly) and losers (picked wrong)
2. Each loser contributes their stake to a pool for that game
3. Correct pickers split the pool proportionally to their own stake
4. Aggregate net balance per user across all games (positive = owed money, negative = owes money)
5. Run minimum transfer algorithm to settle in fewest transactions

**Minimum transfer algorithm:**
```
1. Split into creditors (net positive) and debtors (net negative)
2. Sort both lists by absolute value descending
3. Match largest debtor to largest creditor
4. Transfer = min(debtor amount, creditor amount)
5. Reduce both, remove if zero, repeat until empty
6. Return array of { fromUserId, toUserId, amount }
```

**No contest edge case:**
If everyone in the room picked the same team for a game, that game produces zero transfers. Flag it with a noContest: true field. Do not include in settlement math.

---

## API-Sports Integration

- Base URL: https://v1.basketball.api-sports.io
- Auth header: x-apisports-key: YOUR_KEY
- NBA league ID: 12, season: 2024 (free plan only supports up to 2024)
- Key endpoints:
  - GET /games?league=12&season=2024 — list of NBA games
  - GET /games?id={id} — single game with live score
- Poll every 30 seconds, only games where status = live
- On data change, update DB and broadcast via Socket.io

---

## Socket.io Events

| Event | Direction | Payload |
|---|---|---|
| join:room | client to server | { roomId } |
| score:update | server to client | { gameId, homeScore, awayScore, status } |
| pick:locked | server to client | { userId, username, pickValue } |
| game:finished | server to client | { gameId, winner } |
| settlement:ready | server to client | { settlements[] } |

---

## UI Design Direction

Dark theme. Deep navy background (#0a0f1e), bright green accent (#00ff87), clean white text. Bold wide display font for scores and team names. Clean sans-serif for UI text. Leaderboard should animate on score updates — subtle pulse on the updated score, smooth rank transitions. Settlement screen uses clean cards with directional arrows showing money flow between user avatars. The overall feel is premium sports app, not generic dashboard.

---

## Environment Variables

```
# server/.env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
API_SPORTS_KEY=...
CLIENT_URL=http://localhost:5173
PORT=3001

# client/.env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

---

## Build Order

Build strictly in this sequence. Do not move forward until the current step works end to end.

1. DB schema + Express server scaffold + pg pool connection
2. Auth — register, login, JWT middleware, refresh token
3. Games seeding from API-Sports
4. Room creation + invite link generation + join flow + stake declaration
5. Pick submission + lock logic (picks disabled after game start time)
6. Socket.io setup + live score polling + broadcast pipeline
7. Live leaderboard component with real-time updates
8. Settlement algorithm + settlement screen UI
9. Polish — loading states, error states, empty states, mobile responsiveness
10. Deploy to Railway + Vercel

## Testing
- Use Playwright for end-to-end tests
- Tests live in /tests directory at the project root
- Use two browser contexts to simulate multiplayer scenarios
- Run with: npx playwright test