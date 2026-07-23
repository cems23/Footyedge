import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

  // Ya generado antes — devolver cache, no volver a llamar a la IA
  if (record.status === 'generated' && record.content) {
    return NextResponse.json({ content: record.content, cached: true })
  }

  // Pagado pero aún no generado — generar ahora
  const { data: match } = await supabaseAdmin
    .from('matches')
    .select(`
      home_team_name, away_team_name, league_name, league_id, kickoff_at,
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

  // Las probabilidades del modelo se muestran en una cuadrícula aparte en el frontend
  // (sin costo de IA) — el prompt solo pide contexto cualitativo, no que repita números.
  // Esto reduce tokens de salida y por tanto el costo por análisis.
  const favored = pred
    ? (pred.prob_home_win > pred.prob_away_win ? match.home_team_name : match.away_team_name)
    : null

  const prompt = lang === 'en'
    ? `You are a football analyst for FootyEdge, a betting analytics platform using a Poisson + Dixon-Coles statistical model.

MATCH: ${match.home_team_name} vs ${match.away_team_name}
COMPETITION: ${match.league_name}
DATE: ${match.kickoff_at}
${favored ? `The statistical model favors: ${favored}` : ''}

Search the web for CURRENT news specific to this match: confirmed injuries/suspensions, expected lineup changes, table context/motivation, recent form of both teams. Do NOT restate the model's probabilities or expected goals — those are already shown separately. Focus only on qualitative context the model can't see.

Write in English, 150-220 words, using this exact markdown structure:
## Context
(1-2 sentences: table situation, motivation, narrative stakes)
## Key Factors
(3-5 short bullet points: confirmed injuries, suspensions, notable absences, lineup news — be specific with player names when found)
## Verdict
(2-3 sentences: does this context reinforce or contradict the model's lean? Be honest — this is analysis to inform a decision, not a guaranteed prediction.)

Use **bold** (double asterisks) for player names and key terms — never single asterisks for italics. Be concise — every sentence must add real information. Stay strictly within the 150-220 word count.`
    : `Eres un analista de fútbol para FootyEdge, una plataforma de analítica de apuestas basada en un modelo estadístico Poisson + Dixon-Coles.

PARTIDO: ${match.home_team_name} vs ${match.away_team_name}
COMPETICIÓN: ${match.league_name}
FECHA: ${match.kickoff_at}
${favored ? `El modelo estadístico favorece a: ${favored}` : ''}

Busca en la web noticias ACTUALES específicas de este partido: lesiones/sanciones confirmadas, cambios de alineación esperados, contexto de tabla/motivación, forma reciente de ambos equipos. NO repitas las probabilidades ni los goles esperados del modelo — ya se muestran aparte. Enfócate solo en el contexto cualitativo que el modelo no puede ver.

Escribe en español, 150-220 palabras, usando exactamente esta estructura markdown:
## Contexto
(1-2 frases: situación en la tabla, motivación, contexto narrativo)
## Factores Clave
(3-5 viñetas cortas: lesiones confirmadas, sanciones, bajas notables, noticias de alineación — sé específico con nombres de jugadores si los encuentras)
## Veredicto
(2-3 frases: ¿este contexto refuerza o contradice la inclinación del modelo? Sé honesto — esto es análisis para informar una decisión, no una predicción garantizada.)

Usa **negrita** (doble asterisco) para nombres de jugadores y términos clave — nunca asterisco simple para cursiva. Sé conciso — cada frase debe aportar información real. Respeta estrictamente el límite de 150-220 palabras.`

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
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
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
