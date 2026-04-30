const { Router } = require('express');
const authenticate = require('../middleware/auth');
const {
  createRoom,
  joinRoom,
  getRoomWithMembers,
  getRoomByInviteCode,
  getUserRooms,
  updateStake,
} = require('../services/rooms');
const { calculateLeaderboard } = require('../services/leaderboard');
const { calculateSettlement, getSavedSettlement } = require('../services/settlement');
const { broadcastMemberJoined } = require('../services/socketService');
const pool = require('../db/index');

const router = Router();

router.use(authenticate);

// GET /rooms/my must be registered before GET /rooms/:id
router.get('/my', async (req, res, next) => {
  try {
    const rooms = await getUserRooms(req.user.id);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

router.get('/invite/:inviteCode', async (req, res, next) => {
  try {
    const room = await getRoomByInviteCode(req.params.inviteCode);
    if (!room) {
      const err = new Error('Room not found');
      err.status = 404;
      return next(err);
    }
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { gameId, name } = req.body;
    if (!gameId || !name) {
      const err = new Error('gameId and name are required');
      err.status = 400;
      return next(err);
    }
    const room = await createRoom(req.user.id, gameId, name);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

router.post('/join', async (req, res, next) => {
  try {
    const { inviteCode, stake } = req.body;
    if (!inviteCode || stake == null) {
      const err = new Error('inviteCode and stake are required');
      err.status = 400;
      return next(err);
    }
    const room = await joinRoom(req.user.id, inviteCode, stake);
    broadcastMemberJoined(room.id, { userId: req.user.id, username: req.user.username, stake });
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/stake', async (req, res, next) => {
  try {
    const { stake } = req.body;
    if (stake == null) {
      const err = new Error('stake is required');
      err.status = 400;
      return next(err);
    }
    await updateStake(req.params.id, req.user.id, stake);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/leaderboard', async (req, res, next) => {
  try {
    const data = await calculateLeaderboard(req.params.id);
    if (!data) {
      const err = new Error('Room not found');
      err.status = 404;
      return next(err);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/settlement', async (req, res, next) => {
  try {
    const roomId = req.params.id;
    const { rows: roomRows } = await pool.query(
      `SELECT r.id, r.name, r.status, g.home_team, g.away_team, g.winner, g.status AS game_status
       FROM rooms r JOIN games g ON g.id = r.game_id
       WHERE r.id = $1`,
      [roomId]
    );
    if (!roomRows.length) {
      const err = new Error('Room not found');
      err.status = 404;
      return next(err);
    }
    const room = roomRows[0];

    const { transfers: computedTransfers, noContestGames } = await calculateSettlement(roomId);
    const savedTransfers = await getSavedSettlement(roomId);
    const transfers = savedTransfers.length ? savedTransfers : computedTransfers;

    const leaderboard = await calculateLeaderboard(roomId);

    res.json({
      room,
      transfers,
      noContestGames,
      finalRanking: leaderboard?.members ?? [],
      settled: room.status === 'settled',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const room = await getRoomWithMembers(req.params.id);
    if (!room) {
      const err = new Error('Room not found');
      err.status = 404;
      return next(err);
    }
    res.json(room);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
