const cron = require('node-cron');
const pool = require('../db/index');
const { fetchTodaysGames } = require('./sportsApi');
const { evaluatePicks } = require('./picks');
const { calculateSettlement, saveSettlement } = require('./settlement');
const {
  broadcastScoreUpdate,
  broadcastGameFinished,
  broadcastSettlementReady,
} = require('./socketService');

let running = false;

async function pollOnce() {
  if (running) return;
  running = true;
  try {
    const { rows: dbGames } = await pool.query(
      `SELECT id, external_id, home_team, away_team, home_score, away_score, status
       FROM games
       WHERE starts_at::date = CURRENT_DATE`
    );
    if (!dbGames.length) return;

    const dbByExt = new Map(dbGames.map((g) => [g.external_id, g]));
    const fresh = await fetchTodaysGames();

    for (const g of fresh) {
      const prev = dbByExt.get(g.external_id);
      if (!prev) continue;

      const scoreChanged =
        prev.home_score !== g.home_score || prev.away_score !== g.away_score;
      const statusChanged = prev.status !== g.status;

      if (!scoreChanged && !statusChanged) continue;

      await pool.query(
        `UPDATE games SET home_score = $1, away_score = $2, status = $3 WHERE id = $4`,
        [g.home_score, g.away_score, g.status, prev.id]
      );

      if (scoreChanged) {
        broadcastScoreUpdate(prev.id, {
          homeScore: g.home_score,
          awayScore: g.away_score,
          status: g.status,
        });
      }

      if (statusChanged && g.status === 'finished') {
        const winner =
          g.home_score === g.away_score
            ? null
            : g.home_score > g.away_score
            ? prev.home_team
            : prev.away_team;

        await pool.query(`UPDATE games SET winner = $1 WHERE id = $2`, [winner, prev.id]);

        if (winner) {
          await evaluatePicks(prev.id, winner);

          const { rows: rooms } = await pool.query(
            `SELECT id FROM rooms WHERE game_id = $1`,
            [prev.id]
          );
          for (const room of rooms) {
            const { transfers, noContestGames } = await calculateSettlement(room.id);
            await saveSettlement(room.id, transfers);
            broadcastSettlementReady(room.id, { transfers, noContestGames });
          }
        }

        broadcastGameFinished(prev.id, winner);
      }
    }
  } catch (err) {
    console.error('pollOnce error:', err.message);
  } finally {
    running = false;
  }
}

function startPolling() {
  cron.schedule('*/30 * * * * *', pollOnce);
  console.log('Game polling started (every 30s)');
}

module.exports = { startPolling, pollOnce };
