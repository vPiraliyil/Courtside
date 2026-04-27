const pool = require('../db/index');

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeGameNet(memberRows, pickRows) {
  const winners = [];
  const losers = [];
  const picksByUser = new Map(pickRows.map((p) => [p.user_id, p]));

  for (const m of memberRows) {
    const pick = picksByUser.get(m.user_id);
    const stake = Number(m.stake);
    if (!pick || stake <= 0 || pick.is_correct == null) continue;
    if (pick.is_correct) winners.push({ user_id: m.user_id, stake });
    else losers.push({ user_id: m.user_id, stake });
  }

  if (winners.length === 0 || losers.length === 0) {
    return { net: new Map(), noContest: true };
  }

  const losersPool = losers.reduce((s, l) => s + l.stake, 0);
  const totalWinnerStake = winners.reduce((s, w) => s + w.stake, 0);

  const net = new Map();
  for (const l of losers) net.set(l.user_id, -l.stake);
  for (const w of winners) net.set(w.user_id, (w.stake / totalWinnerStake) * losersPool);
  return { net, noContest: false };
}

function minimumTransfers(netByUser, usernameById) {
  const creditors = [];
  const debtors = [];
  for (const [userId, amount] of netByUser) {
    if (amount > 0.005) creditors.push({ userId, amount });
    else if (amount < -0.005) debtors.push({ userId, amount: -amount });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({
      fromUserId: debtors[i].userId,
      toUserId: creditors[j].userId,
      fromUsername: usernameById.get(debtors[i].userId) ?? null,
      toUsername: usernameById.get(creditors[j].userId) ?? null,
      amount: round2(amount),
    });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return transfers;
}

async function calculateSettlement(roomId) {
  const { rows: members } = await pool.query(
    `SELECT rm.user_id, rm.stake, u.username
     FROM room_members rm JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = $1`,
    [roomId]
  );

  const { rows: picks } = await pool.query(
    `SELECT p.user_id, p.game_id, p.pick_value, p.is_correct,
            g.home_team, g.away_team
     FROM picks p JOIN games g ON g.id = p.game_id
     WHERE p.room_id = $1 AND p.pick_type = 'winner'`,
    [roomId]
  );

  const usernameById = new Map(members.map((m) => [m.user_id, m.username]));

  const picksByGame = new Map();
  for (const p of picks) {
    if (!picksByGame.has(p.game_id)) picksByGame.set(p.game_id, []);
    picksByGame.get(p.game_id).push(p);
  }

  const aggregateNet = new Map();
  const noContestGames = [];

  for (const [gameId, gamePicks] of picksByGame) {
    const { net, noContest } = computeGameNet(members, gamePicks);
    if (noContest) {
      const sample = gamePicks[0];
      noContestGames.push({
        gameId,
        homeTeam: sample?.home_team ?? null,
        awayTeam: sample?.away_team ?? null,
        pickValue: sample?.pick_value ?? null,
      });
      continue;
    }
    for (const [userId, amount] of net) {
      aggregateNet.set(userId, (aggregateNet.get(userId) ?? 0) + amount);
    }
  }

  const transfers = minimumTransfers(aggregateNet, usernameById);

  return { transfers, noContestGames };
}

async function saveSettlement(roomId, transfers) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM settlements WHERE room_id = $1`, [roomId]);
    for (const t of transfers) {
      await client.query(
        `INSERT INTO settlements (room_id, from_user_id, to_user_id, amount)
         VALUES ($1, $2, $3, $4)`,
        [roomId, t.fromUserId, t.toUserId, t.amount]
      );
    }
    await client.query(`UPDATE rooms SET status = 'settled' WHERE id = $1`, [roomId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getSavedSettlement(roomId) {
  const { rows } = await pool.query(
    `SELECT s.from_user_id, s.to_user_id, s.amount,
            uf.username AS from_username, ut.username AS to_username
     FROM settlements s
     JOIN users uf ON uf.id = s.from_user_id
     JOIN users ut ON ut.id = s.to_user_id
     WHERE s.room_id = $1
     ORDER BY s.amount DESC`,
    [roomId]
  );
  return rows.map((r) => ({
    fromUserId: r.from_user_id,
    toUserId: r.to_user_id,
    fromUsername: r.from_username,
    toUsername: r.to_username,
    amount: Number(r.amount),
  }));
}

// Backwards-compat for existing pollService callers.
async function settleRoom(roomId) {
  const { transfers } = await calculateSettlement(roomId);
  await saveSettlement(roomId, transfers);
  return transfers;
}

module.exports = {
  calculateSettlement,
  saveSettlement,
  getSavedSettlement,
  settleRoom,
  computeGameNet,
  minimumTransfers,
};
