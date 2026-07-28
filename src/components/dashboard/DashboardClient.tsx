'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ComboGenerator } from './widgets/ComboGenerator'
import AnimatedBackground from '@/components/AnimatedBackground'
import AIPerformanceWidget from './AIPerformanceWidget'
import { animate, stagger, createScope } from 'animejs'

// ── TYPES ────────────────────────────────────────
interface Ranking {
  rank: number
  match_id: string
  market: string
  market_label: string
  odds: number
  ev: number
  edge: number
  confidence_score: number
  rank_score: number
  is_pro_only: boolean
  model_prob_raw?: number | null
  market_implied_prob?: number | null
  matches?: {
    id: string
    home_team_name: string
    away_team_name: string
    home_team_logo: string
    away_team_logo: string
    league_name: string
    league_id?: number
    kickoff_at: string
    model_predictions?: Array<{
      prob_btts: number
      prob_draw: number
      prob_over25: number
      prob_away_win: number
      prob_home_win: number
      expected_goals_home: number
      expected_goals_away: number
    }>
  }
}

interface MatchData {
  id: string
  status?: string
  home_team_name: string
  away_team_name: string
  home_team_logo: string
  away_team_logo: string
  league_name: string
  kickoff_at: string
  prob_btts: number
  prob_over15: number
  prob_over25: number
  prob_home_win: number
  prob_draw: number
  prob_away_win: number
  expected_goals_home: number
  expected_goals_away: number
  home_goals?: number | null
  away_goals?: number | null
  odds_over25?: number | null
  odds_home?: number | null
  odds_away?: number | null
  league_id?: number
}

interface UserPick {
  id: string
  market: string
  odds: number
  stake: number
  ev: number
  edge: number
  confidence_score: number
  result: string
  created_at: string
  matches: { home_team_name: string; away_team_name: string; league_name: string; kickoff_at: string }
}

interface Performance {
  roi: number
  win_rate: number
  settled_bets: number
  wins: number
  losses: number
  avg_ev: number
  avg_odds: number
}

interface Props {
  rankings: Ranking[]
  picks: UserPick[]
  allMatches: MatchData[]
  btts: MatchData[]
  over15: MatchData[]
  over25: MatchData[]
  corners?: MatchData[]
  firsthalf?: MatchData[]
  doublechance?: MatchData[]
  performance: Performance | null
  user: { plan: string; picks_today: number; email?: string }
  today: string
  lang?: string
}

// ── HELPERS ──────────────────────────────────────
// Mapa definitivo por league_id — inmune a cambios de nombre
const LEAGUE_FLAG_BY_ID: Record<number, string> = {
  39: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', // Premier League
  40: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', // Championship
  41: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', // League One
  169: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', // Scottish PL
  140: '🇪🇸', // La Liga
  141: '🇪🇸', // Segunda División
  78: '🇩🇪',  // Bundesliga
  79: '🇩🇪',  // 2. Bundesliga
  135: '🇮🇹', // Serie A
  136: '🇮🇹', // Serie B
  61: '🇫🇷',  // Ligue 1
  62: '🇫🇷',  // Ligue 2
  88: '🇳🇱',  // Eredivisie
  94: '🇵🇹',  // Primeira Liga
  203: '🇹🇷', // Süper Lig
  144: '🇧🇪', // Pro League
  128: '🇦🇷', // Liga Argentina
  71: '🇧🇷',  // Brasileirao
  253: '🇺🇸', // MLS
  262: '🇲🇽', // Liga MX
  307: '🇸🇦', // Saudi Pro
  235: '🇷🇺', // RPL
  119: '🇩🇰', // Superliga DK
  113: '🇸🇪', // Allsvenskan
  103: '🇳🇴', // Eliteserien
  106: '🇵🇱', // Ekstraklasa
  218: '🇦🇹', // Austria BL
  197: '🇬🇷', // Super League 1
  207: '🇨🇭', // Swiss SL
  283: '🇨🇴', // Liga BetPlay
  239: '🇨🇱', // Primera Chile
  242: '🇺🇾', // Primera Uruguay
  332: '🇮🇷', // Persian Gulf
  188: '🇦🇺', // A-League
  292: '🇰🇷', // K League 1
  2:   '🏆',  // Champions League
}

// Fallback por nombre para compatibilidad
const LEAGUE_FLAGS: Record<string, string> = {
  'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Championship': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'League One': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Scottish PL': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'La Liga': '🇪🇸', 'Segunda División': '🇪🇸',
  'Bundesliga': '🇩🇪', '2. Bundesliga': '🇩🇪', 'Serie A': '🇮🇹', 'Serie B': '🇮🇹',
  'Ligue 1': '🇫🇷', 'Ligue 2': '🇫🇷', 'Eredivisie': '🇳🇱', 'Primeira Liga': '🇵🇹',
  'Süper Lig': '🇹🇷', 'Jupiler Pro League': '🇧🇪', 'Pro League': '🇧🇪',
  'Liga Argentina': '🇦🇷', 'Brasileirao': '🇧🇷', 'MLS': '🇺🇸', 'Liga MX': '🇲🇽',
  'Saudi Pro': '🇸🇦', 'RPL': '🇷🇺', 'Superliga DK': '🇩🇰', 'Allsvenskan': '🇸🇪',
  'Eliteserien': '🇳🇴', 'Ekstraklasa': '🇵🇱', 'Austria BL': '🇦🇹',
  'Super League 1': '🇬🇷', 'Swiss SL': '🇨🇭', 'Liga BetPlay': '🇨🇴',
  'Primera Chile': '🇨🇱', 'Primera Uruguay': '🇺🇾', 'A-League': '🇦🇺',
  'K League 1': '🇰🇷',
  'Super Liga IR': '🇮🇷', 'Champions League': '🏆', 'UEFA Champions League': '🏆',
}

const getFlag = (leagueName: string, leagueId?: number) =>
  (leagueId && LEAGUE_FLAG_BY_ID[leagueId]) || LEAGUE_FLAGS[leagueName] || '🌍'

const mktBadge = (market: string, lang: string = 'es') => {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    over25: { label: 'Ov2.5', bg: '#1a3a1a', color: '#4caf50' },
    over15: { label: 'Ov1.5', bg: '#1a3a1a', color: '#81c784' },
    btts:   { label: 'BTTS',  bg: '#1a2a3a', color: '#64b5f6' },
    home:   { label: lang === 'en' ? 'Home' : 'Local',  bg: '#1a1a3a', color: '#ce93d8' },
    away:   { label: lang === 'en' ? 'Away' : 'Visita', bg: '#3a1a1a', color: '#ef9a9a' },
    draw:   { label: lang === 'en' ? 'Draw' : 'Empate', bg: '#2a2a1a', color: '#fff176' },
  }
  return map[market] ?? { label: market, bg: '#1a2a3a', color: '#90caf9' }
}

const probColor = (p: number) => p >= 0.70 ? '#00c878' : p >= 0.55 ? '#ffb400' : p >= 0.40 ? '#6b7fa3' : '#3a4a5a'
const timeStr = (iso: string, lang: string = 'es') => new Date(iso).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' })
const dateStr = (iso: string, lang: string = 'es') => new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { day: '2-digit', month: '2-digit' })

// ── NOTIF ─────────────────────────────────────────
const MOCK_MATCHES: any[] = (() => {
  const h = (n: number) => new Date(Date.now() + n * 3600e3).toISOString()
  const mk = (id: number, league_name: string, league_id: number, home: string, away: string, k: number, pb: number, p15: number, p25: number, ph: number, pa: number, oh: number, oa: number, o25: number, status = 'NS') => ({ id, league_name, league_id, home_team_name: home, away_team_name: away, kickoff_at: h(k), prob_btts: pb, prob_over15: p15, prob_over25: p25, prob_home_win: ph, prob_away_win: pa, odds_home: oh, odds_away: oa, odds_over25: o25, status })
  return [
    mk(9001, 'La Liga', 140, 'Girona', 'Real Betis', 2, 0.68, 0.86, 0.64, 0.44, 0.29, 1.95, 3.9, 1.92),
    mk(9002, 'Premier League', 39, 'Brighton', 'Newcastle', 3, 0.71, 0.88, 0.69, 0.41, 0.33, 2.25, 3.1, 1.85),
    mk(9003, 'Bundesliga', 78, 'Leverkusen', 'Stuttgart', 4, 0.74, 0.91, 0.76, 0.55, 0.22, 1.7, 4.6, 1.62, '1H'),
    mk(9004, 'Serie A', 135, 'Atalanta', 'Como', 5, 0.63, 0.84, 0.61, 0.58, 0.19, 1.6, 5.4, 2.0),
    mk(9005, 'Eredivisie', 88, 'Twente', 'AZ Alkmaar', 6, 0.7, 0.9, 0.72, 0.38, 0.35, 2.4, 2.8, 1.75),
    mk(9006, 'Ligue 1', 61, 'Toulouse', 'Lille', 7, 0.57, 0.79, 0.52, 0.33, 0.4, 2.9, 2.45, 2.1),
    mk(9007, 'Úrvalsdeild', 164, 'Víkingur R.', 'Breidablik', 8, 0.66, 0.87, 0.67, 0.36, 0.37, 2.6, 2.55, 1.8),
    mk(9008, 'Championship', 40, 'Leeds', 'Coventry', 9, 0.52, 0.76, 0.47, 0.51, 0.24, 1.8, 4.3, 2.25),
  ]
})()
const MOCK_RANKINGS: any[] = [
  { rank: 1, match_id: 9003, market: 'over25', ev: 0.142, odds: 1.62, is_pro_only: false, matches: { league_name: 'Bundesliga', league_id: 78, home_team_name: 'Leverkusen', away_team_name: 'Stuttgart' } },
  { rank: 2, match_id: 9005, market: 'btts', ev: 0.118, odds: 1.75, is_pro_only: false, matches: { league_name: 'Eredivisie', league_id: 88, home_team_name: 'Twente', away_team_name: 'AZ Alkmaar' } },
  { rank: 3, match_id: 9001, market: 'draw', ev: 0.104, odds: 3.55, is_pro_only: false, matches: { league_name: 'La Liga', league_id: 140, home_team_name: 'Girona', away_team_name: 'Real Betis' } },
  { rank: 4, match_id: 9002, market: 'over15', ev: 0.089, odds: 1.28, is_pro_only: false, matches: { league_name: 'Premier League', league_id: 39, home_team_name: 'Brighton', away_team_name: 'Newcastle' } },
  { rank: 5, match_id: 9006, market: 'away', ev: 0.082, odds: 2.45, is_pro_only: true, matches: { league_name: 'Ligue 1', league_id: 61, home_team_name: 'Toulouse', away_team_name: 'Lille' } },
]

function ProbCell({ v }: { v: number }) {
  const pct = Math.round(v * 100)
  const c = probColor(v)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 17, letterSpacing: '0.03em', color: c, lineHeight: 1, textShadow: v >= 0.7 ? `0 0 12px ${c}66` : 'none' }}>{pct}%</div>
      <div style={{ height: 3, background: '#0a1628', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 2 }} />
      </div>
    </div>
  )
}

function Notif({ msg, type }: { msg: string; type: 'ok'|'warn'|'err' }) {
  return (
    <div style={{
      position: 'fixed', top: 70, right: 20, zIndex: 1000,
      background: type === 'warn' ? '#1a1600' : type === 'err' ? '#1a0000' : '#001a0d',
      border: `1px solid ${type === 'warn' ? '#ffb400' : type === 'err' ? '#ef5350' : '#00c878'}`,
      color: type === 'warn' ? '#ffb400' : type === 'err' ? '#ef5350' : '#00c878',
      padding: '12px 16px', borderRadius: 8, fontSize: 12,
      maxWidth: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      fontFamily: "'DM Mono', monospace",
    }}>
      {type === 'warn' ? '⚠ ' : type === 'err' ? '✗ ' : '✓ '}{msg}
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────

// ── VALUE RADAR COMPONENT ──────────────────────────────────────────────
function ValueRadarComponent({ data, lang }: { data: any[], lang: string }) {
  const [selected, setSelected] = useState<number|null>(null)
  const [scanAngle, setScanAngle] = useState(0)

  useEffect(() => {
    let frame: number
    let angle = 0
    const animate = () => {
      angle = (angle + 0.4) % 360
      setScanAngle(angle)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!data.length) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#4a6785' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
      <div>{lang === 'en' ? 'No data yet — click Refresh first' : 'Sin datos — haz clic en Actualizar primero'}</div>
    </div>
  )

  const maxEdge = Math.max(...data.map((d: any) => d.avg_edge))
  const cx = 200, cy = 200, maxR = 155

  const edgeColor = (edge: number) => edge >= 0.25 ? '#00c878' : edge >= 0.15 ? '#ffb400' : '#6b7fa3'

  const points = data.slice(0, 12).map((d: any, i: number) => {
    const angle = (i / Math.min(data.length, 12)) * 2 * Math.PI - Math.PI / 2
    const r = (d.avg_edge / maxEdge) * maxR * 0.80 + maxR * 0.20
    return { ...d, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  const scanRad = (scanAngle * Math.PI) / 180
  const scanX = cx + maxR * Math.cos(scanRad)
  const scanY = cy + maxR * Math.sin(scanRad)
  const sel = selected !== null ? data[selected] : null

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#00c878', letterSpacing: 6, textTransform: 'uppercase', marginBottom: 6 }}>◆ FOOTYEDGE ELITE</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 4, color: 'white', margin: 0 }}>
          VALUE <span style={{ color: '#00c878' }}>RADAR</span>
        </h2>
        <p style={{ color: '#4a6785', fontSize: 11, marginTop: 6 }}>
          {lang === 'en' ? `Market inefficiency scanner · ${data.length} leagues analyzed` : `Escáner de ineficiencias · ${data.length} ligas analizadas`}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) 1fr', gap: 20, alignItems: 'start', maxWidth: 900, margin: '0 auto' }}>
        {/* Radar */}
        <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 9, color: '#4a6785', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>RADAR SCAN</div>
          <svg width="100%" viewBox="0 0 400 400">
            {[0.25,0.5,0.75,1].map((r,i) => <circle key={i} cx={cx} cy={cy} r={maxR*r} fill="none" stroke="#00c878" strokeWidth="0.5" opacity={0.1+i*0.05} />)}
            <line x1={cx} y1={cy-maxR} x2={cx} y2={cy+maxR} stroke="#00c878" strokeWidth="0.3" opacity={0.15} />
            <line x1={cx-maxR} y1={cy} x2={cx+maxR} y2={cy} stroke="#00c878" strokeWidth="0.3" opacity={0.15} />
            <defs>
              <radialGradient id="sweep" cx="0%" cy="0%" r="100%">
                <stop offset="0%" stopColor="#00c878" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00c878" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path d={`M ${cx} ${cy} L ${scanX} ${scanY} A ${maxR} ${maxR} 0 0 1 ${cx + maxR * Math.cos(scanRad - 0.3)} ${cy + maxR * Math.sin(scanRad - 0.3)} Z`} fill="url(#sweep)" />
            <line x1={cx} y1={cy} x2={scanX} y2={scanY} stroke="#00c878" strokeWidth="1.5" opacity={0.7} />
            <circle cx={cx} cy={cy} r={4} fill="#00c878" />
            {points.map((p: any, i: number) => (
              <g key={i} style={{ cursor: 'pointer' }} onClick={() => setSelected(selected === i ? null : i)}>
                <circle cx={p.x} cy={p.y} r={selected===i ? 10 : 6+p.avg_edge*12} fill={edgeColor(p.avg_edge)} opacity={0.15}>
                  <animate attributeName="r" values={`${6+p.avg_edge*12};${10+p.avg_edge*12};${6+p.avg_edge*12}`} dur="2s" begin={`${i*0.25}s`} repeatCount="indefinite" />
                </circle>
                <circle cx={p.x} cy={p.y} r={selected===i ? 7 : 5} fill={edgeColor(p.avg_edge)} opacity={0.9} />
                <text x={p.x+(p.x>cx?10:-10)} y={p.y+4} fontSize="8" fill={selected===i?'#00c878':'#4a6785'} textAnchor={p.x>cx?'start':'end'}>
                  {p.league_name.split(' ')[0]}
                </text>
              </g>
            ))}
          </svg>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
            {[['#00c878','≥25%'],['#ffb400','15-25%'],['#6b7fa3','<15%']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                <span style={{ fontSize: 9, color: '#4a6785' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sel ? (
            <div style={{ background: 'rgba(0,200,120,0.05)', border: '1px solid rgba(0,200,120,0.25)', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 10 }}>{sel.league_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[
                  [lang==='en'?'AVG EDGE':'EDGE MEDIO', `+${(sel.avg_edge*100).toFixed(1)}%`, '#00c878'],
                  [lang==='en'?'VALUE BETS':'VALUE BETS', sel.value_bets_count, '#ce93d8'],
                  [lang==='en'?'AVG ODDS':'CUOTA MEDIA', sel.avg_odds?.toFixed(2), '#64b5f6'],
                ].map(([label,val,color]) => (
                  <div key={String(label)} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: String(color) }}>{val}</div>
                    <div style={{ fontSize: 8, color: '#4a6785', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(sel.avg_edge/maxEdge)*100}%`, background: 'linear-gradient(90deg, #00c878, #00a860)', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(13,30,53,0.4)', border: '1px dashed #1a2e4a', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>🎯</div>
              <div style={{ fontSize: 11, color: '#4a6785' }}>{lang==='en'?'Click a dot to inspect':'Haz clic en un punto para inspeccionar'}</div>
            </div>
          )}

          <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #1a2e4a', fontSize: 9, color: '#4a6785', letterSpacing: 2, textTransform: 'uppercase' }}>
              {lang==='en'?'LEAGUE RANKINGS':'RANKING DE LIGAS'}
            </div>
            {[...data].sort((a:any,b:any) => b.avg_edge - a.avg_edge).slice(0,8).map((d:any, i:number) => (
              <div key={d.league_id}
                onClick={() => setSelected(data.indexOf(d))}
                style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: 8, alignItems: 'center', padding: '7px 12px', borderBottom: i < 7 ? '1px solid #0f1e32' : 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(0,200,120,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
              >
                <span style={{ fontSize: 10, color: i<3?'#00c878':'#4a6785', fontWeight: 700 }}>#{i+1}</span>
                <span style={{ fontSize: 12, color: 'white' }}>{d.league_name}</span>
                <span style={{ fontSize: 10, color: '#4a6785' }}>{d.value_bets_count} bets</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: edgeColor(d.avg_edge), minWidth: 44, textAlign: 'right' }}>+{(d.avg_edge*100).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(13,30,53,0.4)', border: '1px solid #1a2e4a', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-around' }}>
            {[
              [lang==='en'?'TOTAL BETS':'TOTAL BETS', data.reduce((s:number,d:any)=>s+d.value_bets_count,0)],
              [lang==='en'?'AVG EDGE':'EDGE MEDIO', `+${(data.reduce((s:number,d:any)=>s+d.avg_edge,0)/data.length*100).toFixed(1)}%`],
              [lang==='en'?'TOP LEAGUE':'TOP LIGA', data[0]?.league_name?.split(' ')[0]],
            ].map(([label,val]) => (
              <div key={String(label)} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{val}</div>
                <div style={{ fontSize: 8, color: '#4a6785', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardClient({ rankings, picks = [], allMatches = [], btts = [], over15 = [], over25 = [], corners = [], firsthalf = [], doublechance = [], performance, user, today, lang = 'es' }: Props) {
  // DEV PREVIEW: mocks solo en desarrollo y solo si no hay datos reales
  if (process.env.NODE_ENV === 'development' && allMatches.length === 0 && rankings.length === 0) {
    allMatches = MOCK_MATCHES
    rankings = MOCK_RANKINGS
    btts = MOCK_MATCHES.map(m => ({ ...m, expected_goals_home: 1.1 + m.prob_btts, expected_goals_away: 0.7 + m.prob_over25 }))
    corners = MOCK_MATCHES.map(m => ({ ...m, corners_potential: 0.5 + m.prob_btts * 0.3, odds_corners_over_85: '1.85', odds_corners_over_95: '2.20' }))
    firsthalf = MOCK_MATCHES.map(m => ({ ...m, o15HT_potential: m.prob_over15 * 0.6, odds_1st_half_over05: '1.35', odds_1st_half_over15: '2.60' }))
    doublechance = MOCK_MATCHES.map(m => ({ ...m, odds_doublechance_1x: '1.28', odds_doublechance_x2: '1.55', odds_doublechance_12: '1.18' }))
  }
  const router = useRouter()
  const isPro = user.plan === 'pro' || user.plan === 'elite'
  const T = lang === 'en' ? {
    dashboard: 'Dashboard', live: 'Live', refresh: 'Refresh', logout: 'Logout',
    noLive: 'No live matches right now', upgradeTitle: '⚡ Free Plan — Limited view',
    upgradeDesc: '3 value bets · 3 BTTS · No match analysis · No H2H or stats',
    upgradeCta: 'Upgrade to Pro →', valueBets: 'Value Bets', bttsTitle: 'Best BTTS of the day',
    sort: 'Sort', allLeagues: '🌍 All', noMatches: 'No matches with these filters',
    matches: 'Matches', hot: '🔥 HOT', btts: 'BTTS ≥65%', valueBetsCount: 'Value Bets',
    hora: 'Time', loading: 'Loading...', liveNow: 'Live Now',
    upgradeElite: 'Upgrade to Elite', upgradePro: 'Upgrade to Pro',
    hiddenBets: 'value bets hidden',
    today: 'TODAY', found: 'found', seeAll: 'See all leagues',
    seeFav: 'See my', favLeagues: 'favorite leagues',
  } : {
    dashboard: 'Dashboard', live: 'En Vivo', refresh: 'Actualizar', logout: 'Salir',
    noLive: 'Sin partidos en vivo ahora mismo', upgradeTitle: '⚡ Plan Free — Vista limitada',
    upgradeDesc: '3 value bets · 3 BTTS · Sin análisis de partido · Sin H2H ni estadísticas',
    upgradeCta: 'Actualizar a Pro →', valueBets: 'Value Bets', bttsTitle: 'Mejores BTTS del día',
    sort: 'Ordenar', allLeagues: '🌍 Todas', noMatches: 'Sin partidos con estos filtros',
    matches: 'Partidos', hot: '🔥 HOT', btts: 'BTTS ≥65%', valueBetsCount: 'Value Bets',
    hora: 'Hora', loading: 'Cargando...', liveNow: 'En Vivo',
    upgradeElite: 'Actualiza a Elite', upgradePro: 'Actualiza a Pro',
    hiddenBets: 'value bets ocultas',
    today: 'HOY', found: 'encontradas', seeAll: 'Ver todas las ligas',
    seeFav: 'Ver mis', favLeagues: 'ligas favoritas',
  }
  const isElite = user.plan === 'elite'

  const [notif, setNotif] = useState<{ msg: string; type: 'ok'|'warn'|'err' } | null>(null)
  const [loading, setLoading] = useState(false)
  const [addedPicks, setAdded] = useState<number[]>([])
  const [selectedLeague, setSelectedLeague] = useState('all')
  const [sortBy, setSortBy] = useState<'hora'|'hot'|'btts'|'ov15'|'ov25'>('hora')
  const [filterBtts, setFilterBtts] = useState(0)
  const [filterOv25, setFilterOv25] = useState(0)
  const [valueBetsOpen, setValueBetsOpen] = useState(true)
  const [bttsOpen, setBttsOpen] = useState(true)
  const bttsGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bttsGridRef.current) return
    const scope = createScope({ root: bttsGridRef }).add(() => {
      animate('[data-ring]', {
        strokeDashoffset: { from: 2 * Math.PI * 24 },
        duration: 900,
        delay: stagger(70),
        ease: 'outExpo',
      })
      bttsGridRef.current?.querySelectorAll('[data-pct]').forEach((el, i) => {
        const target = Number(el.getAttribute('data-pct'))
        const counter = { val: 0 }
        animate(counter, {
          val: target,
          duration: 900,
          delay: 70 * i,
          ease: 'outExpo',
          onUpdate: () => { el.textContent = Math.round(counter.val) + '%' },
        })
      })
    })
    return () => scope.revert()
  }, [btts])
  const [cornersOpen, setCornersOpen] = useState(true)
  const [firstHalfOpen, setFirstHalfOpen] = useState(true)
  const [dcOpen, setDcOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'matches'|'picks'|'analytics'|'radar'|'early'|'oddsRadar'|'combo'>('matches')

  const [radarData, setRadarData] = useState<any[]>([])
  const [earlyLines, setEarlyLines] = useState<any[]>([])
  const [earlyLoaded, setEarlyLoaded] = useState(false)
  const [oddsMovers, setOddsMovers] = useState<any[]>([])
  const [oddsRadarLoaded, setOddsRadarLoaded] = useState(false)
  const [oddsFlash, setOddsFlash] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState<{ active: boolean; current: number; total: number; label: string }>({ active: false, current: 0, total: 0, label: '' })
  const [isMobile, setIsMobile] = useState(false)
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('footyedge_favorites')
    if (saved) setFavoriteLeagues(JSON.parse(saved))
  }, [])

  const toggleFavorite = (league: string) => {
    setFavoriteLeagues(prev => {
      const next = prev.includes(league) ? prev.filter(l => l !== league) : [...prev, league]
      localStorage.setItem('footyedge_favorites', JSON.stringify(next))
      return next
    })
  }


  const showNotif = useCallback((msg: string, type: 'ok'|'warn'|'err' = 'ok') => {
    setNotif({ msg, type })
    setTimeout(() => setNotif(null), 3000)
  }, [])

  const addPick = useCallback(async (r: Ranking) => {
    if (!isPro && addedPicks.length >= 3) {
      showNotif(`Límite Free: 3 picks/día. ${T.upgradePro} →`, 'warn')
      return
    }
    if (addedPicks.includes(r.rank)) return
    setLoading(true)
    try {
      const pred = r.matches?.model_predictions?.[0]
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: r.matches?.id, market: r.market, odds: r.odds,
          stake: 1.0, modelProb: pred?.prob_over25 ?? 0.6,
          impliedProb: 1 / r.odds, edge: r.edge, ev: r.ev,
          confidence: r.confidence_score,
        }),
      })
      if (res.status === 403) {
        const data = await res.json()
        showNotif(data.message ?? 'Límite alcanzado', 'warn')
        return
      }
      if (!res.ok) throw new Error('Error')
      setAdded(p => [...p, r.rank])
      showNotif(`Pick guardado: ${r.matches?.home_team_name} vs ${r.matches?.away_team_name}`)
    } catch { showNotif('Error al guardar pick', 'err') }
    finally { setLoading(false) }
  }, [addedPicks, isPro, showNotif])

  const deletePick = useCallback(async (pickId: string) => {
    try {
      const res = await fetch(`/api/picks/${pickId}`, { method: 'DELETE' })
      if (res.ok) { showNotif('Pick eliminado'); window.location.reload() }
      else showNotif('Error al eliminar', 'err')
    } catch { showNotif('Error', 'err') }
  }, [showNotif])

  const openPortal = async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (res.status === 404) {
        showNotif(lang === 'en'
          ? 'No active paid subscription found for this account'
          : 'Esta cuenta no tiene una suscripción de pago activa', 'err')
      } else {
        showNotif('Error abriendo portal', 'err')
      }
    } catch { showNotif('Error', 'err') }
  }

  const LEAGUES = [
    { id: 2,   name: 'Champions League' }, { id: 13,  name: 'Libertadores' },
    { id: 3,   name: 'Europa League' },
    { id: 39,  name: 'Premier League' },   { id: 40,  name: 'Championship' },
    { id: 41,  name: 'League One' },       { id: 42,  name: 'League Two' },
    { id: 140, name: 'La Liga' },          { id: 141, name: 'Segunda División' },
    { id: 135, name: 'Serie A' },          { id: 136, name: 'Serie B' },
    { id: 78,  name: 'Bundesliga' },       { id: 79,  name: 'Bundesliga 2' },
    { id: 61,  name: 'Ligue 1' },          { id: 62,  name: 'Ligue 2' },
    { id: 88,  name: 'Eredivisie' },       { id: 94,  name: 'Primeira Liga' },
    { id: 203, name: 'Süper Lig' },        { id: 144, name: 'Pro League' },
    { id: 128, name: 'Liga Argentina' },   { id: 71,  name: 'Brasileirao' },
    { id: 253, name: 'MLS' },              { id: 262, name: 'Liga MX' },
    { id: 113, name: 'Allsvenskan' },      { id: 103, name: 'Eliteserien' },
    { id: 169, name: 'Scottish PL' },      { id: 307, name: 'Saudi Pro' },
  ]

  const runAnalysis = async () => {
    setLoading(true)
    const total = LEAGUES.length + 1
    setRefreshProgress({ active: true, current: 0, total, label: lang === 'en' ? 'Starting...' : 'Iniciando...' })
    try {
      // Disparar refresh en background
      fetch('/api/admin/refresh-proxy').catch(() => null)
      // Esperar progreso real — 3s por liga
      for (let i = 0; i < LEAGUES.length; i++) {
        const league = LEAGUES[i]
        setRefreshProgress({ active: true, current: i + 1, total, label: league.name })
        await new Promise(r => setTimeout(r, 3000))
      }
      // Esperar que el backend termine y consolidar desde el frontend
      setRefreshProgress({ active: true, current: total, total, label: lang === 'en' ? 'Consolidating...' : 'Consolidando...' })
      await new Promise(r => setTimeout(r, 15000))
      await fetch('/api/matches/consolidate').catch(() => null)
      await new Promise(r => setTimeout(r, 2000))
      setRefreshProgress({ active: false, current: total, total, label: '' })
      showNotif(lang === 'en' ? ('✓ ' + LEAGUES.length + ' leagues analyzed') : ('✓ ' + LEAGUES.length + ' ligas analizadas'))
      setTimeout(() => window.location.reload(), 1000)
    } catch (e: any) {
      showNotif('Error: ' + e.message, 'err')
      setRefreshProgress(p => ({ ...p, active: false }))
    } finally {
      setLoading(false)
    }
  }

  const runSettle = async () => {
    setLoading(true)
    setRefreshProgress({ active: true, current: 0, total: 10, label: lang === 'en' ? 'Fetching results...' : 'Obteniendo resultados...' })
    try {
      // Fire settle in background while showing progress
      fetch('/api/admin/settle').catch(() => null)
      for (let i = 1; i <= 9; i++) {
        await new Promise(r => setTimeout(r, 3000))
        setRefreshProgress({ active: true, current: i, total: 10, label: lang === 'en' ? `Settling matches... (${i}/10)` : `Liquidando partidos... (${i}/10)` })
      }
      setRefreshProgress({ active: true, current: 10, total: 10, label: lang === 'en' ? 'Done!' : '¡Listo!' })
      await new Promise(r => setTimeout(r, 1000))
      setRefreshProgress({ active: false, current: 10, total: 10, label: '' })
      showNotif(lang === 'en' ? '✓ Results settled' : '✓ Resultados liquidados')
    } catch (e: any) {
      showNotif('Error: ' + e.message, 'err')
      setRefreshProgress(p => ({ ...p, active: false }))
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const hotCount = allMatches.filter(m => m.prob_btts >= 0.65 || m.prob_over25 >= 0.65).length
  const bttsCount = allMatches.filter(m => m.prob_btts >= 0.65).length
  const ov25Count = allMatches.filter(m => m.prob_over25 >= 0.65).length

  // Leagues with counts — indexed by league_id to avoid name collisions
  const leagueMap = allMatches.reduce((acc, m) => {
    const key = String(m.league_id || m.league_name)
    if (!acc[key]) acc[key] = { name: m.league_name, id: m.league_id, count: 0 }
    acc[key].count++
    return acc
  }, {} as Record<string, { name: string; id?: number; count: number }>)
  const leagues = Object.values(leagueMap).sort((a, b) => b.count - a.count)

  // Filter + sort matches
  const displayMatches = (showFavorites && isElite && favoriteLeagues.length > 0)
    ? allMatches.filter(m => favoriteLeagues.includes(m.league_name))
    : allMatches
  const filteredMatches = displayMatches
    .filter(m => selectedLeague === 'all' || m.league_name === selectedLeague)
    .filter(m => m.prob_btts >= filterBtts)
    .filter(m => m.prob_over25 >= filterOv25)
    .sort((a, b) => {
      if (sortBy === 'hora') return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
      if (sortBy === 'btts') return b.prob_btts - a.prob_btts
      if (sortBy === 'ov15') return b.prob_over15 - a.prob_over15
      if (sortBy === 'ov25') return b.prob_over25 - a.prob_over25
      if (sortBy === 'hot') return ((b.prob_btts + b.prob_over25) / 2) - ((a.prob_btts + a.prob_over25) / 2)
      return 0
    })

  const freeRankings = rankings
    .filter(r => r.market === 'over15')
    .slice(0, 3)
  const proRankings = rankings.slice(0, 8)
  const eliteRankings = rankings.slice(0, 20)
  const visibleRankings = isElite ? eliteRankings : isPro ? proRankings : freeRankings

  return (
    <div style={{ background: '#070d1a', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', color: '#e8eaf6', fontFamily: "'DM Mono', monospace" }}>

        {notif && <Notif msg={notif.msg} type={notif.type} />}

        <style dangerouslySetInnerHTML={{ __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
@keyframes scanner-sweep-move { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.scanner-sweep::before {
  content: '';
  position: absolute;
  top: 0; left: 0; height: 100%; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(0,200,120,0.10), transparent);
  animation: scanner-sweep-move 2.4s linear infinite;
}
@media (prefers-reduced-motion: reduce) { .scanner-sweep::before { animation: none !important; } }
button { transition: all .18s cubic-bezier(.2,.8,.2,1); font-family: inherit; }
button:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.18); }
button:active:not(:disabled) { transform: translateY(0) scale(.97); }
::selection { background: rgba(0,200,120,0.35); }
::-webkit-scrollbar { width: 10px; height: 8px; }
::-webkit-scrollbar-track { background: #0a1626; }
::-webkit-scrollbar-thumb { background: #1a2e4a; border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,200,120,0.5); }
` }} />

        {/* ── HEADER ── */}
        <div style={{ background: 'rgba(7,13,26,0.88)', borderBottom: '1px solid #1a2e4a', padding: '0 16px', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, flexWrap: 'wrap', gap: 8, padding: '6px 0' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setActiveTab('matches')}>
              <img src="/logo.png" alt="FootyEdge" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
            </div>

            {/* Center stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <span style={{ fontSize: 11, color: '#00c878', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{T.today ?? (lang === 'en' ? 'TODAY' : 'HOY')} · {new Date().toLocaleTimeString(lang === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
              <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 30, lineHeight: 1, letterSpacing: '0.02em', color: 'white' }}>{allMatches.length}</div>
                  <div style={{ fontSize: 9, color: '#8ba2c0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{T.matches}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 30, lineHeight: 1, letterSpacing: '0.02em', color: '#ff9944' }}>{hotCount}</div>
                  <div style={{ fontSize: 9, color: '#8ba2c0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>🔥 HOT</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 30, lineHeight: 1, letterSpacing: '0.02em', color: '#64b5f6' }}>{bttsCount}</div>
                  <div style={{ fontSize: 9, color: '#8ba2c0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>BTTS ≥65%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 30, lineHeight: 1, letterSpacing: '0.02em', color: '#00c878' }}>{ov25Count}</div>
                  <div style={{ fontSize: 9, color: '#8ba2c0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ov2.5 ≥65%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 30, lineHeight: 1, letterSpacing: '0.02em', color: '#ce93d8' }}>{rankings.length}</div>
                  <div style={{ fontSize: 9, color: '#8ba2c0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Value Bets</div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => setActiveTab('matches')} style={{ background: activeTab === 'matches' ? 'rgba(0,200,120,0.16)' : 'transparent', border: activeTab === 'matches' ? '1px solid #00c878' : '1px solid #1a2e4a', color: activeTab === 'matches' ? '#00c878' : '#8ba2c0', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer', boxShadow: activeTab === 'matches' ? '0 0 18px rgba(0,200,120,0.28)' : 'none' }}>Dashboard</button>
              <button onClick={() => setActiveTab('analytics')} style={{ background: activeTab === 'analytics' ? 'rgba(0,200,120,0.16)' : 'transparent', border: activeTab === 'analytics' ? '1px solid #00c878' : '1px solid #1a2e4a', color: activeTab === 'analytics' ? '#00c878' : '#8ba2c0', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer', boxShadow: activeTab === 'analytics' ? '0 0 18px rgba(0,200,120,0.28)' : 'none' }}>📊 {lang === 'en' ? 'Performance' : 'Rendimiento'}</button>

              {isElite && (
                <button onClick={() => { setActiveTab('radar'); if (!radarData.length) fetch('/api/value-radar').then(r => r.json()).then(d => setRadarData(d.leagues ?? [])) }} style={{ background: activeTab === 'radar' ? 'rgba(0,200,120,0.16)' : 'transparent', border: activeTab === 'radar' ? '1px solid #00c878' : '1px solid #1a2e4a', color: activeTab === 'radar' ? '#00c878' : '#8ba2c0', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer', boxShadow: activeTab === 'radar' ? '0 0 18px rgba(0,200,120,0.28)' : 'none' }}>
                  🎯 Value Radar
                </button>
              )}
              {isElite && (
                <button onClick={() => { setActiveTab('early'); if (!earlyLoaded) { fetch('/api/early-lines').then(r => r.json()).then(d => { setEarlyLines(d.bets ?? []); setEarlyLoaded(true) }) } }} style={{ background: activeTab === 'early' ? 'rgba(246,185,59,0.14)' : 'transparent', border: activeTab === 'early' ? '1px solid #f6b93b' : '1px solid #1a2e4a', color: activeTab === 'early' ? '#f6b93b' : '#8ba2c0', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer', boxShadow: activeTab === 'early' ? '0 0 18px rgba(246,185,59,0.25)' : 'none' }}>
                  ⚡ Early Lines
                </button>
              )}
              {isPro && (
                <button onClick={() => {
                  setActiveTab('oddsRadar')
                  const load = () => fetch('/api/odds-radar').then(r => r.json()).then(d => { setOddsMovers(d.movers ?? []); setOddsRadarLoaded(true); setOddsFlash(true); setTimeout(() => setOddsFlash(false), 600) })
                  load()
                }} style={{ background: activeTab === 'oddsRadar' ? 'rgba(255,77,77,0.12)' : 'transparent', border: activeTab === 'oddsRadar' ? '1px solid #ff4d4d' : '1px solid #1a2e4a', color: activeTab === 'oddsRadar' ? '#ff4d4d' : '#8ba2c0', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer', boxShadow: activeTab === 'oddsRadar' ? '0 0 18px rgba(255,77,77,0.22)' : 'none' }}>
                  📉 {lang === 'en' ? 'Dropping Odds' : 'Caída de Cuotas'}
                </button>
              )}
              <button onClick={() => setActiveTab('combo')} style={{ background: activeTab === 'combo' ? 'rgba(0,200,120,0.16)' : 'transparent', border: activeTab === 'combo' ? '1px solid #00c878' : '1px solid #1a2e4a', color: activeTab === 'combo' ? '#00c878' : '#8ba2c0', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer', boxShadow: activeTab === 'combo' ? '0 0 18px rgba(0,200,120,0.28)' : 'none' }}>
                🎰 {lang === 'en' ? 'Combo Generator' : 'Combinadas'}
              </button>
              <button onClick={() => router.push('/rankings')} style={{ background: 'transparent', border: '1px solid #1a2e4a', color: '#ce93d8', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer' }}>
                🏆 Rankings
              </button>
              <button onClick={() => router.push('/elo')} style={{ background: 'transparent', border: '1px solid #1a2e4a', color: '#64b5f6', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer' }}>
                📈 Elo
              </button>
              <button onClick={() => setShowGlossary(true)} style={{ background: 'transparent', border: '1px solid #1a2e4a', color: '#f6b93b', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer' }}>
                📖 {lang === 'en' ? 'Glossary' : 'Glosario'}
              </button>

              {isPro && (
                <button onClick={openPortal} style={{ background: 'transparent', border: '1px solid #1a2e4a', color: '#8ba2c0', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer' }}>
                  ⚙️ {lang === 'en' ? 'Manage Plan' : 'Gestionar Plan'}
                </button>
              )}

              {/* Language switcher */}
              <button onClick={() => router.push(lang === 'en' ? '/es/dashboard' : '/en/dashboard')}
                style={{ background: 'transparent', border: '1px solid #1a2e4a', color: '#8ba2c0', padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer' }}>
                {lang === 'en' ? '🇪🇸 ES' : '🇬🇧 EN'}
              </button>

              {['admin@footyedge.com', 'carlosmartens8@gmail.com'].includes(user.email ?? '') && (
                <>
                  <button onClick={() => router.push('/admin')} style={{ background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.45)', color: '#ffb400', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                    🛠️ Admin
                  </button>
                  <button onClick={runAnalysis} disabled={loading} style={{ background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.45)', color: '#00c878', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer', boxShadow: '0 0 14px rgba(0,200,120,0.18)' }}>
                    {loading ? '⟳' : '↻'} Actualizar
                  </button>
                  <button onClick={runSettle} disabled={loading} style={{ background: 'transparent', border: '1px solid #1a2e4a', color: '#6496ff', padding: '6px 15px', borderRadius: 999, fontSize: 11, cursor: 'pointer' }}>
                    ✓ Liquidar
                  </button>
                </>
              )}
              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 15, letterSpacing: '0.08em', padding: '4px 14px', borderRadius: 999, background: isElite ? 'linear-gradient(90deg, rgba(246,185,59,0.18), rgba(255,214,107,0.08))' : isPro ? 'rgba(0,200,120,0.12)' : 'rgba(255,180,0,0.1)', color: isElite ? '#f6b93b' : isPro ? '#00c878' : '#ffb400', border: isElite ? '1px solid rgba(246,185,59,0.55)' : isPro ? '1px solid rgba(0,200,120,0.4)' : '1px solid rgba(255,180,0,0.25)', boxShadow: isElite ? '0 0 18px rgba(246,185,59,0.25)' : 'none' }}>
                {user.plan.toUpperCase()}
              </span>
              <button onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client')
                await (await Promise.resolve(createClient())).auth.signOut()
                window.location.href = '/auth/login'
              }} style={{ background: 'none', border: '1px solid #1a2e4a', color: '#8ba2c0', padding: '6px 12px', borderRadius: 999, fontSize: 11, cursor: 'pointer' }}>{T.logout}</button>

            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 24px' }}>

          {/* ── DASHBOARD TAB ── */}
          {activeTab === 'matches' && (
            <div>


              {/* FREE UPGRADE BANNER */}
              {!isPro && (
                <div style={{ background: 'linear-gradient(135deg, rgba(255,180,0,0.08), rgba(255,120,0,0.05))', border: '1px solid rgba(255,180,0,0.25)', borderRadius: 12, padding: '14px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffb400', marginBottom: 4 }}>{T.upgradeTitle}</div>
                    <div style={{ fontSize: 11, color: '#8a7040' }}>3 value bets · 3 BTTS · Sin análisis de partido · Sin H2H ni estadísticas</div>
                  </div>
                  <button onClick={() => router.push(`/${lang || 'es'}/pricing`)} style={{ background: 'rgba(255,180,0,0.15)', border: '1px solid rgba(255,180,0,0.4)', color: '#ffb400', padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Actualizar a Pro →
                  </button>
                </div>
              )}

              <AIPerformanceWidget lang={lang} />

              {/* VALUE BETS SECTION */}
              <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,0.3)', marginBottom: 12, overflow: 'hidden' }}>
                <div onClick={() => setValueBetsOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', borderBottom: valueBetsOpen ? '1px solid #1a2e4a' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: '\"Bebas Neue\", sans-serif', fontSize: 20, color: '#00c878', textTransform: 'uppercase', letterSpacing: '0.06em', transform: 'skewX(-6deg)', display: 'inline-block' }}>◆ Value Bets</span>
                    <span style={{ fontSize: 11, color: '#4a6785' }}>{rankings.length} {T.found} · EV {'>'} 0</span>
                  </div>
                  <span style={{ color: '#4a6785', fontSize: 12 }}>{valueBetsOpen ? '▲' : '▼'}</span>
                </div>
                {valueBetsOpen && (
                  <div style={{ padding: 18 }}>
                    {rankings.length === 0 && (() => {
                      const cronHoursUTC = [5, 11, 17, 23]
                      const now = new Date()
                      const nowUTCHour = now.getUTCHours()
                      const nowUTCMin = now.getUTCMinutes()
                      let nextHourUTC = cronHoursUTC.find(h => h > nowUTCHour || (h === nowUTCHour && nowUTCMin === 0))
                      const next = new Date(now)
                      if (nextHourUTC === undefined) {
                        next.setUTCDate(next.getUTCDate() + 1)
                        nextHourUTC = cronHoursUTC[0]
                      }
                      next.setUTCHours(nextHourUTC, 0, 0, 0)
                      const nextLocal = next.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' })
                      return (
                        <div style={{ position: 'relative', textAlign: 'center', padding: '40px 20px', color: '#4a6785', overflow: 'hidden', borderRadius: 12, border: '1px solid #1a2e4a' }}>
                          <div className="scanner-sweep" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />
                          <div style={{ position: 'relative', fontSize: 32, marginBottom: 12 }}>🔍</div>
                          <div style={{ position: 'relative', fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#00c878', marginBottom: 8, letterSpacing: '0.02em' }}>
                            {lang === 'en'
                              ? `// SCANNING MARKETS... NEXT UPDATE: ${nextLocal}`
                              : `// ESCANEANDO MERCADOS... PRÓXIMA ACTUALIZACIÓN: ${nextLocal}`}
                          </div>
                          <div style={{ position: 'relative', fontSize: 12, color: '#4a6785', maxWidth: 420, margin: '0 auto' }}>
                            {lang === 'en'
                              ? "The model analyzed today's matches and none met our quality thresholds. This is normal — we'd rather show zero bets than a bad one."
                              : 'El modelo analizó los partidos de hoy y ninguno superó nuestros umbrales de calidad. Es normal — preferimos mostrar cero apuestas antes que una mala.'}
                          </div>
                        </div>
                      )
                    })()}
                    {visibleRankings.length > 0 && (() => {
                      const r = visibleRankings[0]
                      const locked = r.is_pro_only && !isPro
                      const badge = mktBadge(r.market, lang)
                      const rating = Math.max(1, Math.min(10, Math.round((r.confidence_score ?? 50) / 10)))
                      return (
                        <div onClick={() => !locked && router.push(`/${lang || 'es'}/match/${r.match_id}`)}
                          style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, border: '1px solid rgba(0,200,120,0.45)', background: 'linear-gradient(120deg, rgba(0,200,120,0.10), rgba(13,30,53,0.7) 55%)', padding: '22px 26px', marginBottom: 16, cursor: locked ? 'not-allowed' : 'pointer', boxShadow: '0 18px 50px rgba(0,0,0,0.4), 0 0 40px rgba(0,200,120,0.10)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 22, justifyContent: 'space-between', transition: 'box-shadow .2s ease' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = '0 22px 60px rgba(0,0,0,0.5), 0 0 60px rgba(0,200,120,0.22)')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = '0 18px 50px rgba(0,0,0,0.4), 0 0 40px rgba(0,200,120,0.10)')}>
                          <span aria-hidden style={{ position: 'absolute', right: -6, bottom: -26, fontFamily: '"Bebas Neue", sans-serif', fontSize: 150, lineHeight: 1, color: 'transparent', WebkitTextStroke: '2px rgba(0,200,120,0.14)', pointerEvents: 'none', transform: 'skewX(-8deg)' }}>#1</span>
                          <div style={{ minWidth: 220 }}>
                            <div style={{ fontSize: 10, color: '#00c878', letterSpacing: '0.2em', marginBottom: 8 }}>★ {lang === 'en' ? 'BET OF THE DAY' : 'APUESTA DEL DÍA'}</div>
                            <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 34, lineHeight: 0.95, color: '#f2f6ff', transform: 'skewX(-6deg)', transformOrigin: 'left', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              {r.matches?.home_team_logo && <img src={r.matches.home_team_logo} width={28} height={28} alt="" style={{ flexShrink: 0 }} />}
                              {r.matches?.home_team_name} <span style={{ color: '#00c878' }}>vs</span> {r.matches?.away_team_name}
                              {r.matches?.away_team_logo && <img src={r.matches.away_team_logo} width={28} height={28} alt="" style={{ flexShrink: 0 }} />}
                            </div>
                            <div style={{ fontSize: 11, color: '#8ba2c0', marginTop: 6 }}>{getFlag(r.matches?.league_name ?? '', r.matches?.league_id)} {r.matches?.league_name} · {timeStr(r.matches?.kickoff_at ?? '', lang)}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                            <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 15, letterSpacing: '0.08em', padding: '5px 16px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.color}66` }}>{badge.label}</span>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 30, color: '#f2f6ff' }}>{r.odds?.toFixed(2)}</div>
                              <div style={{ fontSize: 9, color: '#8ba2c0', letterSpacing: '0.1em' }}>{lang === 'en' ? 'ODDS' : 'CUOTA'}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'flex-end' }}>
                              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: '#f6b93b' }}>{rating}<span style={{ fontSize: 11, color: '#8ba2c0' }}>/10</span></span>
                              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 52, lineHeight: 1, color: '#00c878', textShadow: '0 0 24px rgba(0,200,120,0.55)' }}>{locked ? '🔒' : `EV +${(r.ev * 100).toFixed(0)}%`}</div>
                            </div>
                            {r.model_prob_raw != null && r.market_implied_prob != null && (
                              <div style={{ fontSize: 10, color: '#64b5f6', marginTop: 4 }}>
                                📊 {lang === 'en' ? 'Model diverges' : 'Modelo diverge'} {Math.abs((r.model_prob_raw - r.market_implied_prob) * 100).toFixed(0)}{lang === 'en' ? 'pts from market' : 'pts del mercado'}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                      {visibleRankings.slice(1).map((r) => {
                        const locked = r.is_pro_only && !isPro
                        const badge = mktBadge(r.market, lang)
                        const rating = Math.max(1, Math.min(10, Math.round((r.confidence_score ?? 50) / 10)))

                        if (locked) {
                          // Teaser: mostramos que HAY una señal fuerte (rating + edge), pero no
                          // cuál partido/mercado es — más persuasivo para conversión que mostrar
                          // todo el partido y solo tapar el número.
                          return (
                            <div key={r.rank} onClick={() => router.push(`/${lang || 'es'}/pricing`)}
                              style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid rgba(246,185,59,0.35)', background: 'linear-gradient(135deg, rgba(246,185,59,0.06), rgba(13,30,53,0.85))', padding: '16px 18px', cursor: 'pointer', transition: 'transform .18s ease, border-color .18s ease' }}
                              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.borderColor = 'rgba(246,185,59,0.6)' }}
                              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.borderColor = 'rgba(246,185,59,0.35)' }}>
                              <div style={{ fontSize: 10, color: '#8ba2c0', marginBottom: 10 }}>{getFlag(r.matches?.league_name ?? '', r.matches?.league_id)} {r.matches?.league_name} · {timeStr(r.matches?.kickoff_at ?? '', lang)}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14, filter: 'blur(6px)', opacity: 0.55, userSelect: 'none', marginBottom: 12 }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#2a3a4a' }} />
                                <span style={{ fontSize: 15, fontWeight: 700, color: '#f2f6ff' }}>Equipo A vs Equipo B</span>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#2a3a4a' }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 30, color: '#f6b93b', lineHeight: 1 }}>{rating}<span style={{ fontSize: 14, color: '#8ba2c0' }}>/10</span></div>
                                  <div style={{ fontSize: 8, color: '#8ba2c0', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{lang === 'en' ? 'Rating' : 'Rating'}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 24, color: '#00c878', textShadow: '0 0 14px rgba(0,200,120,0.45)' }}>+{(r.ev * 100).toFixed(0)}%</div>
                                  <div style={{ fontSize: 8, color: '#8ba2c0', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>EV</div>
                                </div>
                                <span style={{ fontSize: 26 }}>🔒</span>
                              </div>
                              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#f6b93b', fontWeight: 700, textDecoration: 'underline' }}>
                                {isPro ? T.upgradeElite : T.upgradePro}
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div key={r.rank} onClick={() => router.push(`/${lang || 'es'}/match/${r.match_id}`)}
                            style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid #1a2e4a', background: 'rgba(13,30,53,0.75)', padding: '16px 18px', cursor: 'pointer', transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease' }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.borderColor = 'rgba(0,200,120,0.6)'; el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.45)' }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.borderColor = '#1a2e4a'; el.style.boxShadow = 'none' }}>
                            <span aria-hidden style={{ position: 'absolute', right: 2, top: -14, fontFamily: '"Bebas Neue", sans-serif', fontSize: 74, lineHeight: 1, color: 'transparent', WebkitTextStroke: '1.5px rgba(0,200,120,0.16)', pointerEvents: 'none', transform: 'skewX(-8deg)' }}>#{r.rank}</span>
                            <div style={{ fontSize: 10, color: '#8ba2c0', marginBottom: 6 }}>{getFlag(r.matches?.league_name ?? '', r.matches?.league_id)} {r.matches?.league_name} · {timeStr(r.matches?.kickoff_at ?? '', lang)}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f6ff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {r.matches?.home_team_logo && <img src={r.matches.home_team_logo} width={18} height={18} alt="" style={{ flexShrink: 0 }} />}
                              {r.matches?.home_team_name} <span style={{ color: '#00c878', fontWeight: 400 }}>vs</span> {r.matches?.away_team_name}
                              {r.matches?.away_team_logo && <img src={r.matches.away_team_logo} width={18} height={18} alt="" style={{ flexShrink: 0 }} />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 12, letterSpacing: '0.08em', padding: '3px 12px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.color}66` }}>{badge.label}</span>
                              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 19, color: '#f2f6ff' }}>{r.odds?.toFixed(2)}</span>
                              <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 24, lineHeight: 1, color: '#00c878', textShadow: '0 0 14px rgba(0,200,120,0.45)' }}>{`EV +${(r.ev * 100).toFixed(0)}%`}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 8px' }}>
                              <div style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 16, color: '#f6b93b' }}>{rating}<span style={{ fontSize: 10, color: '#8ba2c0' }}>/10</span></div>
                              <div style={{ height: 4, flex: 1, background: '#0a1628', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (r.ev / 0.2) * 100)}%`, background: 'linear-gradient(90deg, #00c878, #4dffb0)', borderRadius: 2 }} />
                              </div>
                            </div>

                            {r.model_prob_raw != null && r.market_implied_prob != null && (
                              <div style={{ fontSize: 10, color: '#64b5f6', marginTop: 6, borderTop: '1px solid #1a2e4a', paddingTop: 6 }}>
                                📊 {lang === 'en' ? 'Model diverges' : 'Modelo diverge'} {Math.abs((r.model_prob_raw - r.market_implied_prob) * 100).toFixed(0)}{lang === 'en' ? 'pts from market' : 'pts del mercado'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {!isElite && rankings.length > visibleRankings.length && (
                      <div style={{ padding: '14px 4px 0', textAlign: 'center', fontSize: 11, color: '#f6b93b' }}>
                        🔒 {rankings.length - visibleRankings.length} {T.hiddenBets} · <span onClick={() => router.push(`/${lang || 'es'}/pricing`)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{isPro ? T.upgradeElite : T.upgradePro}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* BTTS SECTION */}
              <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,0.3)', marginBottom: 12, overflow: 'hidden' }}>
                <div onClick={() => setBttsOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', borderBottom: bttsOpen ? '1px solid #1a2e4a' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: '\"Bebas Neue\", sans-serif', fontSize: 20, color: '#64b5f6', textTransform: 'uppercase', letterSpacing: '0.06em', transform: 'skewX(-6deg)', display: 'inline-block' }}>◆ {T.bttsTitle}</span>
                    <span style={{ fontSize: 11, color: '#4a6785' }}>{btts.filter(m => m.prob_btts >= 0.60).length} partidos · ≥60%</span>
                  </div>
                  <span style={{ color: '#4a6785', fontSize: 12 }}>{bttsOpen ? '▲' : '▼'}</span>
                </div>
                {bttsOpen && (
                  <div ref={bttsGridRef} style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                    {btts.filter(m => m.prob_btts >= 0.60).slice(0, isPro ? 10 : 3).map((m) => {
                      const pct = Math.round(m.prob_btts * 100)
                      const color = pct >= 70 ? '#00c878' : pct >= 60 ? '#ffb400' : '#6b7fa3'
                      const isHot = pct >= 65
                      const circ = 2 * Math.PI * 26
                      return (
                        <div key={m.id} onClick={() => router.push(`/${lang || 'es'}/match/${m.id}`)}
                          style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, borderRadius: 14, border: '1px solid #1a2e4a', background: 'rgba(13,30,53,0.75)', padding: '14px 16px', cursor: 'pointer', transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.borderColor = `${color}99`; el.style.boxShadow = '0 14px 34px rgba(0,0,0,0.45)' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.borderColor = '#1a2e4a'; el.style.boxShadow = 'none' }}>
                          {isHot && <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 12, zIndex: 1 }}>🔥</span>}
                          <svg width="58" height="58" viewBox="0 0 58 58" style={{ flexShrink: 0, marginTop: 2 }}>
                            <circle cx="29" cy="29" r="24" stroke="#0a1628" strokeWidth="6" fill="none" />
                            <circle data-ring cx="29" cy="29" r="24" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`} transform="rotate(-90 29 29)"
                              style={{ filter: pct >= 70 ? 'drop-shadow(0 0 6px rgba(0,200,120,0.55))' : 'none' }} />
                            <text data-pct={pct} x="29" y="35" textAnchor="middle" fill={color} fontFamily='"Bebas Neue", sans-serif' fontSize="16">0%</text>
                          </svg>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                              {m.home_team_logo && <img src={m.home_team_logo} width={18} height={18} alt="" style={{ borderRadius: 3 }} />}
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f6ff' }}>{m.home_team_name}</span>
                              <span style={{ fontSize: 12, color: '#00c878' }}>vs</span>
                              {m.away_team_logo && <img src={m.away_team_logo} width={18} height={18} alt="" style={{ borderRadius: 3 }} />}
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f6ff' }}>{m.away_team_name}</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#8ba2c0' }}>{getFlag(m.league_name, m.league_id)} {m.league_name} · {timeStr(m.kickoff_at, lang)}</div>
                            <div style={{ fontSize: 10, color: '#6b7fa3', marginTop: 4 }}>λ {m.expected_goals_home?.toFixed(2)}+{m.expected_goals_away?.toFixed(2)}</div>
                          </div>
                        </div>
                      )
                    })}
                    {btts.filter(m => m.prob_btts >= 0.60).length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 20px', color: '#4a6785' }}>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>⚽</div>
                        <div style={{ fontSize: 13, color: '#8ba2c0' }}>
                          {lang === 'en'
                            ? 'No matches reach 60% BTTS probability today'
                            : 'Ningún partido supera el 60% de probabilidad BTTS hoy'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CORNERS SECTION */}
              {corners && corners.length > 0 && (
                <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,0.3)', marginBottom: 12, overflow: 'hidden' }}>
                  <div onClick={() => setCornersOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', borderBottom: cornersOpen ? '1px solid #1a2e4a' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: '\"Bebas Neue\", sans-serif', fontSize: 20, color: '#ff9944', textTransform: 'uppercase', letterSpacing: '0.06em', transform: 'skewX(-6deg)', display: 'inline-block' }}>🏁 {lang === 'en' ? 'Best Corners' : 'Mejores Corners'}</span>
                      <span style={{ fontSize: 11, color: '#4a6785' }}>{corners.length} {lang === 'en' ? 'matches' : 'partidos'}</span>
                    </div>
                    <span style={{ color: '#4a6785', fontSize: 12 }}>{cornersOpen ? '▲' : '▼'}</span>
                  </div>
                  {cornersOpen && (
                  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {corners.map((m: any) => {
                      const pct = m.corners_potential != null ? Math.round(m.corners_potential * 100) : null
                      const color = pct && pct >= 70 ? '#00c878' : pct && pct >= 55 ? '#ff9944' : '#6b7fa3'
                      return (
                        <div key={m.id} onClick={() => router.push(`/${lang || 'es'}/match/${m.id}`)}
                          style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, borderRadius: 14, border: '1px solid #1a2e4a', background: 'rgba(13,30,53,0.75)', padding: '14px 16px', cursor: 'pointer', transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.borderColor = `${color}99`; el.style.boxShadow = '0 14px 34px rgba(0,0,0,0.45)' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.borderColor = '#1a2e4a'; el.style.boxShadow = 'none' }}>
                          {pct !== null && (
                            <svg width="58" height="58" viewBox="0 0 58 58" style={{ flexShrink: 0, marginTop: 2 }}>
                              <circle cx="29" cy="29" r="24" stroke="#0a1628" strokeWidth="6" fill="none" />
                              <circle cx="29" cy="29" r="24" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`} transform="rotate(-90 29 29)"
                                style={{ filter: pct >= 70 ? `drop-shadow(0 0 6px ${color}88)` : 'none', transition: 'stroke-dashoffset .6s ease' }} />
                              <text x="29" y="35" textAnchor="middle" fill={color} fontFamily='"Bebas Neue", sans-serif' fontSize="16">{pct}%</text>
                            </svg>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                              {m.home_team_logo && <img src={m.home_team_logo} width={18} height={18} alt="" style={{ borderRadius: 3 }} />}
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f6ff' }}>{m.home_team_name}</span>
                              <span style={{ fontSize: 12, color: '#00c878' }}>vs</span>
                              {m.away_team_logo && <img src={m.away_team_logo} width={18} height={18} alt="" style={{ borderRadius: 3 }} />}
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f6ff' }}>{m.away_team_name}</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#8ba2c0' }}>{getFlag(m.league_name, m.league_id)} {m.league_name} · {timeStr(m.kickoff_at, lang)}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, color: '#6b7fa3' }}>
                              {m.odds_corners_over_85 && <span>O8.5: <b style={{ color: '#f2f6ff' }}>{m.odds_corners_over_85}</b></span>}
                              {m.odds_corners_over_95 && <span>O9.5: <b style={{ color: '#f2f6ff' }}>{m.odds_corners_over_95}</b></span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                </div>
              )}

              {/* FIRST HALF SECTION */}{/* FIRST HALF SECTION */}
              {firsthalf && firsthalf.length > 0 && (
                <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,0.3)', marginBottom: 12, overflow: 'hidden' }}>
                  <div onClick={() => setFirstHalfOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', borderBottom: firstHalfOpen ? '1px solid #1a2e4a' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: '\"Bebas Neue\", sans-serif', fontSize: 20, color: '#00bcd4', textTransform: 'uppercase', letterSpacing: '0.06em', transform: 'skewX(-6deg)', display: 'inline-block' }}>⏱ {lang === 'en' ? 'First Half' : 'Primer Tiempo'}</span>
                      <span style={{ fontSize: 11, color: '#4a6785' }}>{firsthalf.length} {lang === 'en' ? 'matches' : 'partidos'}</span>
                    </div>
                    <span style={{ color: '#4a6785', fontSize: 12 }}>{firstHalfOpen ? '▲' : '▼'}</span>
                  </div>
                  {firstHalfOpen && (
                  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {firsthalf.map((m: any) => {
                      const pct = m.o15HT_potential != null ? Math.round(m.o15HT_potential * 100) : null
                      const color = pct && pct >= 60 ? '#00c878' : pct && pct >= 45 ? '#00bcd4' : '#6b7fa3'
                      return (
                        <div key={m.id} onClick={() => router.push(`/${lang || 'es'}/match/${m.id}`)}
                          style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, borderRadius: 14, border: '1px solid #1a2e4a', background: 'rgba(13,30,53,0.75)', padding: '14px 16px', cursor: 'pointer', transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.borderColor = `${color}99`; el.style.boxShadow = '0 14px 34px rgba(0,0,0,0.45)' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.borderColor = '#1a2e4a'; el.style.boxShadow = 'none' }}>
                          {pct !== null && (
                            <svg width="58" height="58" viewBox="0 0 58 58" style={{ flexShrink: 0, marginTop: 2 }}>
                              <circle cx="29" cy="29" r="24" stroke="#0a1628" strokeWidth="6" fill="none" />
                              <circle cx="29" cy="29" r="24" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 24}`} strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`} transform="rotate(-90 29 29)"
                                style={{ filter: pct >= 60 ? `drop-shadow(0 0 6px ${color}88)` : 'none', transition: 'stroke-dashoffset .6s ease' }} />
                              <text x="29" y="35" textAnchor="middle" fill={color} fontFamily='"Bebas Neue", sans-serif' fontSize="16">{pct}%</text>
                            </svg>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                              {m.home_team_logo && <img src={m.home_team_logo} width={18} height={18} alt="" style={{ borderRadius: 3 }} />}
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f6ff' }}>{m.home_team_name}</span>
                              <span style={{ fontSize: 12, color: '#00c878' }}>vs</span>
                              {m.away_team_logo && <img src={m.away_team_logo} width={18} height={18} alt="" style={{ borderRadius: 3 }} />}
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f6ff' }}>{m.away_team_name}</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#8ba2c0' }}>{getFlag(m.league_name, m.league_id)} {m.league_name} · {timeStr(m.kickoff_at, lang)}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, color: '#6b7fa3' }}>
                              {m.odds_1st_half_over05 && <span>O0.5: <b style={{ color: '#f2f6ff' }}>{m.odds_1st_half_over05}</b></span>}
                              {m.odds_1st_half_over15 && <span>O1.5: <b style={{ color: '#f2f6ff' }}>{m.odds_1st_half_over15}</b></span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                </div>
              )}

              {/* DOUBLE CHANCE SECTION */}{/* DOUBLE CHANCE SECTION */}
              {doublechance && doublechance.length > 0 && (
                <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,0.3)', marginBottom: 12, overflow: 'hidden' }}>
                  <div onClick={() => setDcOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', borderBottom: dcOpen ? '1px solid #1a2e4a' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: '\"Bebas Neue\", sans-serif', fontSize: 20, color: '#ce93d8', textTransform: 'uppercase', letterSpacing: '0.06em', transform: 'skewX(-6deg)', display: 'inline-block' }}>🎯 {lang === 'en' ? 'Double Chance' : 'Doble Oportunidad'}</span>
                      <span style={{ fontSize: 11, color: '#4a6785' }}>{doublechance.length} {lang === 'en' ? 'matches' : 'partidos'}</span>
                    </div>
                    <span style={{ color: '#4a6785', fontSize: 12 }}>{dcOpen ? '▲' : '▼'}</span>
                  </div>
                  {dcOpen && (
                  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                    {doublechance.map((m: any) => (
                      <div key={m.id} onClick={() => router.push(`/${lang || 'es'}/match/${m.id}`)}
                        style={{ borderRadius: 14, border: '1px solid #1a2e4a', background: 'rgba(13,30,53,0.75)', padding: '14px 16px', cursor: 'pointer', transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.borderColor = 'rgba(206,147,216,0.6)'; el.style.boxShadow = '0 14px 34px rgba(0,0,0,0.45)' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'none'; el.style.borderColor = '#1a2e4a'; el.style.boxShadow = 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          {m.home_team_logo && <img src={m.home_team_logo} width={18} height={18} alt="" style={{ borderRadius: 3 }} />}
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f6ff' }}>{m.home_team_name}</span>
                          <span style={{ fontSize: 12, color: '#00c878' }}>vs</span>
                          {m.away_team_logo && <img src={m.away_team_logo} width={18} height={18} alt="" style={{ borderRadius: 3 }} />}
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f6ff' }}>{m.away_team_name}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#8ba2c0', marginBottom: 10 }}>{getFlag(m.league_name, m.league_id)} {m.league_name} · {timeStr(m.kickoff_at, lang)}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {m.odds_doublechance_1x && <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 13, letterSpacing: '0.04em', background: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.4)', color: '#ce93d8', borderRadius: 999, padding: '4px 12px' }}>1X {m.odds_doublechance_1x}</span>}
                          {m.odds_doublechance_x2 && <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 13, letterSpacing: '0.04em', background: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.4)', color: '#ce93d8', borderRadius: 999, padding: '4px 12px' }}>X2 {m.odds_doublechance_x2}</span>}
                          {m.odds_doublechance_12 && <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 13, letterSpacing: '0.04em', background: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.4)', color: '#ce93d8', borderRadius: 999, padding: '4px 12px' }}>12 {m.odds_doublechance_12}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              )}

              {/* FILTERS BAR */}{/* FILTERS BAR */}
              <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,0.3)', padding: '12px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: '#4a6785', textTransform: 'uppercase' }}>{T.sort}</span>
                  {[
                    { id: 'hora', label: lang === 'en' ? 'Time' : 'Hora' },
                    { id: 'hot', label: '🔥 HOT' },
                    { id: 'btts', label: 'BTTS' },
                    { id: 'ov15', label: 'Ov1.5' },
                    { id: 'ov25', label: 'Ov2.5' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setSortBy(s.id as any)} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: sortBy === s.id ? 'rgba(0,200,120,0.15)' : 'transparent', border: `1px solid ${sortBy === s.id ? '#00c878' : '#1a2e4a'}`, color: sortBy === s.id ? '#00c878' : '#6b7fa3' }}>
                      {s.label}
                    </button>
                  ))}
                  <span style={{ fontSize: 10, color: '#4a6785', textTransform: 'uppercase', marginLeft: 8 }}>BTTS</span>
                  {[0, 0.5, 0.6, 0.7].map(v => (
                    <button key={v} onClick={() => setFilterBtts(v)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: filterBtts === v ? 'rgba(0,200,120,0.15)' : 'transparent', border: `1px solid ${filterBtts === v ? '#00c878' : '#1a2e4a'}`, color: filterBtts === v ? '#00c878' : '#6b7fa3' }}>
                      {v === 0 ? lang === 'en' ? 'All' : 'Todos' : `≥${v * 100}%`}
                    </button>
                  ))}
                  <span style={{ fontSize: 10, color: '#4a6785', textTransform: 'uppercase', marginLeft: 8 }}>Ov2.5</span>
                  {[0, 0.5, 0.6, 0.7].map(v => (
                    <button key={v} onClick={() => setFilterOv25(v)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: filterOv25 === v ? 'rgba(0,200,120,0.15)' : 'transparent', border: `1px solid ${filterOv25 === v ? '#00c878' : '#1a2e4a'}`, color: filterOv25 === v ? '#00c878' : '#6b7fa3' }}>
                      {v === 0 ? lang === 'en' ? 'All' : 'Todos' : `≥${v * 100}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* LEAGUE FILTERS */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
                <button onClick={() => setSelectedLeague('all')} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', background: selectedLeague === 'all' ? 'rgba(0,200,120,0.15)' : 'transparent', border: `1px solid ${selectedLeague === 'all' ? '#00c878' : '#1a2e4a'}`, color: selectedLeague === 'all' ? '#00c878' : '#6b7fa3' }}>
                  {T.allLeagues} ({allMatches.length})
                </button>
                {leagues.map((lg) => (
                  <div key={String(lg.id || lg.name)} style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {isElite && (
                      <button onClick={() => toggleFavorite(lg.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '0 2px', opacity: favoriteLeagues.includes(lg.name) ? 1 : 0.3, lineHeight: 1 }}>
                        ⭐
                      </button>
                    )}
                    <button onClick={() => setSelectedLeague(lg.name)} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', background: selectedLeague === lg.name ? 'rgba(0,200,120,0.15)' : 'transparent', border: `1px solid ${selectedLeague === lg.name ? '#00c878' : '#1a2e4a'}`, color: selectedLeague === lg.name ? '#00c878' : '#6b7fa3' }}>
                      {getFlag(lg.name, lg.id)} {lg.name} ({lg.count})
                    </button>
                  </div>
                ))}
              </div>
              {isElite && favoriteLeagues.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <button onClick={() => setShowFavorites(v => !v)}
                    style={{ fontSize: 11, padding: '3px 12px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${showFavorites ? '#ffd700' : '#1a2e4a'}`, background: showFavorites ? 'rgba(255,215,0,0.1)' : 'transparent', color: showFavorites ? '#ffd700' : '#4a6785' }}>
                    ⭐ {showFavorites ? T.seeAll ?? (lang === 'en' ? 'See all leagues' : 'Ver todas las ligas') : `${T.seeFav ?? (lang === 'en' ? 'See my' : 'Ver mis')} ${favoriteLeagues.length} ${T.favLeagues ?? (lang === 'en' ? 'favorite leagues' : 'ligas favoritas')}`}
                  </button>
                </div>
              )}

              {/* MAIN MATCHES TABLE */}
              <div style={{ background: 'rgba(13,30,53,0.6)', border: '1px solid #1a2e4a', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                {filteredMatches.length === 0 && (
                  <div style={{ padding: 48, textAlign: 'center', color: '#8ba2c0', fontSize: 13, letterSpacing: '0.04em' }}>
                    {T.noMatches}
                  </div>
                )}

                {/* DESKTOP */}
                {!isMobile && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 60px 70px 70px 70px 70px 70px 60px 60px 60px', gap: 8, padding: '8px 16px', borderBottom: '1px solid #1a2e4a', fontSize: 9, color: '#8ba2c0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      <span>{lang === 'en' ? 'League' : 'Liga'}</span><span>{lang === 'en' ? 'Match' : 'Partido'}</span><span style={{ textAlign: 'center' }}>Hora</span>
                      <span style={{ textAlign: 'center' }}>BTTS</span><span style={{ textAlign: 'center' }}>Ov1.5</span>
                      <span style={{ textAlign: 'center' }}>{'Ov2.5'}</span><span style={{ textAlign: 'center' }}>{lang === 'en' ? 'Home' : 'Local'}</span>
                      <span style={{ textAlign: 'center' }}>{lang === 'en' ? 'Away' : 'Visita'}</span>
                      <span style={{ textAlign: 'center' }}>{lang === 'en' ? '@Home' : '@Local'}</span><span style={{ textAlign: 'center' }}>{lang === 'en' ? '@Away' : '@Visita'}</span><span style={{ textAlign: 'center' }}>{'@Ov2.5'}</span>
                    </div>
                    {filteredMatches.map((m, i) => {
                      const isHot = m.prob_btts >= 0.65 || m.prob_over25 >= 0.65
                      const isLive = ['1H','2H','HT','ET','P'].includes(m.status ?? '')
                      const isDone = ['FT','AET','PEN','AWD','WO'].includes(m.status ?? '')
                      return (
                        <div key={m.id} onClick={() => router.push(`/${lang || 'es'}/match/${m.id}`)}
                          style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 60px 70px 70px 70px 70px 70px 60px 60px 60px', gap: 8, alignItems: 'center', padding: '12px 16px', borderBottom: i < filteredMatches.length - 1 ? '1px solid #0a1628' : 'none', cursor: 'pointer', transition: 'background 0.1s', background: isLive ? 'rgba(255,50,50,0.03)' : 'transparent', opacity: isDone ? 0.55 : 1 }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(0,200,120,0.06)'; el.style.transform = 'translateX(4px)'; el.style.transition = 'background 0.15s ease, transform 0.15s ease' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.transform = 'translateX(0px)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 28 }}>
                            <span style={{ fontSize: 12 }}>{getFlag(m.league_name, m.league_id)}</span>
                            {isHot && !isDone && <span style={{ fontSize: 9 }}>🔥</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                            {m.home_team_logo && <img src={m.home_team_logo} width={14} height={14} alt="" style={{ flexShrink: 0 }} />}
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#f2f6ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.home_team_name}</span>
                            <span style={{ fontSize: 10, color: '#00c878', flexShrink: 0 }}>vs</span>
                            {m.away_team_logo && <img src={m.away_team_logo} width={14} height={14} alt="" style={{ flexShrink: 0 }} />}
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#f2f6ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.away_team_name}</span>
                            <span style={{ fontSize: 9, color: '#3a5578', flexShrink: 0 }}>{m.league_name}</span>
                          </div>
                          {isDone ? (
                            <span style={{ fontSize: 10, color: '#4a6785', letterSpacing: '0.04em', textAlign: 'center', fontWeight: 700 }}>{lang === 'en' ? 'FT' : 'FIN'}</span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#8ba2c0', letterSpacing: '0.04em', textAlign: 'center' }}>{timeStr(m.kickoff_at, lang)}</span>
                          )}
                          {isDone ? (
                            <span style={{ gridColumn: 'span 5', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#c5d3e8', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
                              {m.home_goals ?? '?'} — {m.away_goals ?? '?'}
                            </span>
                          ) : (
                            <>
                              <ProbCell v={m.prob_btts} />
                              <ProbCell v={m.prob_over15} />
                              <ProbCell v={m.prob_over25} />
                              <ProbCell v={m.prob_home_win} />
                              <ProbCell v={m.prob_away_win} />
                            </>
                          )}
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#64b5f6', textAlign: 'center' }}>{!isDone && m.odds_home ? m.odds_home.toFixed(2) : '—'}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#ef9a9a', textAlign: 'center' }}>{!isDone && m.odds_away ? m.odds_away.toFixed(2) : '—'}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#00c878', textAlign: 'center' }}>{!isDone && m.odds_over25 ? m.odds_over25.toFixed(2) : '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* MOBILE CARDS */}
                {isMobile && (
                  <div>
                    {filteredMatches.map((m, i) => {
                      const isHot = m.prob_btts >= 0.65 || m.prob_over25 >= 0.65
                      const isLive = ['1H','2H','HT','ET','P'].includes(m.status ?? '')
                      const isDone = ['FT','AET','PEN','AWD','WO'].includes(m.status ?? '')
                      return (
                        <div key={m.id} onClick={() => router.push(`/${lang || 'es'}/match/${m.id}`)}
                          style={{ padding: '12px 16px', borderBottom: i < filteredMatches.length - 1 ? '1px solid #0a1628' : 'none', cursor: 'pointer', opacity: isDone ? 0.55 : 1 }}>
                          {/* Teams row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 13, flexShrink: 0 }}>{getFlag(m.league_name, m.league_id)}</span>
                              {m.home_team_logo && <img src={m.home_team_logo} width={16} height={16} alt="" style={{ flexShrink: 0 }} />}
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home_team_name}</span>
                              <span style={{ fontSize: 11, color: '#4a6785', flexShrink: 0, margin: '0 2px' }}>vs</span>
                              {m.away_team_logo && <img src={m.away_team_logo} width={16} height={16} alt="" style={{ flexShrink: 0 }} />}
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.away_team_name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                              {isLive && <span style={{ fontSize: 9, background: '#ff333320', border: '1px solid #ff3333', color: '#ff5555', padding: '1px 4px', borderRadius: 3 }}>LIVE</span>}
                              {isHot && !isDone && <span style={{ fontSize: 12 }}>🔥</span>}
                              <span style={{ fontSize: 12, color: '#6b7fa3' }}>{isDone ? (lang === 'en' ? 'FT' : 'FIN') : timeStr(m.kickoff_at, lang)}</span>
                            </div>
                          </div>
                          {/* League */}
                          <div style={{ fontSize: 10, color: '#3a5578', marginBottom: 8 }}>{m.league_name}</div>
                          {/* Stats pills o marcador final */}
                          {isDone ? (
                            <div style={{ textAlign: 'center', padding: '6px 0' }}>
                              <span style={{ fontSize: 20, fontWeight: 700, color: '#c5d3e8', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>
                                {m.home_goals ?? '?'} — {m.away_goals ?? '?'}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {[
                                { label: 'BTTS', val: Math.round(m.prob_btts * 100) + '%', color: probColor(m.prob_btts) },
                                { label: 'Ov1.5', val: Math.round(m.prob_over15 * 100) + '%', color: probColor(m.prob_over15) },
                                { label: 'Ov2.5', val: Math.round(m.prob_over25 * 100) + '%', color: probColor(m.prob_over25) },
                                { label: lang === 'en' ? 'Home' : 'Local', val: Math.round(m.prob_home_win * 100) + '%', color: probColor(m.prob_home_win) },
                                { label: lang === 'en' ? 'Away' : 'Visita', val: Math.round(m.prob_away_win * 100) + '%', color: probColor(m.prob_away_win) },
                              ].map(s => (
                                <div key={s.label} style={{ flex: 1, minWidth: 44, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '4px 2px', textAlign: 'center' }}>
                                  <div style={{ fontSize: 8, color: '#4a6785', marginBottom: 2, textTransform: 'uppercase' }}>{s.label}</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.val}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Odds row */}
                          {!isDone && (m.odds_home || m.odds_over25) && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                              {m.odds_home && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(100,181,246,0.08)', border: '1px solid rgba(100,181,246,0.2)', borderRadius: 6, padding: '3px 8px' }}>
                                  <span style={{ fontSize: 9, color: '#4a6785' }}>{lang === 'en' ? '@Home' : '@Local'}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64b5f6' }}>{m.odds_home.toFixed(2)}</span>
                                </div>
                              )}
                              {m.odds_away && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,154,154,0.08)', border: '1px solid rgba(239,154,154,0.2)', borderRadius: 6, padding: '3px 8px' }}>
                                  <span style={{ fontSize: 9, color: '#4a6785' }}>{lang === 'en' ? '@Away' : '@Visita'}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ef9a9a' }}>{m.odds_away.toFixed(2)}</span>
                                </div>
                              )}
                              {m.odds_over25 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 6, padding: '3px 8px' }}>
                                  <span style={{ fontSize: 9, color: '#4a6785' }}>@Ov2.5</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4caf50' }}>{m.odds_over25.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── VALUE RADAR TAB ── */}
          {activeTab === 'analytics' && (
            <div style={{ position: 'relative' }}>
              {/* COMING SOON OVERLAY */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,15,30,0.85)', borderRadius: 12, backdropFilter: 'blur(4px)', minHeight: 400 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{lang === 'en' ? 'Performance Dashboard' : 'Dashboard de Rendimiento'}</div>
                <div style={{ fontSize: 13, color: '#4a6785', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>{lang === 'en' ? 'Accumulating real data to show model accuracy, ROI and hit rate by market.' : 'Acumulando datos reales para mostrar precisión del modelo, ROI y hit rate por mercado.'}</div>
                <div style={{ marginTop: 20, fontSize: 11, color: '#00c878', background: 'rgba(0,200,120,0.1)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: 20, padding: '6px 16px' }}>
                  {lang === 'en' ? 'Coming Soon' : 'Próximamente'}
                </div>
              </div>
              {/* PREVIEW (visible bajo el overlay) */}
              <div style={{ padding: 24, opacity: 0.3, pointerEvents: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  {[{label: 'ROI', value: '+12.4%'}, {label: lang === 'en' ? 'Hit Rate' : 'Aciertos', value: '58%'}, {label: lang === 'en' ? 'Settled' : 'Liquidados', value: '47'}, {label: 'Profit', value: '+8.3u'}].map(m => (
                    <div key={m.label} style={{ background: 'rgba(13,30,53,0.8)', border: '1px solid #1a2e4a', borderRadius: 10, padding: '16px 20px' }}>
                      <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: '#00c878' }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(13,30,53,0.8)', border: '1px solid #1a2e4a', borderRadius: 10, padding: 20, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#4a6785', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>📈 {lang === 'en' ? 'Equity Curve' : 'Curva de Capital'}</div>
                  <div style={{ height: 80, background: 'rgba(0,200,120,0.05)', borderRadius: 8 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {['BTTS', 'Over 2.5', 'Over 1.5', 'Home', 'Away', 'Draw'].map(m => (
                    <div key={m} style={{ background: 'rgba(13,30,53,0.8)', border: '1px solid #1a2e4a', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#6b7fa3' }}>{m}</span>
                      <span style={{ fontSize: 12, color: '#00c878' }}>--</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'radar' && (
            <div>
              <ValueRadarComponent data={radarData} lang={lang} />
            </div>
          )}

          {activeTab === 'combo' && (
            <ComboGenerator lang={lang} />
          )}

          {activeTab === 'oddsRadar' && (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#ff4d4d', letterSpacing: '0.02em', margin: 0 }}>
                  📉 {lang === 'en' ? 'DROPPING ODDS RADAR' : 'RADAR DE CAÍDA DE CUOTAS'}
                </h2>
                <p style={{ fontSize: 12, color: '#4a6785', marginTop: 4 }}>
                  {lang === 'en' ? 'Odds that moved 5%+ in the last hour — sharp money signal' : 'Cuotas que se movieron 5%+ en la última hora — señal de dinero inteligente'}
                </p>
              </div>

              {!oddsRadarLoaded && (
                <div style={{ textAlign: 'center', padding: 40, color: '#4a6785', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                  {lang === 'en' ? 'Loading...' : 'Cargando...'}
                </div>
              )}

              {oddsRadarLoaded && oddsMovers.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#4a6785', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                  {lang === 'en' ? '// No significant odds movement detected in the last hour' : '// Sin movimientos significativos de cuotas en la última hora'}
                </div>
              )}

              <div style={{ display: 'grid', gap: 1, background: '#1a2e4a', borderRadius: 10, overflow: 'hidden', opacity: oddsFlash ? 0.7 : 1, transition: 'opacity 0.15s ease' }}>
                {oddsMovers.map((mv, i) => {
                  const isDrop = mv.pct_change < 0
                  const color = isDrop ? '#00c878' : '#ff4d4d'
                  const arrow = isDrop ? '▼' : '▲'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#0a1626', fontFamily: "'DM Mono', monospace", fontSize: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: '#4a6785', fontSize: 10, minWidth: 34 }}>{mv.league_name?.slice(0, 3).toUpperCase()}</span>
                      <span style={{ color: '#f2f6ff', fontWeight: 700, flex: 1, minWidth: 160 }}>{mv.home_team_name} vs {mv.away_team_name}</span>
                      <span style={{ color: '#8ba2c0', fontSize: 10, background: 'rgba(139,162,192,0.1)', padding: '2px 6px', borderRadius: 4 }}>{mv.market}</span>
                      <span style={{ color: '#8ba2c0' }}>@ {mv.to.toFixed(2)}</span>
                      <span style={{ color, fontWeight: 700 }}>{arrow} {Math.abs(mv.to - mv.from).toFixed(2)} ({mv.pct_change > 0 ? '+' : ''}{mv.pct_change}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── EARLY LINES TAB ── */}
          {activeTab === 'early' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 10, color: '#ffb400', letterSpacing: 6, textTransform: 'uppercase', marginBottom: 6 }}>◆ FOOTYEDGE ELITE</div>
                <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 4, color: 'white', margin: 0 }}>
                  EARLY <span style={{ color: '#ffb400' }}>LINE HUNTER</span>
                </h2>
                <p style={{ color: '#4a6785', fontSize: 11, marginTop: 6 }}>
                  {lang === 'en' ? 'Value bets kicking off in 12+ hours — act before the market adjusts' : 'Value bets a más de 12h del inicio — actúa antes de que el mercado se ajuste'}
                </p>
              </div>
              {earlyLines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#4a6785' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
                  <div>{lang === 'en' ? 'No early lines detected right now' : 'Sin early lines detectadas ahora mismo'}</div>
                </div>
              ) : (
                <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {earlyLines.map((b: any, i: number) => {
                    const badge = mktBadge(b.market, lang)
                    return (
                      <div key={i} onClick={() => router.push(`/${lang}/match/${b.match_id}`)}
                        style={{ background: 'rgba(13,30,53,0.8)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 12, alignItems: 'center' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor='rgba(255,180,0,0.5)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor='rgba(255,180,0,0.2)'}
                      >
                        <div style={{ fontSize: 10, color: '#ffb400', fontWeight: 700, minWidth: 28 }}>#{i+1}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>
                            {b.home_team} <span style={{ color: '#00c878', fontWeight: 400 }}>vs</span> {b.away_team}
                          </div>
                          <div style={{ fontSize: 10, color: '#4a6785', marginTop: 2 }}>
                            {b.league_name} · ⏰ {b.hours_until}h {lang === 'en' ? 'away' : 'restantes'}
                          </div>
                        </div>
                        <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 13, letterSpacing: '0.08em', padding: '3px 12px', borderRadius: 999, background: badge.bg, color: badge.color, border: `1px solid ${badge.color}66` }}>{badge.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'white', minWidth: 40 }}>{b.odds?.toFixed(2)}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 80 }}>
                          <span style={{ fontSize: 12, color: '#ffb400', fontWeight: 700 }}>EV +{(b.ev * 100).toFixed(0)}%</span>
                          <span style={{ fontSize: 10, color: '#00c878' }}>Edge +{(b.edge * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Refresh Progress Bar */}
        {refreshProgress.active && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, background: 'rgba(7,13,26,0.97)', borderTop: '1px solid #1a2e4a', padding: '12px 24px' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#00c878', fontWeight: 600 }}>
                  ⟳ {refreshProgress.label}
                </span>
                <span style={{ fontSize: 10, color: '#4a6785' }}>
                  {refreshProgress.current}/{refreshProgress.total}
                </span>
              </div>
              <div style={{ background: '#0f1e32', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: refreshProgress.total > 0 ? `${(refreshProgress.current / refreshProgress.total) * 100}%` : '5%',
                  background: 'linear-gradient(90deg, #00c878, #00a860)',
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                  boxShadow: '0 0 8px rgba(0,200,120,0.5)',
                }} />
              </div>
              <div style={{ fontSize: 9, color: '#4a6785', marginTop: 6, textAlign: 'center' }}>
                {lang === 'en' ? 'Analyzing leagues — do not close this window' : 'Analizando ligas — no cierres esta ventana'}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1a2e4a', padding: '12px 24px', textAlign: 'center', marginTop: 32 }}>
          <span style={{ fontSize: 10, color: '#2a3f5a' }}>FootyEdge 2.0 · Modelo Poisson + Dixon-Coles · Las probabilidades son estimaciones matemáticas, no garantía de resultado · Ningún modelo bate al mercado de forma consistente · Apuesta responsablemente · Solo mayores de 18 años</span>
        </div>

        {/* Glossary modal */}
        {showGlossary && (
          <div onClick={() => setShowGlossary(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,10,20,0.75)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 92vw)', height: '100vh', background: '#0e1829', borderLeft: '1px solid #1a2e4a', overflowY: 'auto', padding: '24px 22px 60px', boxShadow: '-12px 0 40px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 26, letterSpacing: '0.02em', color: '#f6b93b' }}>
                  📖 {lang === 'en' ? 'Glossary' : 'Glosario'}
                </span>
                <button onClick={() => setShowGlossary(false)} style={{ background: 'transparent', border: '1px solid #1a2e4a', color: '#8ba2c0', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {(lang === 'en' ? [
                  { t: 'Edge', d: 'The gap between the probability our model calculates for an outcome and the probability implied by the market\'s odds. A positive edge means the model thinks the real chance is higher than what the odds suggest.' },
                  { t: 'EV (Expected Value)', d: 'The average return you\'d expect from a bet if you could repeat it many times, given the model\'s estimated probability and the odds offered. Positive EV means the bet is priced favorably over the long run — it does not guarantee winning any single bet.' },
                  { t: 'Rating (1–10)', d: 'A simplified 0–10 score derived from the confidence score, meant to give a quick read on how reliable a pick is at a glance.' },
                  { t: 'Confidence Score', d: 'An internal score that penalizes picks based on limited data — for example, teams with very few games played this season. Low-confidence picks are filtered out of Value Bets even if their raw EV looks high.' },
                  { t: 'Model vs. Market Divergence', d: 'The gap in percentage points between the model\'s raw probability and the market-implied probability from the odds. A large divergence can mean real value — or it can mean the model is working with noisy data. Always read it alongside the rating.' },
                  { t: 'Value Bet', d: 'A pick where the model\'s probability, blended with market prices for extra stability, exceeds the market\'s implied probability by at least the league\'s minimum edge threshold.' },
                  { t: 'BTTS', d: 'Both Teams To Score — a market betting on whether both sides will score at least one goal in the match.' },
                  { t: 'Over/Under 2.5', d: 'A market betting on whether the total goals in a match will be above (Over) or below (Under) 2.5 — since goals are whole numbers, there\'s no draw outcome for this line.' },
                  { t: 'Dixon-Coles Model', d: 'The statistical engine behind FootyEdge: a Poisson-based model for predicting football scorelines, refined with a correction term (rho) for low-scoring matches and adjusted per league.' },
                  { t: 'Elo Rating', d: 'A relative team-strength score that updates after every settled match based on the result and goal margin — higher Elo means a stronger team relative to its league.' },
                ] : [
                  { t: 'Edge', d: 'La diferencia entre la probabilidad que calcula nuestro modelo para un resultado y la probabilidad implícita en la cuota del mercado. Un edge positivo significa que el modelo cree que la chance real es mayor de lo que sugiere la cuota.' },
                  { t: 'EV (Valor Esperado)', d: 'El retorno promedio que esperarías de una apuesta si pudieras repetirla muchas veces, dada la probabilidad estimada del modelo y la cuota ofrecida. Un EV positivo significa que la apuesta está bien pagada a largo plazo — no garantiza ganar una apuesta individual.' },
                  { t: 'Rating (1–10)', d: 'Un puntaje simplificado de 0 a 10 derivado del confidence score, pensado para dar una lectura rápida de qué tan confiable es un pick de un vistazo.' },
                  { t: 'Confidence Score', d: 'Un puntaje interno que penaliza los picks con datos limitados — por ejemplo, equipos con muy pocos partidos jugados esta temporada. Los picks de baja confianza se filtran de Value Bets aunque su EV crudo se vea alto.' },
                  { t: 'Divergencia Modelo-Mercado', d: 'La diferencia en puntos porcentuales entre la probabilidad cruda del modelo y la probabilidad implícita del mercado según la cuota. Una divergencia grande puede significar valor real — o puede significar que el modelo está trabajando con datos con ruido. Léela siempre junto al rating.' },
                  { t: 'Value Bet', d: 'Un pick donde la probabilidad del modelo, mezclada con precios de mercado para más estabilidad, supera la probabilidad implícita del mercado por al menos el umbral mínimo de edge de esa liga.' },
                  { t: 'BTTS', d: 'Ambos equipos anotan (Both Teams To Score) — un mercado que apuesta a si ambos equipos marcarán al menos un gol en el partido.' },
                  { t: 'Over/Under 2.5', d: 'Un mercado que apuesta a si el total de goles del partido será mayor (Over) o menor (Under) a 2.5 — como los goles son números enteros, esta línea no tiene resultado de empate.' },
                  { t: 'Modelo Dixon-Coles', d: 'El motor estadístico detrás de FootyEdge: un modelo basado en Poisson para predecir marcadores de fútbol, refinado con un término de corrección (rho) para partidos de bajo marcador y ajustado por liga.' },
                  { t: 'Rating Elo', d: 'Un puntaje relativo de fuerza de equipo que se actualiza después de cada partido liquidado según el resultado y el margen de goles — un Elo más alto significa un equipo más fuerte respecto a su liga.' },
                ]).map((item, i) => (
                  <div key={i} style={{ border: '1px solid #1a2e4a', borderRadius: 12, padding: '14px 16px', background: 'rgba(13,30,53,0.5)' }}>
                    <div style={{ color: '#00c878', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.t}</div>
                    <div style={{ color: '#8ba2c0', fontSize: 13, lineHeight: 1.6 }}>{item.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
