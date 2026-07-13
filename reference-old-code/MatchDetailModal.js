// components/MatchDetailModal.js
import { useState, useEffect } from "react";

function fmt(unix) {
  if (!unix) return "";
  return new Date(unix * 1000).toLocaleDateString("es", { day:"numeric", month:"short", year:"numeric" });
}

function StatPill({ label, val, color = "var(--green)" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", background:"var(--s2)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 14px", flex:1, minWidth:80 }}>
      <span style={{ fontFamily:"var(--mono)", fontSize:18, fontWeight:700, color }}>{val ?? "—"}</span>
      <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)", letterSpacing:".5px", textTransform:"uppercase", marginTop:3, textAlign:"center" }}>{label}</span>
    </div>
  );
}

function InjuryList({ players, teamName }) {
  if (!players || players.length === 0) return (
    <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)", padding:"8px 0" }}>Sin lesiones conocidas ✓</div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {players.map((p, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background:"var(--s2)", border:`1px solid ${p.status==="suspended"?"rgba(245,197,66,.2)":"rgba(245,84,74,.2)"}`, borderRadius:6 }}>
          <span style={{ fontSize:14 }}>{p.status === "suspended" ? "🟡" : "🔴"}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{p.name}</div>
            <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)" }}>{p.position}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"var(--mono)", fontSize:10, color: p.status==="suspended" ? "var(--yellow)" : "var(--red)", textTransform:"uppercase", fontWeight:700 }}>{p.status}</div>
            {p.return_date && <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)" }}>Vuelta: {p.return_date}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function H2HRow({ m, homeTeamName }) {
  const homeWon = m.home_score > m.away_score;
  const draw    = m.home_score === m.away_score;
  const total   = (m.home_score || 0) + (m.away_score || 0);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"var(--s2)", border:"1px solid var(--border)", borderRadius:6 }}>
      <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)", minWidth:70 }}>{fmt(m.date_unix)}</span>
      <span style={{ fontSize:12, fontWeight:700, flex:1 }}>{m.home_name} <span style={{ color:"var(--muted)", fontWeight:400 }}>vs</span> {m.away_name}</span>
      <div style={{ display:"flex", gap:4 }}>
        {m.btts   && <span style={{ fontFamily:"var(--mono)", fontSize:8, background:"rgba(61,214,140,.1)",  border:"1px solid rgba(61,214,140,.2)",  borderRadius:3, padding:"1px 5px", color:"var(--green)"  }}>BTTS</span>}
        {m.over25 && <span style={{ fontFamily:"var(--mono)", fontSize:8, background:"rgba(245,197,66,.1)", border:"1px solid rgba(245,197,66,.2)", borderRadius:3, padding:"1px 5px", color:"var(--yellow)" }}>+2.5</span>}
        {m.total_corners && <span style={{ fontFamily:"var(--mono)", fontSize:8, background:"rgba(91,163,255,.1)", border:"1px solid rgba(91,163,255,.2)", borderRadius:3, padding:"1px 5px", color:"var(--blue)" }}>⛳{m.total_corners}</span>}
      </div>
      <span style={{ fontFamily:"var(--mono)", fontSize:14, fontWeight:700, color: draw?"var(--yellow)":homeWon?"var(--green)":"var(--red)", minWidth:40, textAlign:"right" }}>
        {m.home_score} - {m.away_score}
      </span>
    </div>
  );
}

export default function MatchDetailModal({ match: m, onClose }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState("h2h");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/match-detail?matchId=${m.id}&homeId=${m.homeID}&awayId=${m.awayID}&leagueId=${m.competition_id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [m.id]);

  const s   = m; // match fields
  const h2h = data?.h2hStats || {};
  const homeLast5 = data?.homeLast5 || [];
  const awayLast5 = data?.awayLast5 || [];
  const tabs = ["h2h","forma","lesiones","córners"];

  const overlay = { position:"fixed", inset:0, background:"rgba(0,0,0,.8)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 };
  const modal   = { background:"var(--s1)", border:"1px solid var(--border2)", borderRadius:12, width:"100%", maxWidth:620, maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,.6)" };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>

        {/* Header */}
        <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)", background:"var(--s2)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)", letterSpacing:"1px" }}>
              {new Date(s.date_unix*1000).toLocaleDateString("es", { weekday:"long", day:"numeric", month:"long" })} · {s.stadium_name || ""}
            </div>
            <button onClick={onClose} style={{ background:"var(--s3)", border:"1px solid var(--border2)", color:"var(--muted)", borderRadius:6, padding:"5px 11px", cursor:"pointer" }}>✕</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8 }}>
            <div style={{ fontFamily:"var(--sans)", fontSize:18, fontWeight:800 }}>{s.home_name}</div>
            <div style={{ textAlign:"center" }}>
              {s.homeGoalCount != null
                ? <span style={{ fontFamily:"var(--mono)", fontSize:26, fontWeight:700, color:"var(--yellow)", letterSpacing:3 }}>{s.homeGoalCount} - {s.awayGoalCount}</span>
                : <span style={{ fontFamily:"var(--mono)", fontSize:13, color:"var(--muted)" }}>vs</span>
              }
            </div>
            <div style={{ fontFamily:"var(--sans)", fontSize:18, fontWeight:800, textAlign:"right" }}>{s.away_name}</div>
          </div>

          {/* Probabilidades clave */}
          <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
            {[
              { label:"BTTS", val:`${s.btts_potential}%`, color:"var(--green)" },
              { label:"Ov1.5", val:`${s.o15_potential}%`, color:"var(--blue)" },
              { label:"Ov2.5", val:`${s.o25_potential}%`, color:"var(--yellow)" },
              { label:"Ov3.5", val:`${s.o35_potential}%`, color:"#f97316" },
              { label:"Córners +9.5", val: s.corners_o95_potential ? `${s.corners_o95_potential}%` : "—", color:"var(--blue)" },
              { label:"xG Casa", val: s.team_a_xg_prematch ? s.team_a_xg_prematch.toFixed(2) : "—", color:"var(--green)" },
              { label:"xG Visit", val: s.team_b_xg_prematch ? s.team_b_xg_prematch.toFixed(2) : "—", color:"var(--red)" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background:"var(--s3)", border:"1px solid var(--border)", borderRadius:6, padding:"4px 9px", textAlign:"center" }}>
                <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".5px" }}>{label}</div>
                <div style={{ fontFamily:"var(--mono)", fontSize:13, fontWeight:700, color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Cuotas */}
          <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
            {[
              ["1X2", `${s.odds_ft_1 ? Number(s.odds_ft_1).toFixed(2) : "—"} · ${s.odds_ft_x ? Number(s.odds_ft_x).toFixed(2) : "—"} · ${s.odds_ft_2 ? Number(s.odds_ft_2).toFixed(2) : "—"}`],
              ["BTTS Sí", s.odds_btts_yes ? `@${Number(s.odds_btts_yes).toFixed(2)}` : "—"],
              ["Ov2.5", s.odds_ft_over25 ? `@${Number(s.odds_ft_over25).toFixed(2)}` : "—"],
              ["Ov3.5", s.odds_ft_over35 ? `@${Number(s.odds_ft_over35).toFixed(2)}` : "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background:"rgba(245,197,66,.06)", border:"1px solid rgba(245,197,66,.15)", borderRadius:5, padding:"3px 9px" }}>
                <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)" }}>{label}: </span>
                <span style={{ fontFamily:"var(--mono)", fontSize:11, fontWeight:700, color:"var(--yellow)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:4, padding:"8px 20px", borderBottom:"1px solid var(--border)", background:"var(--s2)" }}>
          {tabs.map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              fontFamily:"var(--mono)", fontSize:11, fontWeight:700, letterSpacing:".5px",
              textTransform:"uppercase", padding:"5px 12px", borderRadius:5,
              border:`1px solid ${tab===tb ? "var(--blue)" : "var(--border)"}`,
              background: tab===tb ? "rgba(91,163,255,.1)" : "transparent",
              color: tab===tb ? "var(--blue)" : "var(--muted)", cursor:"pointer",
            }}>{tb}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ overflowY:"auto", flex:1, padding:"16px 20px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"30px 0" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid var(--border2)", borderTopColor:"var(--blue)", animation:"spin .7s linear infinite", margin:"0 auto 10px" }} />
              <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)" }}>CARGANDO...</div>
            </div>
          ) : tab === "h2h" ? (
            <div>
              {/* H2H stats pills */}
              {h2h.total > 0 && (
                <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                  <StatPill label={`Victorias ${m.home_name?.split(" ")[0]}`} val={h2h.homeWins} color="var(--green)" />
                  <StatPill label="Empates"   val={h2h.draws}    color="var(--yellow)" />
                  <StatPill label={`Victorias ${m.away_name?.split(" ")[0]}`} val={h2h.awayWins} color="var(--red)" />
                  <StatPill label="BTTS %"    val={h2h.bttsPct != null ? `${h2h.bttsPct}%` : "—"} color="var(--green)" />
                  <StatPill label="Over 2.5 %" val={h2h.over25Pct != null ? `${h2h.over25Pct}%` : "—"} color="var(--yellow)" />
                  {h2h.avgCorners && <StatPill label="Córners prom" val={h2h.avgCorners} color="var(--blue)" />}
                </div>
              )}
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {(data?.h2h || []).length === 0
                  ? <div style={{ textAlign:"center", color:"var(--muted)", padding:"20px 0", fontFamily:"var(--mono)", fontSize:12 }}>Sin historial H2H disponible</div>
                  : (data?.h2h || []).map(match => <H2HRow key={match.id} m={match} homeTeamName={m.home_name} />)
                }
              </div>
            </div>

          ) : tab === "forma" ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[{title: m.home_name, matches: homeLast5}, {title: m.away_name, matches: awayLast5}].map(({ title, matches }) => (
                <div key={title}>
                  <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>{title}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {matches.length === 0
                      ? <div style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--muted)" }}>Sin datos</div>
                      : matches.map((mt, i) => {
                          const won  = mt.is_home ? mt.home_score > mt.away_score : mt.away_score > mt.home_score;
                          const draw = mt.home_score === mt.away_score;
                          const res  = draw ? "D" : won ? "W" : "L";
                          const rc   = res==="W" ? "var(--green)" : res==="D" ? "var(--yellow)" : "var(--red)";
                          const total = (mt.home_score||0) + (mt.away_score||0);
                          return (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 8px", background:"var(--s2)", border:"1px solid var(--border)", borderRadius:5 }}>
                              <span style={{ fontFamily:"var(--mono)", fontSize:10, fontWeight:700, color:rc, minWidth:14 }}>{res}</span>
                              <span style={{ fontSize:11, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{mt.home_name} vs {mt.away_name}</span>
                              <div style={{ display:"flex", gap:3 }}>
                                {mt.btts   && <span style={{ fontFamily:"var(--mono)", fontSize:7, background:"rgba(61,214,140,.1)", border:"1px solid rgba(61,214,140,.2)", borderRadius:2, padding:"1px 3px", color:"var(--green)" }}>BTTS</span>}
                                {mt.over25 && <span style={{ fontFamily:"var(--mono)", fontSize:7, background:"rgba(245,197,66,.1)", border:"1px solid rgba(245,197,66,.2)", borderRadius:2, padding:"1px 3px", color:"var(--yellow)" }}>+2.5</span>}
                              </div>
                              <span style={{ fontFamily:"var(--mono)", fontSize:12, fontWeight:700, color:"var(--yellow)" }}>{mt.home_score}-{mt.away_score}</span>
                            </div>
                          );
                        })
                    }
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "lesiones" ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--blue)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>{m.home_name}</div>
                <InjuryList players={data?.homeInjuries} />
              </div>
              <div>
                <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--yellow)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>{m.away_name}</div>
                <InjuryList players={data?.awayInjuries} />
              </div>
            </div>

          ) : (
            // Córners
            <div>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {[
                  { label:"Córners +8.5", val: s.corners_o85_potential,  color:"var(--blue)"   },
                  { label:"Córners +9.5", val: s.corners_o95_potential,  color:"var(--green)"  },
                  { label:"Córners +10.5",val: s.corners_o105_potential, color:"var(--yellow)" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ flex:1, background:"var(--s2)", border:"1px solid var(--border)", borderRadius:8, padding:"12px", textAlign:"center" }}>
                    <div style={{ fontFamily:"var(--mono)", fontSize:22, fontWeight:700, color }}>{val != null ? `${val}%` : "—"}</div>
                    <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)", textTransform:"uppercase", letterSpacing:".5px", marginTop:4 }}>{label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                {[
                  { label:"Cuota +8.5",  val: s.odds_corners_over_85  },
                  { label:"Cuota +9.5",  val: s.odds_corners_over_95  },
                  { label:"Cuota +10.5", val: s.odds_corners_over_105 },
                  { label:"Cuota +11.5", val: s.odds_corners_over_115 },
                ].map(({ label, val }) => val && (
                  <div key={label} style={{ background:"rgba(245,197,66,.06)", border:"1px solid rgba(245,197,66,.15)", borderRadius:6, padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)" }}>{label}</span>
                    <span style={{ fontFamily:"var(--mono)", fontSize:14, fontWeight:700, color:"var(--yellow)" }}>@{Number(val).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {h2h.avgCorners && (
                <div style={{ background:"var(--s2)", border:"1px solid var(--border)", borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>H2H Córners</div>
                  <div style={{ fontFamily:"var(--mono)", fontSize:13, color:"var(--blue)" }}>
                    Promedio en sus últimos {h2h.total} enfrentamientos: <strong style={{ color:"var(--text)" }}>{h2h.avgCorners} córners</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
