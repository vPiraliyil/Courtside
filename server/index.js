require('dotenv').config({ override: false });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');
const pool = require('./db/index');
const errorHandler = require('./middleware/error');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const roomRoutes = require('./routes/rooms');
const pickRoutes = require('./routes/picks');
const socketService = require('./services/socketService');
const { startPolling } = require('./services/pollService');
const { startDailySync } = require('./services/gameSync');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

socketService.init(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.on('join:room', async ({ roomId }) => {
    try {
      const { rows } = await pool.query(
        'SELECT game_id FROM rooms WHERE id = $1',
        [roomId]
      );
      if (!rows.length) return;
      socket.join(`room:${roomId}`);
      socket.join(`game:${rows[0].game_id}`);
    } catch (err) {
      console.error('join:room error:', err.message);
    }
  });

  socket.on('leave:room', ({ roomId }) => {
    socket.leave(`room:${roomId}`);
  });
});

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/', gameRoutes);
app.use('/rooms', roomRoutes);
app.use('/picks', pickRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startPolling();
  startDailySync();
});

module.exports = { app, io };
