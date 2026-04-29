const { Router } = require('express');
const pool = require('../db/index');
const { syncTodaysGames } = require('../services/gameSync');
const { pollOnce } = require('../services/pollService');
const { evaluatePicks } = require('../services/picks');
const { calculateSettlement, saveSettlement } = require('../services/settlement');
const {
  broadcastScoreUpdate,
  broadcastGameFinished,
  broadcastSettlementReady,
} = require('../services/socketService');

const router = Router();

function requireAdminKey(req, res, next) {
  const expected = process.env.ADMIN_KEY;
  const provided = req.headers.authorization?.replace('Bearer ', '');
  if (!expected || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.post('/admin/sync-games', requireAdminKey, async (req, res, next) => {
  try {
    const count = await syncTodaysGames();
    res.json({ synced: count });
  } catch (err) {
    next(err);
  }
});

router.post('/admin/poll-tick', requireAdminKey, async (req, res, next) => {
  try {
    await pollOnce();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Dev-only: simulate score / status changes without depending on live NBA games.
// Body: { homeScore?, awayScore?, status?: 'scheduled'|'live'|'finished' }
router.post('/admin/games/:id/simulate', requireAdminKey, async (req, res, next) => {
  try {
    const { homeScore, awayScore, status } = req.body;
    const { rows } = await pool.query(
      `SELECT id, home_team, away_team, home_score, away_score, status FROM games WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) {
      const err = new Error('Game not found');
      err.status = 404;
      return next(err);
    }
    const prev = rows[0];
    const newHome = homeScore ?? prev.home_score;
    const newAway = awayScore ?? prev.away_score;
    const newStatus = status ?? prev.status;

    await pool.query(
      `UPDATE games SET home_score = $1, away_score = $2, status = $3 WHERE id = $4`,
      [newHome, newAway, newStatus, prev.id]
    );

    const scoreChanged = prev.home_score !== newHome || prev.away_score !== newAway;
    const statusChanged = prev.status !== newStatus;

    if (scoreChanged || statusChanged) {
      broadcastScoreUpdate(prev.id, { homeScore: newHome, awayScore: newAway, status: newStatus });
    }

    if (statusChanged && newStatus === 'finished') {
      const winner =
        newHome === newAway ? null : newHome > newAway ? prev.home_team : prev.away_team;
      await pool.query(`UPDATE games SET winner = $1 WHERE id = $2`, [winner, prev.id]);
      if (winner) {
        await evaluatePicks(prev.id, winner);
        const { rows: roomRows } = await pool.query(
          `SELECT id FROM rooms WHERE game_id = $1`,
          [prev.id]
        );
        for (const r of roomRows) {
          const { transfers, noContestGames } = await calculateSettlement(r.id);
          await saveSettlement(r.id, transfers);
          broadcastSettlementReady(r.id, { transfers, noContestGames });
        }
      }
      broadcastGameFinished(prev.id, winner);
    }

    res.json({ ok: true, gameId: prev.id, homeScore: newHome, awayScore: newAway, status: newStatus });
  } catch (err) {
    next(err);
  }
});

router.get('/games', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM games
       WHERE starts_at::date = CURRENT_DATE
       ORDER BY starts_at ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/games/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM games WHERE id = $1`, [req.params.id]);
    if (!rows.length) {
      const err = new Error('Game not found');
      err.status = 404;
      return next(err);
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
