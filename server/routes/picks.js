const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { submitPick, getPicksForRoom } = require('../services/picks');

const router = Router();

router.use(authenticate);

router.post('/', async (req, res, next) => {
  try {
    const { roomId, pickValue } = req.body;
    if (!roomId || !pickValue) {
      const err = new Error('roomId and pickValue are required');
      err.status = 400;
      return next(err);
    }
    const pick = await submitPick(req.user.id, roomId, pickValue);
    res.status(201).json(pick);
  } catch (err) {
    next(err);
  }
});

router.get('/room/:roomId', async (req, res, next) => {
  try {
    const picks = await getPicksForRoom(req.params.roomId);
    res.json(picks);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
