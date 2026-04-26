const pool = require('../db/index');

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computeSettlements(members, picks) {
  const winners = [];
  const losers = [];

  for (const m of members) {
    const pick = picks.find((p) => p.user_id === m.user_id);
    if (!pick || pick.is_correct == null) continue;
    const stake = Number(m.stake);
    if (stake <= 0) continue;
    if (pick.is_correct) winners.push({ user_id: m.user_id, stake });
    else losers.push({ user_id: m.user_id, stake });
  }

  if (winners.length === 0 || losers.length === 0) {
    return { transfers: [], noContest: true };
  }

  const pool = losers.reduce((s, l) => s + l.stake, 0);
  const totalWinnerStake = winners.reduce((s, w) => s + w.stake, 0);

  const net = new Map();
  for (const l of losers) net.set(l.user_id, -l.stake);
  for (const w of winners) {
    net.set(w.user_id, (w.stake / totalWinnerStake) * pool);
  }

  const creditors = [];
  const debtors = [];
  for (const [user_id, amount] of net) {
    if (amount > 0.005) creditors.push({ user_id, amount });
    else if (amount < -0.005) debtors.push({ user_id, amount: -amount });
  }
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    transfers.push({
      fromUserId: debtors[i].user_id,
      toUserId: creditors[j].user_id,
      amount: round2(transfer),
    });
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return { transfers, noContest: false };
}

async function settleRoom(roomId) {
  const { rows: members } = await pool.query(
    `SELECT user_id, stake FROM room_members WHERE room_id = $1`,
    [roomId]
  );
  const { rows: picks } = await pool.query(
    `SELECT user_id, is_correct FROM picks WHERE room_id = $1 AND pick_type = 'winner'`,
    [roomId]
  );

  const { transfers, noContest } = computeSettlements(members, picks);

  if (!noContest && transfers.length) {
    for (const t of transfers) {
      await pool.query(
        `INSERT INTO settlements (room_id, from_user_id, to_user_id, amount)
         VALUES ($1, $2, $3, $4)`,
        [roomId, t.fromUserId, t.toUserId, t.amount]
      );
    }
  }

  return transfers;
}

module.exports = { computeSettlements, settleRoom };
