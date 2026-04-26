const { Router } = require('express');
const pool = require('../db/index');
const { syncTodaysGames } = require('../services/gameSync');

const router = Router();

router.post('/admin/sync-games', async (req, res, next) => {
  try {
    const count = await syncTodaysGames();
    res.json({ synced: count });
  } catch (err) {
    next(err);
  }
});

router.get('/games', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `SELECT * FROM games
       WHERE starts_at::date = $1
       ORDER BY starts_at ASC`,
      [today]
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
