// pages/api/odds.js
// The Odds API — mejores odds del mercado con caché de 60 minutos

const ODDS_BASE = "https://api.the-odds-api.com/v4";
const ODDS_KEY  = process.env.ODDS_API_KEY;

// Mapa FootyStats competition_id → The Odds API sport_key
const LEAGUE_MAP = {
  15050: "soccer_epl",
  17      : "soccer_spain_la_liga",
  13      : "soccer_germany_bundesliga",
  16      : "soccer_italy_serie_a",
  25      : "soccer_france_ligue_one",
  302     : "soccer_uefa_champs_league",
  306     : "soccer_uefa_europa_league",
  307     : "soccer_uefa_europa_conference_league",
  244     : "soccer_usa_mls",
  18      : "soccer_netherlands_eredivisie",
  29      : "soccer_portugal_primeira_liga",
  12      : "soccer_efl_champ",
  14      : "soccer_england_league1",
};

// Caché in-memory 60 minutos
const cache = {};
const CACHE_TTL = 60 * 60 * 1000;

function getCached(key) {
  const e = cache[key];
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { delete cache[key]; return null; }
  return e.data;
}
function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

// Obtiene la mejor odd disponible entre todos los bookmakers para un outcome
function getBestOdd(bookmakers, marketKey, outcomeName) {
  let best = null;
  let bestBook = null;
  for (const bm of bookmakers) {
    const market = bm.markets?.find(mk => mk.key === marketKey);
    if (!market) continue;
    const outcome = market.outcomes?.find(o => o.name === outcomeName);
    if (!outcome) continue;
    if (best === null || outcome.price > best) {
      best = outcome.price;
      bestBook = bm.title;
    }
  }
  return best ? { odd: best, book: bestBook } : null;
}

export default async function handler(req, res) {
  const { competition_ids } = req.query;

  if (!ODDS_KEY) {
    return res.status(200).json({ success: false, error: "ODDS_API_KEY not configured", odds: {} });
  }

  const ids = (competition_ids || "").split(",").map(Number).filter(Boolean);
  const sportKeys = [...new Set(ids.map(id => LEAGUE_MAP[id]).filter(Boolean))];

  if (sportKeys.length === 0) {
    return res.status(200).json({ success: true, odds: {} });
  }

  const result = {}; // { "home_team|away_team": { h2h: {...}, totals: {...} } }

  try {
    await Promise.all(sportKeys.map(async (sportKey) => {
      const cacheKey = `odds_${sportKey}`;
      let data = getCached(cacheKey);

      if (!data) {
        const url = `${ODDS_BASE}/sports/${sportKey}/odds/?apiKey=${ODDS_KEY}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
        const r = await fetch(url);
        if (!r.ok) return;
        data = await r.json();
        if (Array.isArray(data)) setCache(cacheKey, data);
      }

      if (!Array.isArray(data)) return;

      for (const game of data) {
        const key = `${game.home_team}|${game.away_team}`;
        const bms = game.bookmakers || [];

        // 1X2
        const home = getBestOdd(bms, "h2h", game.home_team);
        const draw = getBestOdd(bms, "h2h", "Draw");
        const away = getBestOdd(bms, "h2h", game.away_team);

        // Over/Under 2.5
        const over25  = getBestOdd(bms, "totals", "Over");
        const under25 = getBestOdd(bms, "totals", "Under");

        result[key] = {
          home_team: game.home_team,
          away_team: game.away_team,
          commence_time: game.commence_time,
          h2h: { home, draw, away },
          totals: { over25, under25 },
          bookmakers_count: bms.length,
        };
      }
    }));

    return res.status(200).json({ success: true, odds: result });

  } catch (e) {
    console.error("odds error:", e);
    return res.status(500).json({ success: false, error: e.message, odds: {} });
  }
}
