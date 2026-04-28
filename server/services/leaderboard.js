const pool = require('../db/index');

function projectWinner(game) {
  if (game.status === 'finished') return game.winner;
  if (game.status === 'live') {
    if (game.home_score === game.away_score) return null;
    return game.home_score > game.away_score ? game.home_team : game.away_team;
  }
  return null;
}

function computeNetPositions(members, picks, projectedWinner) {
  const winners = [];
  const losers = [];
  const picksByUser = new Map(picks.map((p) => [p.user_id, p]));

  for (const m of members) {
    const pick = picksByUser.get(m.user_id);
    const stake = Number(m.stake);
    if (!pick || stake <= 0 || !projectedWinner) continue;
    if (pick.pick_value === projectedWinner) winners.push({ user_id: m.user_id, stake });
    else losers.push({ user_id: m.user_id, stake });
  }

  const noContest = winners.length === 0 || losers.length === 0;
  const net = new Map();
  if (!noContest) {
    const losersPool = losers.reduce((s, l) => s + l.stake, 0);
    const totalWinnerStake = winners.reduce((s, w) => s + w.stake, 0);
    for (const l of losers) net.set(l.user_id, -l.stake);
    for (const w of winners) net.set(w.user_id, (w.stake / totalWinnerStake) * losersPool);
  }
  return { net, noContest };
}

async function calculateLeaderboard(roomId) {
  const { rows: roomRows } = await pool.query(
    `SELECT r.id, g.id AS game_id, g.home_team, g.away_team,
            g.home_score, g.away_score, g.status, g.winner
     FROM rooms r JOIN games g ON g.id = r.game_id
     WHERE r.id = $1`,
    [roomId]
  );
  if (!roomRows.length) return null;
  const game = roomRows[0];

  const { rows: members } = await pool.query(
    `SELECT rm.user_id, rm.stake, u.username
     FROM room_members rm JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = $1`,
    [roomId]
  );

  const { rows: picks } = await pool.query(
    `SELECT user_id, pick_value, is_correct
     FROM picks WHERE room_id = $1 AND pick_type = 'winner'`,
    [roomId]
  );

  const projectedWinner = projectWinner(game);
  const { net, noContest } = computeNetPositions(members, picks, projectedWinner);
  const picksByUser = new Map(picks.map((p) => [p.user_id, p]));

  const ranked = members
    .map((m) => {
      const pick = picksByUser.get(m.user_id);
      const isCorrect = game.status === 'finished' ? pick?.is_correct === true : null;
      const correctPicks = isCorrect ? 1 : 0;
      return {
        userId: m.user_id,
        username: m.username,
        stake: Number(m.stake),
        pickValue: pick?.pick_value ?? null,
        isCorrect,
        correctPicks,
        netPosition: Math.round((net.get(m.user_id) ?? 0) * 100) / 100,
      };
    })
    .sort((a, b) => b.netPosition - a.netPosition || a.username.localeCompare(b.username));

  return {
    gameStatus: game.status,
    projectedWinner,
    noContest,
    members: ranked,
    awayTeam: game.away_team,
    homeTeam: game.home_team,
    awayScore: game.away_score,
    homeScore: game.home_score,
  };
}

module.exports = { calculateLeaderboard, computeNetPositions, projectWinner };
