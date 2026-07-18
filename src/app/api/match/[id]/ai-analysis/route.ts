import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const prompt = `Eres un analista experto de fútbol para FootyEdge, una plataforma de analítica de apuestas basada en modelos estadísticos (Poisson + Dixon-Coles).

PARTIDO: ${match.home_team_name} vs ${match.away_team_name}
LIGA: ${match.league_name}
FECHA: ${match.kickoff_at}

PROBABILIDADES DEL MODELO ESTADÍSTICO:
- Victoria local: ${pred ? (pred.prob_home_win * 100).toFixed(1) : '?'}%
- Empate: ${pred ? (pred.prob_draw * 100).toFixed(1) : '?'}%
- Victoria visitante: ${pred ? (pred.prob_away_win * 100).toFixed(1) : '?'}%
- Over 2.5 goles: ${pred ? (pred.prob_over25 * 100).toFixed(1) : '?'}%
- Ambos anotan (BTTS): ${pred ? (pred.prob_btts * 100).toFixed(1) : '?'}%
- Goles esperados: ${pred?.expected_goals_home?.toFixed(2) ?? '?'} - ${pred?.expected_goals_away?.toFixed(2) ?? '?'}

Busca en la web noticias recientes y relevantes sobre este partido: lesiones, sanciones, rotaciones esperadas, contexto de tabla/motivación, racha reciente de ambos equipos, y cualquier factor cualitativo que el modelo estadístico no pueda capturar.

Escribe un análisis profundo en español (250-350 palabras) que:
1. Explique en lenguaje claro qué está viendo el modelo estadístico y por qué
2. Añada el contexto cualitativo que encuentres (lesiones, forma, motivación)
3. Señale si ese contexto refuerza o contradice lo que dice el modelo
4. Sea honesto: no es una predicción garantizada, es análisis para ayudar a decidir

No uses encabezados ni listas — texto corrido, tono profesional pero directo.`

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
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
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
