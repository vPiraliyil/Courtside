const pool = require('../db/index');

async function submitPick(userId, roomId, pickValue) {
  const { rows } = await pool.query(
    `SELECT r.game_id, g.starts_at, g.home_team, g.away_team
     FROM room_members rm
     JOIN rooms r ON r.id = rm.room_id
     JOIN games g ON g.id = r.game_id
     WHERE rm.room_id = $1 AND rm.user_id = $2`,
    [roomId, userId]
  );

  if (!rows.length) {
    const err = new Error('Not a member of this room');
    err.status = 403;
    throw err;
  }

  const { game_id, starts_at, home_team, away_team } = rows[0];

  if (new Date(starts_at) <= new Date()) {
    const err = new Error('Game has already started');
    err.status = 400;
    throw err;
  }

  if (pickValue !== home_team && pickValue !== away_team) {
    const err = new Error('Invalid pick value');
    err.status = 400;
    throw err;
  }

  const { rows: pick } = await pool.query(
    `INSERT INTO picks (room_id, user_id, game_id, pick_type, pick_value)
     VALUES ($1, $2, $3, 'winner', $4)
     ON CONFLICT (room_id, user_id, game_id, pick_type)
     DO UPDATE SET pick_value = EXCLUDED.pick_value, locked_at = NOW()
     RETURNING *`,
    [roomId, userId, game_id, pickValue]
  );

  return pick[0];
}

async function getPicksForRoom(roomId) {
  const { rows } = await pool.query(
    `SELECT p.*, u.username
     FROM picks p JOIN users u ON u.id = p.user_id
     WHERE p.room_id = $1`,
    [roomId]
  );
  return rows;
}

async function evaluatePicks(gameId, winner) {
  await pool.query(
    `UPDATE picks SET is_correct = (pick_value = $2)
     WHERE game_id = $1 AND pick_type = 'winner'`,
    [gameId, winner]
  );
}

module.exports = { submitPick, getPicksForRoom, evaluatePicks };
