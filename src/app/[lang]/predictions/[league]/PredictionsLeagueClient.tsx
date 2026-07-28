'use client'
import { useEffect, useState } from 'react'
import { PredictionsPage, Logo } from '@/components/predictions/PredictionsShell'

const CARD = 'rgba(13,30,53,0.6)'
const BORDER = '#1a2e4a'
const G = '#00c878'
const MUTE = '#8ba2c0'

export default function PredictionsLeagueClient({ leagueId, leagueName, lang }: { leagueId: number; leagueName: string; lang: string }) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/public/league-predictions?leagueId=${leagueId}`)
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .finally(() => setLoading(false))
  }, [leagueId])

  const isEs = lang === 'es'
  const todayStr = new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-GB', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <PredictionsPage>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <a href={`/${lang}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
          <Logo size={72} />
        </a>

        <a href={`/${lang}/predictions`} style={{ fontSize: 11, color: MUTE, textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
          ← {isEs ? 'Todas las ligas' : 'All leagues'}
        </a>

        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(32px,5vw,46px)', color: G, letterSpacing: '0.02em', margin: '0 0 6px', textTransform: 'uppercase' }}>
          {leagueName}
        </h1>
        <p style={{ fontSize: 13, color: MUTE, marginBottom: 28, textTransform: 'capitalize' }}>
          {isEs ? 'Predicciones para hoy' : "Today's predictions"} · {todayStr}
        </p>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: MUTE, fontSize: 13 }}>
            {isEs ? 'Cargando...' : 'Loading...'}
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: MUTE, fontSize: 13, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            {isEs ? `No hay partidos de ${leagueName} programados para hoy.` : `No ${leagueName} matches scheduled today.`}
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {matches.map((m, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.home_team_logo && <img src={m.home_team_logo} width={18} height={18} alt="" />}
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{m.home_team_name}</span>
                  <span style={{ color: G, fontSize: 11 }}>vs</span>
                  {m.away_team_logo && <img src={m.away_team_logo} width={18} height={18} alt="" />}
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{m.away_team_name}</span>
                </div>
                <span style={{ fontSize: 11, color: MUTE }}>
                  {new Date(m.kickoff_at).toLocaleTimeString(isEs ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {m.prob_home_win != null ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {[
                    { label: '1', value: m.prob_home_win },
                    { label: 'X', value: m.prob_draw },
                    { label: '2', value: m.prob_away_win },
                    { label: 'O2.5', value: m.prob_over25 },
                    { label: 'BTTS', value: m.prob_btts },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: G }}>{s.value}%</div>
                      <div style={{ fontSize: 9, color: MUTE, textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: MUTE, textAlign: 'center' }}>
                  {isEs ? 'Análisis pendiente' : 'Analysis pending'}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <a href={`/${lang}/auth/register`} style={{ display: 'inline-block', background: G, color: '#070d1a', fontWeight: 700, fontSize: 14, padding: '14px 30px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 8px 30px rgba(0,200,120,0.3)' }}>
            {isEs ? 'Ver todas las señales gratis →' : 'See all signals free →'}
          </a>
        </div>
      </div>
    </PredictionsPage>
  )
}
