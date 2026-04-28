// Maps NBA team names to ESPN CDN logo URLs.
// Covers exact names from the NBA CDN ({teamCity} {teamName}),
// plus known variants for teams whose city abbreviation differs.

const NAME_TO_ABBR = {
  'Atlanta Hawks': 'atl',
  'Boston Celtics': 'bos',
  'Brooklyn Nets': 'bkn',
  'Charlotte Hornets': 'cha',
  'Chicago Bulls': 'chi',
  'Cleveland Cavaliers': 'cle',
  'Dallas Mavericks': 'dal',
  'Denver Nuggets': 'den',
  'Detroit Pistons': 'det',
  'Golden State Warriors': 'gsw',
  'Houston Rockets': 'hou',
  'Indiana Pacers': 'ind',
  'LA Clippers': 'lac',
  'Los Angeles Clippers': 'lac',
  'L.A. Clippers': 'lac',
  'Los Angeles Lakers': 'lal',
  'LA Lakers': 'lal',
  'L.A. Lakers': 'lal',
  'Memphis Grizzlies': 'mem',
  'Miami Heat': 'mia',
  'Milwaukee Bucks': 'mil',
  'Minnesota Timberwolves': 'min',
  'New Orleans Pelicans': 'no',
  'New York Knicks': 'ny',
  'Oklahoma City Thunder': 'okc',
  'Orlando Magic': 'orl',
  'Philadelphia 76ers': 'phi',
  'Phoenix Suns': 'phx',
  'Portland Trail Blazers': 'por',
  'Sacramento Kings': 'sac',
  'San Antonio Spurs': 'sa',
  'Toronto Raptors': 'tor',
  'Utah Jazz': 'utah',
  'Washington Wizards': 'wsh',
};

// Fallback: match by the last word(s) of the team name (the nickname).
// e.g. "Lakers" → lal, "Celtics" → bos. Avoids false matches on city-only.
const NICKNAME_TO_ABBR = Object.fromEntries(
  Object.entries(NAME_TO_ABBR).map(([full, abbr]) => {
    const parts = full.split(' ');
    // Use last word as nickname key; multi-word nicknames (Trail Blazers, Timberwolves) use last word
    return [parts[parts.length - 1].toLowerCase(), abbr];
  })
);

export function getTeamLogoUrl(teamName) {
  if (!teamName) return null;
  const exact = NAME_TO_ABBR[teamName];
  if (exact) return `https://a.espncdn.com/i/teamlogos/nba/500/${exact}.png`;

  // Case-insensitive exact match
  const lower = teamName.toLowerCase();
  const ciMatch = Object.entries(NAME_TO_ABBR).find(([k]) => k.toLowerCase() === lower);
  if (ciMatch) return `https://a.espncdn.com/i/teamlogos/nba/500/${ciMatch[1]}.png`;

  // Nickname fallback: last word of the provided name
  const lastWord = teamName.split(' ').pop().toLowerCase();
  const nickMatch = NICKNAME_TO_ABBR[lastWord];
  if (nickMatch) return `https://a.espncdn.com/i/teamlogos/nba/500/${nickMatch}.png`;

  return null;
}
