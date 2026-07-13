import { useState, useEffect } from "react";

function StatRow({ label, homeVal, awayVal, higherIsBetter = true, isPercent = true }) {
  const h = parseFloat(homeVal) || 0;
  const a = parseFloat(awayVal) || 0;
  const homeBetter = higherIsBetter ? h > a : h < a;
  const awayBetter = higherIsBetter ? a > h : a < h;
  const fmt = v => v != null ? (isPercent ? `${v}%` : v) : "—";

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
      <div style={{ textAlign:"right", fontFamily:"var(--mono)", fontSize:13, fontWeight: homeBetter ? 700 : 400, color: homeBetter ? "var(--green)" : "var(--text)" }}>
        {fmt(homeVal)}
      </div>
      <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)", textAlign:"center", letterSpacing:".5px", minWidth:120 }}>{label}</div>
      <div style={{ textAlign:"left", fontFamily:"var(--mono)", fontSize:13, fontWeight: awayBetter ? 700 : 400, color: awayBetter ? "var(--green)" : "var(--text)" }}>
        {fmt(awayVal)}
      </div>
    </div>
  );
}

export default function CompareModal({ homeId, homeName, awayId, awayName, leagueId, onClose }) {
  const [homeData, setHomeData] = useState(null);
  const [awayData, setAwayData] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/team-stats?teamId=${homeId}&leagueId=${leagueId}`).then(r => r.json()),
      fetch(`/api/team-stats?teamId=${awayId}&leagueId=${leagueId}`).then(r => r.json()),
    ]).then(([h, a]) => {
      setHomeData(h.team || {});
      setAwayData(a.team || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [homeId, awayId, leagueId]);

  const h = homeData || {};
  const a = awayData || {};

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:"var(--s1)", border:"1px solid var(--border2)", borderRadius:12,
        width:"100%", maxWidth:640, maxHeight:"90vh", overflow:"hidden",
        display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,.6)",
      }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", padding:"16px 20px", borderBottom:"1px solid var(--border)", background:"var(--s2)" }}>
          <div style={{ fontFamily:"var(--sans)", fontSize:16, fontWeight:800, color:"var(--blue)" }}>{homeName}</div>
          <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)", textAlign:"center", padding:"0 12px" }}>VS</div>
          <div style={{ fontFamily:"var(--sans)", fontSize:16, fontWeight:800, color:"var(--yellow)", textAlign:"right" }}>{awayName}</div>
          <button onClick={onClose} style={{
            position:"absolute", right:20, top:16,
            background:"var(--s3)", border:"1px solid var(--border2)", color:"var(--muted)",
            borderRadius:6, padding:"6px 12px", cursor:"pointer", fontSize:16,
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ overflowY:"auto", flex:1, padding:"16px 20px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:"2px solid var(--border2)", borderTopColor:"var(--blue)", animation:"spin .7s linear infinite", margin:"0 auto 12px" }} />
              <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)" }}>COMPARANDO...</div>
            </div>
          ) : (
            <div>
              {/* Cabecera columnas */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, marginBottom:8 }}>
                <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--blue)", textAlign:"right", letterSpacing:"1px", textTransform:"uppercase" }}>LOCAL</div>
                <div style={{ minWidth:120 }} />
                <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--yellow)", letterSpacing:"1px", textTransform:"uppercase" }}>VISITANTE</div>
              </div>

              <StatRow label="PPG Local"              homeVal={h.home_ppg?.toFixed(2)}          awayVal={a.home_ppg?.toFixed(2)}          isPercent={false} />
              <StatRow label="PPG Visitante"           homeVal={h.away_ppg?.toFixed(2)}          awayVal={a.away_ppg?.toFixed(2)}          isPercent={false} />
              <StatRow label="Goles marcados/partido"  homeVal={h.avg_goals_scored?.toFixed(2)}  awayVal={a.avg_goals_scored?.toFixed(2)}  isPercent={false} />
              <StatRow label="Goles recibidos/partido" homeVal={h.avg_goals_conceded?.toFixed(2)} awayVal={a.avg_goals_conceded?.toFixed(2)} higherIsBetter={false} isPercent={false} />
              <StatRow label="xG a favor"              homeVal={h.xg_for?.toFixed(2)}            awayVal={a.xg_for?.toFixed(2)}            isPercent={false} />
              <StatRow label="xG en contra"            homeVal={h.xg_against?.toFixed(2)}        awayVal={a.xg_against?.toFixed(2)}        higherIsBetter={false} isPercent={false} />
              <StatRow label="BTTS %"                  homeVal={h.btts_pct}                      awayVal={a.btts_pct} />
              <StatRow label="Over 2.5 %"              homeVal={h.over25_pct}                    awayVal={a.over25_pct} />
              <StatRow label="Over 1.5 %"              homeVal={h.over15_pct}                    awayVal={a.over15_pct} />
              <StatRow label="Portería a cero %"       homeVal={h.clean_sheets_pct}              awayVal={a.clean_sheets_pct} />
              <StatRow label="% Victorias"             homeVal={h.won_pct}                       awayVal={a.won_pct} />
              <StatRow label="Abre marcador %"         homeVal={h.scored_first_pct}              awayVal={a.scored_first_pct} />
              <StatRow label="Posesión media %"        homeVal={h.possession_avg}                awayVal={a.possession_avg} />

              {/* Veredicto */}
              <div style={{ marginTop:20, padding:"14px 16px", background:"var(--s2)", border:"1px solid var(--border)", borderRadius:8 }}>
                <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 }}>Veredicto</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {(() => {
                    const insights = [];
                    const avgBtts = ((h.btts_pct || 0) + (a.btts_pct || 0)) / 2;
                    const avgO25  = ((h.over25_pct || 0) + (a.over25_pct || 0)) / 2;
                    if (avgBtts >= 55) insights.push({ text: `Ambos equipos promedian ${avgBtts.toFixed(0)}% BTTS — partido con goles probable`, color:"var(--green)" });
                    if (avgO25 >= 55)  insights.push({ text: `Media Over 2.5 del ${avgO25.toFixed(0)}% — espera más de 2 goles`, color:"var(--yellow)" });
                    const bestDef = (h.avg_goals_conceded || 0) < (a.avg_goals_conceded || 0) ? homeName : awayName;
                    insights.push({ text: `Mejor defensa: ${bestDef}`, color:"var(--blue)" });
                    const bestOff = (h.avg_goals_scored || 0) > (a.avg_goals_scored || 0) ? homeName : awayName;
                    insights.push({ text: `Mejor ataque: ${bestOff}`, color:"var(--blue)" });
                    return insights.map((ins, i) => (
                      <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                        <span style={{ color:ins.color, fontSize:12 }}>▸</span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text)" }}>{ins.text}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
