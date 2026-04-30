# Courtside

**Real-time NBA pick'em for friend groups. Make your picks, watch the game, settle the tab.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-courtside.vercel.app-00FF87?style=flat-square)](https://courtside.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-white?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=flat-square&logo=socket.io)](https://socket.io)

---

Courtside is a real-time social pick'em app for friend groups. Create a private room tied to a live NBA game, share the invite link, and have everyone declare a stake and lock in their pick before tip-off. A live leaderboard updates as the game plays out. When the final buzzer sounds, Courtside runs a minimum-transfer debt settlement algorithm — the same approach as Splitwise — and tells everyone exactly who pays who. No money moves through the platform. Just the math.

---

## Live Demo

[**courtside.vercel.app**](https://courtside.vercel.app)

---

## Screenshots

> Screenshots coming soon.

<!-- Add screenshots here -->

---

## Features

- **Pick'em rooms** — create a private room for any NBA game and share a unique invite link
- **Stake declaration** — each player sets a dollar amount they're willing to put on the line
- **Pick locking** — picks close automatically at tip-off; no last-second changes
- **Real-time leaderboard** — scores and rankings update live via Socket.io as the game progresses
- **Live NBA score polling** — fetches live game data from API-Sports every 30 seconds
- **Splitwise-style debt settlement** — minimum-transfer algorithm resolves all debts in the fewest possible transactions
- **Invite system** — join rooms via shareable link; post-auth redirect drops you straight back into the invite flow

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

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- An [API-Sports](https://api-sports.io) account for NBA data (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/vPiraliyil/Courtside
cd courtside
```

### 2. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 3. Configure environment variables

Create `server/.env` and `client/.env` using the tables in the [Environment Variables](#environment-variables) section below.

### 4. Run the database migration

```bash
cd server
npm run migrate
```

This executes `db/schema.sql` against your `DATABASE_URL` and sets up all tables.

### 5. Start the development servers

In two separate terminals:

```bash
# Terminal 1 — backend (http://localhost:3001)
cd server && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client && npm run dev
```

---

## Environment Variables

### Server — `server/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/courtside` |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `API_SPORTS_KEY` | API-Sports API key for NBA data |
| `ADMIN_KEY` | Secret key for protected admin endpoints |
| `CLIENT_URL` | Frontend origin for CORS, e.g. `http://localhost:5173` |
| `PORT` | Port the Express server listens on (default: `3001`) |

### Client — `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL, e.g. `http://localhost:3001` |
| `VITE_SOCKET_URL` | Socket.io server URL, e.g. `http://localhost:3001` |

---

## Manual Game Sync

Games are synced automatically from API-Sports every 30 minutes. To trigger a sync manually:

```bash
curl -X POST https://your-server/admin/sync-games \
  -H "Authorization: Bearer $ADMIN_KEY"
```

Returns `{ "synced": N }` where `N` is the number of games upserted. Useful after the daily schedule drops or when testing against fresh data.

---

## Project Structure

```
courtside/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── context/         # Auth and Socket context providers
│       ├── hooks/           # Custom React hooks
│       ├── lib/             # API client, utilities
│       └── pages/           # Route-level page components
│
└── server/                  # Node/Express backend
    ├── db/
    │   ├── schema.sql       # All table definitions
    │   ├── migrate.js       # Migration runner
    │   └── index.js         # pg connection pool
    ├── middleware/          # JWT auth, error handling
    ├── routes/              # Express route handlers
    ├── services/            # Business logic
    │   ├── rooms.js         # Room and member operations
    │   ├── settlement.js    # Minimum-transfer algorithm (pure function)
    │   ├── leaderboard.js   # Live ranking calculations
    │   ├── pollService.js   # 30-second live score polling
    │   ├── gameSync.js      # Scheduled game data sync (every 30 min)
    │   ├── socketService.js # Socket.io broadcast helpers
    │   └── sportsApi.js     # API-Sports client
    └── index.js             # Server entry point
```

---

## Contributing

This is a solo project and not open to contributions. Feel free to fork it and build your own variant.

---

## License

[MIT](LICENSE)
