'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const BG = '#070d1a'
const CARD = 'rgba(13,30,53,0.6)'
const BORDER = '#1a2e4a'
const G = '#00c878'
const GOLD = '#ffb400'
const MUTE = '#8ba2c0'

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, ...style }}>
      {children}
    </div>
  )
}

function Stat({ label, value, color = 'white', sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: MUTE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTE, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'white', letterSpacing: '0.04em', margin: '32px 0 14px', textTransform: 'uppercase' }}>
      {children}
    </h2>
  )
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%` }
function hrColor(hr: number) { return hr >= 0.5 ? G : hr >= 0.35 ? GOLD : '#ff5555' }

export default function AdminPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async r => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error(d.error || `Error ${r.status}`)
        }
        return r.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTE, fontFamily: "'DM Mono', monospace" }}>Cargando panel...</div>
  }

  if (error) {
    return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff5555', fontFamily: "'DM Mono', monospace" }}>{error}</div>
  }

  const { users, modelPerformance, pipeline, aiAnalysis, probabilityPicksPerformance, aiSignalCheck } = data

  return (
    <div style={{ minHeight: '100vh', background: BG, color: 'white', fontFamily: "'DM Mono', monospace", padding: '32px clamp(16px,4vw,48px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: G, letterSpacing: '0.2em', marginBottom: 6 }}>◆ FOOTYEDGE ADMIN</div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, margin: 0, letterSpacing: '0.02em' }}>PANEL DE CONTROL</h1>
          </div>
          <button onClick={() => router.push('/es/dashboard')} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTE, padding: '8px 16px', borderRadius: 999, fontSize: 12, cursor: 'pointer' }}>
            ← Volver al Dashboard
          </button>
        </div>

        {/* ── AI SIGNAL CHECK (modo observar) ── */}
        {aiSignalCheck && (
          <>
            <SectionTitle>🤖 AI Signal Check — modo observar</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 14 }}>
              <Card>
                <Stat
                  label="Gasto este mes"
                  value={`$${aiSignalCheck.budgetSpentUsd.toFixed(2)}`}
                  color={aiSignalCheck.budgetSpentUsd >= aiSignalCheck.budgetLimitUsd ? '#ff5555' : G}
                  sub={`límite $${aiSignalCheck.budgetLimitUsd}`}
                />
              </Card>
              <Card><Stat label="Llamadas este mes" value={aiSignalCheck.callsThisMonth} /></Card>
              <Card><Stat label="Total checks histórico" value={aiSignalCheck.totalChecks} color={MUTE} /></Card>
            </div>

            <Card style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: MUTE, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Comparativo hit rate — ¿la IA detecta algo real?
              </div>
              {aiSignalCheck.hitRateComparison ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#ff8888', marginBottom: 4 }}>⚠️ IA marcó riesgo (penalty &gt;15)</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: '#ff8888' }}>
                      {aiSignalCheck.hitRateComparison.flagged.hr != null ? `${(aiSignalCheck.hitRateComparison.flagged.hr * 100).toFixed(1)}%` : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: MUTE }}>{aiSignalCheck.hitRateComparison.flagged.won}/{aiSignalCheck.hitRateComparison.flagged.total} liquidados</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: G, marginBottom: 4 }}>✅ IA sin alertas</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: G }}>
                      {aiSignalCheck.hitRateComparison.clean.hr != null ? `${(aiSignalCheck.hitRateComparison.clean.hr * 100).toFixed(1)}%` : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: MUTE }}>{aiSignalCheck.hitRateComparison.clean.won}/{aiSignalCheck.hitRateComparison.clean.total} liquidados</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: MUTE }}>Aún no hay suficientes picks liquidados para comparar — vuelve en 1-2 semanas.</div>
              )}
            </Card>

            {aiSignalCheck.recentChecks?.length > 0 && (
              <Card style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: MUTE, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checks recientes</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {aiSignalCheck.recentChecks.map((c: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, borderBottom: i < aiSignalCheck.recentChecks.length - 1 ? `1px solid ${BORDER}` : 'none', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: MUTE }}>{c.market}</span>
                      <span style={{ flex: 1, color: c.confidence_penalty > 15 ? '#ff8888' : 'white' }}>{c.reason || '—'}</span>
                      <span style={{ color: c.confidence_penalty > 15 ? '#ff8888' : G, fontWeight: 700 }}>
                        {c.adjustment > 0 ? '+' : ''}{c.adjustment} / penalty {c.confidence_penalty}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── USUARIOS ── */}
        <SectionTitle>👥 Usuarios</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14 }}>
          <Card><Stat label="Total usuarios" value={users.total} /></Card>
          <Card><Stat label="Free" value={users.byPlan.free ?? 0} color={MUTE} /></Card>
          <Card><Stat label="Pro" value={users.byPlan.pro ?? 0} color={G} /></Card>
          <Card><Stat label="Elite" value={users.byPlan.elite ?? 0} color={GOLD} /></Card>
          <Card><Stat label="Registros (7 días)" value={users.signupsLast7d} color={G} /></Card>
          <Card><Stat label="Registros (30 días)" value={users.signupsLast30d} color={G} /></Card>
        </div>
        {users.recentSignups.length > 0 && (
          <Card style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: MUTE, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Registros recientes</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {users.recentSignups.map((u: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: i < users.recentSignups.length - 1 ? `1px solid ${BORDER}` : 'none', paddingBottom: 6 }}>
                  <span>{u.email}</span>
                  <span style={{ color: u.plan === 'elite' ? GOLD : u.plan === 'pro' ? G : MUTE }}>{u.plan ?? 'free'}</span>
                  <span style={{ color: MUTE }}>{new Date(u.created_at).toLocaleDateString('es-ES')}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── RENDIMIENTO DEL MODELO ── */}
        <SectionTitle>📊 Rendimiento del Modelo</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14 }}>
          <Card><Stat label="Total liquidadas" value={modelPerformance.global.total} /></Card>
          <Card><Stat label="Hit rate global" value={pct(modelPerformance.global.hr)} color={hrColor(modelPerformance.global.hr)} /></Card>
          <Card><Stat label="Profit total" value={`${modelPerformance.global.profit >= 0 ? '+' : ''}${modelPerformance.global.profit.toFixed(2)}u`} color={modelPerformance.global.profit >= 0 ? G : '#ff5555'} /></Card>
        </div>

        <Card style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: MUTE, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Por mercado</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {modelPerformance.byMarket.sort((a: any, b: any) => b.total - a.total).map((m: any, i: number) => (
              <div key={m.market} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', gap: 10, fontSize: 13, borderBottom: i < modelPerformance.byMarket.length - 1 ? `1px solid ${BORDER}` : 'none', paddingBottom: 6 }}>
                <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{m.market}</span>
                <span>{m.wins}/{m.total}</span>
                <span style={{ color: hrColor(m.hr), fontWeight: 700 }}>{pct(m.hr)}</span>
                <span style={{ color: m.profit >= 0 ? G : '#ff5555' }}>{m.profit >= 0 ? '+' : ''}{m.profit.toFixed(2)}u</span>
              </div>
            ))}
          </div>
        </Card>

        {modelPerformance.byLeague.length > 0 && (
          <Card style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: MUTE, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Por liga (top 15 por volumen)</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {modelPerformance.byLeague.map((l: any, i: number) => (
                <div key={l.league} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px', gap: 10, fontSize: 13, borderBottom: i < modelPerformance.byLeague.length - 1 ? `1px solid ${BORDER}` : 'none', paddingBottom: 6 }}>
                  <span>{l.league}</span>
                  <span>{l.wins}/{l.total}</span>
                  <span style={{ color: hrColor(l.hr), fontWeight: 700 }}>{pct(l.hr)}</span>
                  <span style={{ color: l.profit >= 0 ? G : '#ff5555' }}>{l.profit >= 0 ? '+' : ''}{l.profit.toFixed(2)}u</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── PROBABILITY PICKS (Mejores BTTS del día, etc.) ── */}
        {probabilityPicksPerformance && probabilityPicksPerformance.length > 0 && (
          <>
            <SectionTitle>🎯 Picks de Probabilidad (no son Value Bets con cuotas)</SectionTitle>
            <Card>
              <div style={{ fontSize: 11, color: MUTE, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Ej. "Mejores BTTS del día" — basado solo en probabilidad del modelo, sin cuotas reales de mercado
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {probabilityPicksPerformance.map((m: any, i: number) => (
                  <div key={m.market} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: 10, fontSize: 13, borderBottom: i < probabilityPicksPerformance.length - 1 ? `1px solid ${BORDER}` : 'none', paddingBottom: 6 }}>
                    <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{m.market}</span>
                    <span>{m.wins}/{m.total}</span>
                    <span style={{ color: hrColor(m.hr), fontWeight: 700 }}>{pct(m.hr)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ── SALUD DEL PIPELINE ── */}
        <SectionTitle>⚙️ Salud del Pipeline</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14 }}>
          <Card><Stat label="Última actualización" value={pipeline.lastMatchUpdatedAt ? new Date(pipeline.lastMatchUpdatedAt).toLocaleString('es-ES') : '—'} /></Card>
          <Card><Stat label="Partidos hoy" value={pipeline.matchesToday} color={G} /></Card>
          <Card><Stat label="Ligas con datos hoy" value={pipeline.leaguesWithDataToday} color={G} /></Card>
          <Card><Stat label="Rankings hoy" value={pipeline.rankingsToday} color={G} /></Card>
          <Card><Stat label="Sin liquidar (vencidos)" value={pipeline.unsettledOverdue} color={pipeline.unsettledOverdue > 0 ? GOLD : G} /></Card>
        </div>

        {/* ── ANÁLISIS IA ── */}
        <SectionTitle>🤖 Análisis IA</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14 }}>
          <Card><Stat label="Total generados" value={aiAnalysis.totalGenerated} /></Card>
          <Card><Stat label="Pagados ($1.39)" value={aiAnalysis.paidViaStripe} color={G} /></Card>
          <Card><Stat label="Vía cuota gratis" value={aiAnalysis.paidViaQuota} color={GOLD} /></Card>
          <Card><Stat label="Ingreso estimado" value={`$${aiAnalysis.revenueEstimateUsd.toFixed(2)}`} color={G} /></Card>
          <Card><Stat label="Este mes" value={aiAnalysis.generatedThisMonth} /></Card>
        </div>

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
