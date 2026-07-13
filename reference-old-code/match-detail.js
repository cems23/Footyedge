// pages/api/match-detail.js
const FS_BASE = "https://api.football-data-api.com";

export default async function handler(req, res) {
  const fsKey = process.env.FOOTYSTATS_API_KEY;
  const { homeId, awayId, leagueId } = req.query;

  if (!fsKey || fsKey === "tu_footystats_key_aqui") {
    return res.status(200).json({ success: true, demo: true, ...DEMO_DETAIL });
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    // Traemos todos los partidos de la liga y filtramos por equipo en el código
    const [leagueRes, homePlayersRes, awayPlayersRes] = await Promise.all([
      fetch(`${FS_BASE}/league-matches?key=${fsKey}&league_id=${leagueId}&max_per_page=300`),
      fetch(`${FS_BASE}/team-players?key=${fsKey}&team_id=${homeId}`),
      fetch(`${FS_BASE}/team-players?key=${fsKey}&team_id=${awayId}`),
    ]);

    const [leagueJson, homePlayersJson, awayPlayersJson] = await Promise.all([
      leagueRes.json(), homePlayersRes.json(), awayPlayersRes.json(),
    ]);

    const allMatches = Array.isArray(leagueJson.data) ? leagueJson.data : [];
    const completed  = allMatches.filter(m => m.date_unix < now && m.homeGoalCount != null);

    // Partidos del equipo local
    const homeMatches = completed
      .filter(m => String(m.homeID) === String(homeId) || String(m.awayID) === String(homeId))
      .sort((a, b) => b.date_unix - a.date_unix);

    // Partidos del equipo visitante
    const awayMatches = completed
      .filter(m => String(m.homeID) === String(awayId) || String(m.awayID) === String(awayId))
      .sort((a, b) => b.date_unix - a.date_unix);

    // H2H: partidos donde se enfrentaron ambos equipos
    const h2hRaw = completed
      .filter(m =>
        (String(m.homeID) === String(homeId) && String(m.awayID) === String(awayId)) ||
        (String(m.homeID) === String(awayId) && String(m.awayID) === String(homeId))
      )
      .sort((a, b) => b.date_unix - a.date_unix)
      .slice(0, 8);

    const h2hMatches = h2hRaw.map(m => ({
      id: m.id,
      date_unix: m.date_unix,
      home_name: m.home_name,
      away_name: m.away_name,
      home_score: m.homeGoalCount,
      away_score: m.awayGoalCount,
      btts: m.homeGoalCount > 0 && m.awayGoalCount > 0,
      over25: (m.homeGoalCount + m.awayGoalCount) > 2.5,
      total_corners: m.totalCornerCount || null,
    }));

    // Stats H2H
    const h2hStats = h2hMatches.reduce((acc, m) => {
      acc.total++;
      const homeIsHome = String(m.homeID) === String(homeId);
      const homeWon = homeIsHome ? m.homeGoalCount > m.awayGoalCount : m.awayGoalCount > m.homeGoalCount;
      const awayWon = homeIsHome ? m.awayGoalCount > m.homeGoalCount : m.homeGoalCount > m.awayGoalCount;
      if (homeWon) acc.homeWins++;
      else if (awayWon) acc.awayWins++;
      else acc.draws++;
      if (m.btts)   acc.btts++;
      if (m.over25) acc.over25++;
      if (m.total_corners) { acc.cornersTotal += m.total_corners; acc.cornersCount++; }
      return acc;
    }, { total:0, homeWins:0, draws:0, awayWins:0, btts:0, over25:0, cornersTotal:0, cornersCount:0 });

    if (h2hStats.total > 0) {
      h2hStats.bttsPct   = Math.round((h2hStats.btts   / h2hStats.total) * 100);
      h2hStats.over25Pct = Math.round((h2hStats.over25 / h2hStats.total) * 100);
      h2hStats.avgCorners = h2hStats.cornersCount > 0
        ? (h2hStats.cornersTotal / h2hStats.cornersCount).toFixed(1) : null;
    }

    const mapMatch = (m, teamId) => ({
      id: m.id,
      date_unix: m.date_unix,
      home_name: m.home_name,
      away_name: m.away_name,
      home_score: m.homeGoalCount,
      away_score: m.awayGoalCount,
      is_home: String(m.homeID) === String(teamId),
      btts: m.homeGoalCount > 0 && m.awayGoalCount > 0,
      over25: (m.homeGoalCount + m.awayGoalCount) > 2.5,
      total_corners: m.totalCornerCount || null,
    });

    const homeLast5 = homeMatches.slice(0, 5).map(m => mapMatch(m, homeId));
    const awayLast5 = awayMatches.slice(0, 5).map(m => mapMatch(m, awayId));

    function parseInjuries(json) {
      const players = Array.isArray(json.data) ? json.data : [];
      return players
        .filter(p => p.injury_status && p.injury_status !== "" && p.injury_status !== "fit")
        .map(p => ({
          name: p.full_name || p.known_name,
          status: p.injury_status,
          position: p.position,
          return_date: p.injury_return_date || null,
        }));
    }

    return res.status(200).json({
      success: true,
      h2h: h2hMatches,
      h2hStats,
      homeLast5,
      awayLast5,
      homeInjuries: parseInjuries(homePlayersJson),
      awayInjuries: parseInjuries(awayPlayersJson),
    });

  } catch (e) {
    console.error("match-detail error:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
}

const DEMO_DETAIL = {
  h2hStats: { total:6, homeWins:3, draws:1, awayWins:2, btts:4, over25:4, bttsPct:67, over25Pct:67, avgCorners:"10.2" },
  h2h: [
    { id:1, date_unix: Date.now()/1000-2592000,  home_name:"Arsenal", away_name:"Chelsea", home_score:2, away_score:1, btts:true,  over25:true,  total_corners:11 },
    { id:2, date_unix: Date.now()/1000-7776000,  home_name:"Chelsea", away_name:"Arsenal", home_score:1, away_score:1, btts:true,  over25:false, total_corners:9  },
  ],
  homeLast5: [
    { id:10, date_unix: Date.now()/1000-86400,   home_name:"Arsenal", away_name:"Man City",  home_score:2, away_score:0, is_home:true,  btts:false, over25:false },
    { id:11, date_unix: Date.now()/1000-604800,  home_name:"Liverpool",away_name:"Arsenal",  home_score:1, away_score:2, is_home:false, btts:true,  over25:true  },
  ],
  awayLast5: [
    { id:20, date_unix: Date.now()/1000-86400,   home_name:"Chelsea", away_name:"Tottenham", home_score:1, away_score:1, is_home:true,  btts:true,  over25:false },
  ],
  homeInjuries: [{ name:"Gabriel Jesus", status:"injured", position:"Forward", return_date:"2026-03-15" }],
  awayInjuries: [{ name:"Reece James",   status:"injured", position:"Defender", return_date:"2026-03-10" }],
};
