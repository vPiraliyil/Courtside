const pool = require('../db/index');
const { fetchTodaysGames, fetchGameById } = require('./sportsApi');

async function syncTodaysGames() {
  const games = await fetchTodaysGames();

  for (const g of games) {
    await pool.query(
      `INSERT INTO games (external_id, home_team, away_team, home_score, away_score, status, starts_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (external_id) DO UPDATE SET
         home_team  = EXCLUDED.home_team,
         away_team  = EXCLUDED.away_team,
         home_score = EXCLUDED.home_score,
         away_score = EXCLUDED.away_score,
         status     = EXCLUDED.status,
         starts_at  = EXCLUDED.starts_at`,
      [g.external_id, g.home_team, g.away_team, g.home_score, g.away_score, g.status, g.starts_at]
    );
  }

  return games.length;
}

async function syncLiveGames() {
  const games = await fetchTodaysGames();
  for (const g of games) {
    await pool.query(
      `UPDATE games
       SET home_score = $1, away_score = $2, status = $3
       WHERE external_id = $4`,
      [g.home_score, g.away_score, g.status, g.external_id]
    );
  }
}

const cron = require('node-cron');

function startDailySync() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const n = await syncTodaysGames();
      console.log(`[gameSync] daily sync complete — ${n} games synced`);
    } catch (err) {
      console.error('[gameSync] daily sync failed:', err);
    }
  }, { timezone: 'America/New_York' });
  console.log('[gameSync] daily sync scheduled at 08:00 America/New_York');
}

module.exports = { syncTodaysGames, syncLiveGames, startDailySync };
