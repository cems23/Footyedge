// components/PerformanceChart.js
import { useState, useEffect } from "react";

const STAKE = 10; // €10 por apuesta simulada

function calcROI(bets) {
  if (!bets.length) return { roi: 0, profit: 0, won: 0, total: 0, winRate: 0 };
  const total   = bets.length;
  const won     = bets.filter(b => b.hit).length;
  const profit  = bets.reduce((acc, b) => acc + (b.hit ? (b.odd - 1) * STAKE : -STAKE), 0);
  const roi     = ((profit / (total * STAKE)) * 100).toFixed(1);
  const winRate = Math.round((won / total) * 100);
  return { roi, profit: profit.toFixed(1), won, total, winRate };
}

export default function PerformanceChart({ matches, collapsed, onToggle }) {
  const completed = matches.filter(m =>
    m.status === "complete" &&
    m.homeGoalCount != null &&
    m.awayGoalCount != null
  );

  // Simular apuestas: si prob ≥ threshold, apostamos
  function buildBets(threshold, field, resultFn, oddField) {
    return completed
      .filter(m => (m[field] ?? 0) >= threshold)
      .map(m => ({
        match:  `${m.home_name} vs ${m.away_name}`,
        prob:   m[field],
        odd:    m[oddField] ? parseFloat(m[oddField]) : null,
        hit:    resultFn(m),
        date:   m.date_unix,
      }))
      .filter(b => b.odd);
  }

  const bttsBets   = buildBets(65, "btts_potential",
    m => m.homeGoalCount > 0 && m.awayGoalCount > 0,
    "odds_btts_yes"
  );
  const over25Bets = buildBets(65, "o25_potential",
    m => (m.homeGoalCount + m.awayGoalCount) > 2.5,
    "odds_ft_over25"
  );
  const over15Bets = buildBets(70, "o15_potential",
    m => (m.homeGoalCount + m.awayGoalCount) > 1.5,
    "odds_ft_over15"
  );

  const strategies = [
    { label:"BTTS ≥65%",   bets: bttsBets,   color:"#3dd68c" },
    { label:"Over 2.5 ≥65%", bets: over25Bets, color:"#f5c542" },
    { label:"Over 1.5 ≥70%", bets: over15Bets, color:"#5ba3ff" },
  ];

  const hasData = strategies.some(s => s.bets.length > 0);

  return (
    <div style={{ background:"var(--s1)", border:"1px solid var(--border)", borderRadius:8, marginBottom:16 }}>
      <button onClick={onToggle} style={{
        width:"100%", display:"flex", alignItems:"center", gap:8, padding:"12px 16px",
        background:"none", border:"none", cursor:"pointer", color:"var(--text)",
      }}>
        <span style={{ fontFamily:"var(--mono)", fontSize:10, letterSpacing:"1.5px", textTransform:"uppercase", color:"var(--blue)" }}>📊 Rendimiento de sugerencias</span>
        <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)" }}>simulando €{STAKE}/apuesta</span>
        <span style={{ marginLeft:"auto", color:"var(--muted)", fontSize:12 }}>{collapsed ? "▼" : "▲"}</span>
      </button>

      {!collapsed && (
        <div style={{ padding:"0 16px 16px" }}>
          {!hasData ? (
            <div style={{ textAlign:"center", padding:"20px 0", fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)" }}>
              Sin partidos completados hoy para calcular rendimiento
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {strategies.map(({ label, bets, color }) => {
                const stats = calcROI(bets);
                if (stats.total === 0) return null;

                // Mini bar chart — acumulado por apuesta
                let cumulative = 0;
                const points = bets.map(b => {
                  cumulative += b.hit ? (b.odd - 1) * STAKE : -STAKE;
                  return cumulative;
                });
                const maxAbs = Math.max(...points.map(Math.abs), 1);
                const chartW = 200;
                const chartH = 40;

                return (
                  <div key={label} style={{ background:"var(--s2)", border:"1px solid var(--border)", borderRadius:8, padding:"12px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, flexWrap:"wrap", gap:6 }}>
                      <span style={{ fontFamily:"var(--mono)", fontSize:11, fontWeight:700, color }}>{label}</span>
                      <div style={{ display:"flex", gap:10 }}>
                        <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)" }}>{stats.won}/{stats.total} aciertos ({stats.winRate}%)</span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:12, fontWeight:700, color: parseFloat(stats.profit) >= 0 ? "var(--green)" : "var(--red)" }}>
                          {parseFloat(stats.profit) >= 0 ? "+" : ""}{stats.profit}€
                        </span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)" }}>ROI: {stats.roi}%</span>
                      </div>
                    </div>

                    {/* SVG line chart */}
                    {points.length > 1 && (
                      <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" style={{ display:"block", marginBottom:8 }}>
                        <line x1="0" y1={chartH/2} x2={chartW} y2={chartH/2} stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
                        <polyline
                          points={points.map((v, i) => {
                            const x = (i / (points.length - 1)) * chartW;
                            const y = chartH/2 - (v / maxAbs) * (chartH/2 - 4);
                            return `${x},${y}`;
                          }).join(" ")}
                          fill="none"
                          stroke={color}
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        {points.map((v, i) => {
                          const x = (i / (points.length - 1)) * chartW;
                          const y = chartH/2 - (v / maxAbs) * (chartH/2 - 4);
                          return <circle key={i} cx={x} cy={y} r="3" fill={v >= 0 ? "#3dd68c" : "#f5544a"} />;
                        })}
                      </svg>
                    )}

                    {/* Lista de apuestas */}
                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                      {bets.slice(-5).map((b, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
                          <span style={{ fontSize:10 }}>{b.hit ? "✅" : "❌"}</span>
                          <span style={{ flex:1, color:"var(--muted)", fontFamily:"var(--mono)", fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.match}</span>
                          <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)" }}>{b.prob}%</span>
                          <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--yellow)" }}>@{b.odd?.toFixed(2)}</span>
                          <span style={{ fontFamily:"var(--mono)", fontSize:10, fontWeight:700, color: b.hit ? "var(--green)" : "var(--red)", minWidth:40, textAlign:"right" }}>
                            {b.hit ? `+${((b.odd - 1) * STAKE).toFixed(1)}` : `-${STAKE}`}€
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
