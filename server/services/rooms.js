const pool = require('../db/index');

function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function createRoom(userId, gameId, name) {
  const inviteCode = generateInviteCode();
  const { rows } = await pool.query(
    `INSERT INTO rooms (invite_code, name, game_id, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [inviteCode, name, gameId, userId]
  );
  const room = rows[0];
  await pool.query(
    `INSERT INTO room_members (room_id, user_id, stake) VALUES ($1, $2, 0)`,
    [room.id, userId]
  );
  return room;
}

async function joinRoom(userId, inviteCode, stake) {
  const { rows } = await pool.query(
    `SELECT r.*, g.starts_at FROM rooms r
     JOIN games g ON g.id = r.game_id
     WHERE r.invite_code = $1`,
    [inviteCode]
  );
  if (!rows.length) {
    const err = new Error('Room not found');
    err.status = 404;
    throw err;
  }
  const room = rows[0];

  if (new Date(room.starts_at) <= new Date()) {
    const err = new Error('Game has already started');
    err.status = 400;
    throw err;
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2`,
    [room.id, userId]
  );
  if (existing.length) {
    const err = new Error('Already a member of this room');
    err.status = 409;
    throw err;
  }

  await pool.query(
    `INSERT INTO room_members (room_id, user_id, stake) VALUES ($1, $2, $3)`,
    [room.id, userId, stake]
  );
  return room;
}

async function getRoomWithMembers(roomId) {
  const { rows } = await pool.query(
    `SELECT r.*, g.home_team, g.away_team, g.status AS game_status,
            g.starts_at, g.home_score, g.away_score
     FROM rooms r JOIN games g ON g.id = r.game_id
     WHERE r.id = $1`,
    [roomId]
  );
  if (!rows.length) return null;

  const { rows: members } = await pool.query(
    `SELECT rm.user_id, rm.stake, rm.joined_at, u.username
     FROM room_members rm JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = $1
     ORDER BY rm.joined_at ASC`,
    [roomId]
  );

  return { ...rows[0], members };
}

async function getRoomByInviteCode(inviteCode) {
  const { rows } = await pool.query(
    `SELECT r.*, g.home_team, g.away_team, g.status AS game_status, g.starts_at
     FROM rooms r JOIN games g ON g.id = r.game_id
     WHERE r.invite_code = $1`,
    [inviteCode]
  );
  if (!rows.length) return null;

  const { rows: members } = await pool.query(
    `SELECT rm.user_id, rm.stake, u.username
     FROM room_members rm JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = $1
     ORDER BY rm.joined_at ASC`,
    [rows[0].id]
  );

  return { ...rows[0], members };
}

async function getUserRooms(userId) {
  const { rows } = await pool.query(
    `SELECT r.*, g.home_team, g.away_team, g.status AS game_status, g.starts_at,
            COUNT(rm2.id)::int AS member_count
     FROM rooms r
     JOIN games g ON g.id = r.game_id
     JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = $1
     JOIN room_members rm2 ON rm2.room_id = r.id
     GROUP BY r.id, g.home_team, g.away_team, g.status, g.starts_at
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

async function updateStake(roomId, userId, stake) {
  const { rows } = await pool.query(
    `SELECT rm.id, g.starts_at FROM room_members rm
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
  if (new Date(rows[0].starts_at) <= new Date()) {
    const err = new Error('Game has already started');
    err.status = 400;
    throw err;
  }
  await pool.query(
    `UPDATE room_members SET stake = $1 WHERE room_id = $2 AND user_id = $3`,
    [stake, roomId, userId]
  );
}

module.exports = { createRoom, joinRoom, getRoomWithMembers, getRoomByInviteCode, getUserRooms, updateStake };
