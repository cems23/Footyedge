import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getFootyStatsToday, findFootyStatsMatch } from '@/lib/api/footystats'
import { apf } from '@/lib/api/football'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function confirmedProviderContext(input: {
  injuries: any[]
  lineups: any[]
  homeTeamId: number
  awayTeamId: number
  homeTeamName: string
  awayTeamName: string
  lang: 'es' | 'en'
}) {
  const { injuries, lineups, homeTeamId, awayTeamId, homeTeamName, awayTeamName, lang } = input
  const formatAbsences = (teamId: number, teamName: string) => {
    const unique = new Map<string, { name: string; reason: string }>()
    for (const injury of injuries.filter((item) => item.team?.id === teamId)) {
      const name = injury.player?.name
      if (!name) continue
      const key = String(injury.player?.id ?? name)
      if (!unique.has(key)) unique.set(key, { name, reason: injury.player?.reason || injury.player?.type || '' })
    }
    const entries = Array.from(unique.values())
    if (!entries.length) {
      return lang === 'en'
        ? `${teamName}: API-Football returned no absence records for this fixture.`
        : `${teamName}: API-Football no devolvió bajas registradas para este partido.`
    }
    const detail = entries.map(({ name, reason }) => `${name}${reason ? ` (${reason})` : ''}`).join(', ')
    return `${teamName}: ${detail}.`
  }

  const formatLineup = (teamId: number, teamName: string) => {
    const lineup = lineups.find((item) => item.team?.id === teamId)
    if (!lineup?.startXI?.length) {
      return lang === 'en'
        ? `${teamName}: confirmed lineup is not published yet.`
        : `${teamName}: la alineación confirmada aún no está publicada.`
    }
    const players = lineup.startXI.slice(0, 11).map((item: any) => item.player?.name).filter(Boolean).join(', ')
    return lang === 'en'
      ? `${teamName}: confirmed lineup${lineup.formation ? ` (${lineup.formation})` : ''}: ${players}.`
      : `${teamName}: alineación confirmada${lineup.formation ? ` (${lineup.formation})` : ''}: ${players}.`
  }

  return [
    lang === 'en'
      ? 'CONFIRMED API-FOOTBALL DATA (retrieved for this request):'
      : 'DATOS CONFIRMADOS DE API-FOOTBALL (consultados en esta solicitud):',
    lang === 'en' ? 'Absences:' : 'Bajas:',
    formatAbsences(homeTeamId, homeTeamName),
    formatAbsences(awayTeamId, awayTeamName),
    lang === 'en' ? 'Lineups:' : 'Alineaciones:',
    formatLineup(homeTeamId, homeTeamName),
    formatLineup(awayTeamId, awayTeamName),
  ].join('\n')
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'es'

  const supabaseAdmin = createServiceClient()

  const { data: record } = await supabaseAdmin
    .from('ai_analyses')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!record || record.status === 'pending') {
    return NextResponse.json({ error: 'No pagado', paid: false }, { status: 402 })
  }

  if (record.status === 'generated' && record.content) {
    return NextResponse.json({ content: record.content, cached: true })
  }

  if (record.status === 'generating' && record.generation_started_at) {
    const secondsSinceStart = (Date.now() - new Date(record.generation_started_at).getTime()) / 1000
    if (secondsSinceStart < 90) {
      return NextResponse.json({ generating: true }, { status: 202 })
    }
  }

  await supabaseAdmin.from('ai_analyses').update({
    status: 'generating',
    generation_started_at: new Date().toISOString(),
  }).eq('id', record.id)

  const { data: match } = await supabaseAdmin
    .from('matches')
    .select(`
      home_team_name, away_team_name, home_team_id, away_team_id, external_id,
      league_name, league_id, kickoff_at,
      model_predictions (
        expected_goals_home, expected_goals_away,
        prob_home_win, prob_draw, prob_away_win,
        prob_over25, prob_btts
      )
    `)
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })

  const pred = Array.isArray(match.model_predictions) ? match.model_predictions[0] : match.model_predictions

  // La búsqueda web complementa, pero nunca sustituye, la información del
  // proveedor. Estas dos llamadas solo se hacen cuando el usuario eligió abrir
  // el contexto IA para un partido desbloqueado; no se consumen durante el scan
  // diario ni mientras se busca un equipo en el dashboard.
  let providerContext = lang === 'en'
    ? 'CONFIRMED API-FOOTBALL DATA: unavailable for this request. Do not infer absences or a lineup from its absence.'
    : 'DATOS CONFIRMADOS DE API-FOOTBALL: no disponibles para esta solicitud. No infieras bajas ni alineaciones por su ausencia.'
  try {
    const [injuries, lineups] = await Promise.all([
      apf<any[]>('/injuries', { fixture: match.external_id }),
      apf<any[]>('/fixtures/lineups', { fixture: match.external_id }),
    ])
    providerContext = confirmedProviderContext({
      injuries: injuries ?? [], lineups: lineups ?? [],
      homeTeamId: match.home_team_id, awayTeamId: match.away_team_id,
      homeTeamName: match.home_team_name, awayTeamName: match.away_team_name, lang,
    })
  } catch {
    // El análisis puede seguir usando el modelo y la web, pero el prompt obliga
    // a no presentar como confirmado lo que no pudo verificar el proveedor.
  }

  const favored = pred
    ? (pred.prob_home_win > pred.prob_away_win ? match.home_team_name : match.away_team_name)
    : null

  // Datos de córners de FootyStats para este partido específico, si están disponibles
  let cornersLine = ''
  try {
    const fsMatches = await getFootyStatsToday()
    const fs = findFootyStatsMatch(fsMatches, match.home_team_name, match.away_team_name)
    if (fs?.corners_potential) {
      cornersLine = lang === 'en'
        ? `\nCorner data (FootyStats): expected corners ${fs.corners_potential}.`
        : `\nDatos de córners (FootyStats): córners esperados ${fs.corners_potential}.`
    }
  } catch {
    // si falla FootyStats, seguimos sin ese dato — no bloquea el análisis
  }

  const statsContext = pred
    ? (lang === 'en'
        ? `Model numbers (for you to REASON about, not just repeat): home win ${(pred.prob_home_win * 100).toFixed(0)}%, draw ${(pred.prob_draw * 100).toFixed(0)}%, away win ${(pred.prob_away_win * 100).toFixed(0)}%, Over 2.5 ${(pred.prob_over25 * 100).toFixed(0)}%, BTTS ${(pred.prob_btts * 100).toFixed(0)}%, expected goals ${pred.expected_goals_home?.toFixed(2)} vs ${pred.expected_goals_away?.toFixed(2)}.${cornersLine}`
        : `Números del modelo (para que RAZONES sobre ellos, no solo los repitas): victoria local ${(pred.prob_home_win * 100).toFixed(0)}%, empate ${(pred.prob_draw * 100).toFixed(0)}%, victoria visitante ${(pred.prob_away_win * 100).toFixed(0)}%, Over 2.5 ${(pred.prob_over25 * 100).toFixed(0)}%, BTTS ${(pred.prob_btts * 100).toFixed(0)}%, goles esperados ${pred.expected_goals_home?.toFixed(2)} vs ${pred.expected_goals_away?.toFixed(2)}.${cornersLine}`)
    : ''

  const prompt = lang === 'en'
    ? `You are a senior football analyst for FootyEdge, a betting analytics platform using a Poisson + Dixon-Coles statistical model.

MATCH: ${match.home_team_name} vs ${match.away_team_name}
COMPETITION: ${match.league_name}
DATE: ${match.kickoff_at}
${favored ? `The statistical model favors: ${favored}` : ''}
${statsContext}
${providerContext}

Search the web for CURRENT news specific to this match: suspensions, expected lineup changes, table context/motivation, recent form of both teams and head-to-head trends. Treat the API-Football block above as the only source for confirmed injuries and confirmed lineups. Web findings must be described as reports or expectations unless they independently cite an official confirmation. The probability numbers above are already shown to the user in a separate grid — your job is to EXPLAIN and REASON about what's driving them (attacking form, defensive weaknesses, home advantage, tactical matchup), not just restate them, and to layer in the qualitative context the model can't see.

Write in English, 220-320 words, using this exact markdown structure:
## Context
(1-2 sentences: table situation, motivation, narrative stakes)
## What the Numbers Say
(2-3 sentences reasoning through WHY the model leans this way — reference the actual attacking/defensive form, goal expectation gap, and corner data if provided — in plain language, not just repeating percentages)
## Key Factors
(3-5 short bullet points: confirmed injuries, suspensions, notable absences, lineup news — be specific with player names when found)
## Verdict
(2-3 sentences: take a CLEAR position. Say whether the qualitative context reinforces or weakens the model's lean, and be specific about which markets look strongest given everything above. Avoid vague hedging like "could go either way" — commit to a read while being honest this isn't a guarantee.)

Use **bold** (double asterisks) for player names and key terms — never single asterisks for italics. Be concise but substantive — every sentence must add real information. Stay strictly within the 220-320 word count.`
    : `Eres un analista de fútbol senior para FootyEdge, una plataforma de analítica de apuestas basada en un modelo estadístico Poisson + Dixon-Coles.

PARTIDO: ${match.home_team_name} vs ${match.away_team_name}
COMPETICIÓN: ${match.league_name}
FECHA: ${match.kickoff_at}
${favored ? `El modelo estadístico favorece a: ${favored}` : ''}
${statsContext}
${providerContext}

Busca en la web noticias ACTUALES específicas de este partido: sanciones, cambios de alineación esperados, contexto de tabla/motivación, forma reciente de ambos equipos y tendencias del historial. Trata el bloque de API-Football de arriba como la única fuente de lesiones y alineaciones confirmadas. Todo hallazgo web debe describirse como reporte o expectativa, salvo que cite una confirmación oficial independiente. Los números de probabilidad de arriba ya se le muestran al usuario en una cuadrícula aparte — tu trabajo es EXPLICAR y RAZONAR qué los está impulsando (forma ofensiva, debilidades defensivas, ventaja de local, el enfrentamiento táctico), no solo repetirlos, y sumar el contexto cualitativo que el modelo no puede ver.

Escribe en español, 220-320 palabras, usando exactamente esta estructura markdown:
## Contexto
(1-2 frases: situación en la tabla, motivación, contexto narrativo)
## Qué Dicen Los Números
(2-3 frases razonando POR QUÉ el modelo se inclina así — referencia la forma ofensiva/defensiva real, la brecha de goles esperados, y el dato de córners si se dio — en lenguaje llano, no solo repitiendo porcentajes)
## Factores Clave
(3-5 viñetas cortas: lesiones confirmadas, sanciones, bajas notables, noticias de alineación — sé específico con nombres de jugadores si los encuentras)
## Veredicto
(2-3 frases: toma una posición CLARA. Di si el contexto cualitativo refuerza o debilita la inclinación del modelo, y sé específico sobre qué mercados se ven más fuertes dado todo lo anterior. Evita ambigüedad vaga tipo "podría ir para cualquier lado" — comprométete con una lectura siendo honesto de que esto no es una garantía.)

Usa **negrita** (doble asterisco) para nombres de jugadores y términos clave — nunca asterisco simple para cursiva. Sé conciso pero sustancioso — cada frase debe aportar información real. Respeta estrictamente el límite de 220-320 palabras.`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1400,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      await supabaseAdmin.from('ai_analyses').update({ status: 'failed' }).eq('id', record.id)
      return NextResponse.json({ error: 'Error generando análisis', detail: errText }, { status: 500 })
    }

    const data = await aiRes.json()
    const textBlocks = (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text)
    const content = textBlocks.join('\n\n')

    await supabaseAdmin.from('ai_analyses').update({
      status: 'generated',
      content,
      generated_at: new Date().toISOString(),
    }).eq('id', record.id)

    return NextResponse.json({ content, cached: false })
  } catch (err: any) {
    await supabaseAdmin.from('ai_analyses').update({ status: 'failed' }).eq('id', record.id)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
