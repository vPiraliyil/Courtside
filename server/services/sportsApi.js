const axios = require('axios');

const SCOREBOARD_URL = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';

function mapGame(g) {
  let status = 'scheduled';
  if (g.gameStatus === 2) status = 'live';
  else if (g.gameStatus === 3) status = 'finished';

  return {
    external_id: g.gameId,
    home_team: `${g.homeTeam.teamCity} ${g.homeTeam.teamName}`,
    away_team: `${g.awayTeam.teamCity} ${g.awayTeam.teamName}`,
    home_score: g.homeTeam.score ?? 0,
    away_score: g.awayTeam.score ?? 0,
    status,
    starts_at: g.gameTimeUTC,
  };
}

async function fetchTodaysGames() {
  const { data } = await axios.get(SCOREBOARD_URL);
  return (data.scoreboard?.games || []).map(mapGame);
}

async function fetchGameById(externalId) {
  const games = await fetchTodaysGames();
  return games.find((g) => g.external_id === externalId) || null;
}

module.exports = { fetchTodaysGames, fetchGameById };
