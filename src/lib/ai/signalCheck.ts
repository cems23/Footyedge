import { createServiceClient } from '@/lib/supabase/server'

const MONTHLY_BUDGET_USD = 9
const HAIKU_INPUT_PER_TOKEN = 1 / 1_000_000
const HAIKU_OUTPUT_PER_TOKEN = 5 / 1_000_000

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function checkBudget(supabase: any): Promise<boolean> {
  const month = currentMonthKey()
  const { data } = await supabase.from('ai_signal_budget').select('spent_usd').eq('month', month).maybeSingle()
  const spent = data?.spent_usd ?? 0
  return spent < MONTHLY_BUDGET_USD
}

async function recordSpend(supabase: any, costUsd: number) {
  const month = currentMonthKey()
  const { data } = await supabase.from('ai_signal_budget').select('spent_usd, calls_count').eq('month', month).maybeSingle()
  if (data) {
    await supabase.from('ai_signal_budget').update({
      spent_usd: Number(data.spent_usd) + costUsd,
      calls_count: data.calls_count + 1,
    }).eq('month', month)
  } else {
    await supabase.from('ai_signal_budget').insert({ month, spent_usd: costUsd, calls_count: 1 })
  }
}

type SignalCheckInput = {
  matchId: string
  market: string
  modelProb: number
  homeTeam: string
  awayTeam: string
  formHome: string
  formAway: string
  goalsForHome: number | null
  goalsAgainstHome: number | null
  goalsForAway: number | null
  goalsAgainstAway: number | null
  injuriesHome: string
  injuriesAway: string
  h2hSummary: string
}

export async function runSignalCheck(input: SignalCheckInput): Promise<{ skipped: boolean; reason?: string }> {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('ai_signal_checks')
    .select('id')
    .eq('match_id', input.matchId)
    .eq('market', input.market)
    .maybeSingle()
  if (existing) return { skipped: true, reason: 'already_checked' }

  const withinBudget = await checkBudget(supabase)
  if (!withinBudget) return { skipped: true, reason: 'budget_exceeded' }

  const prompt = `Analiza este partido para el mercado ${input.market} donde el modelo estadistico calculo ${(input.modelProb * 100).toFixed(1)}% de probabilidad.

EQUIPO LOCAL: ${input.homeTeam}
- Ultimos 5 resultados: ${input.formHome}
- Goles a favor/en contra ultimos 5: ${input.goalsForHome ?? '?'}/${input.goalsAgainstHome ?? '?'}
- Lesiones confirmadas: ${input.injuriesHome || 'ninguna reportada'}

EQUIPO VISITANTE: ${input.awayTeam}
- Ultimos 5 resultados: ${input.formAway}
- Goles a favor/en contra ultimos 5: ${input.goalsForAway ?? '?'}/${input.goalsAgainstAway ?? '?'}
- Lesiones confirmadas: ${input.injuriesAway || 'ninguna reportada'}

H2H reciente: ${input.h2hSummary || 'sin datos suficientes'}

Hay algo en estos datos que sugiera que la probabilidad del modelo para ${input.market} es mas o menos confiable de lo normal? Considera: bajas de jugadores clave, forma reciente contradictoria, fatiga por calendario.

Responde SOLO con JSON valido, sin texto adicional, en este formato exacto:
{"adjustment": numero entre -15 y 15, "confidence_penalty": numero entre 0 y 30, "reason": "maximo 20 palabras"}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return { skipped: true, reason: 'api_error' }

    const data = await res.json()
    const usage = data.usage ?? {}
    const costUsd = (usage.input_tokens ?? 0) * HAIKU_INPUT_PER_TOKEN + (usage.output_tokens ?? 0) * HAIKU_OUTPUT_PER_TOKEN

    const text = data.content?.find((c: any) => c.type === 'text')?.text ?? ''
    let parsed: any = null
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    } catch {
      parsed = null
    }

    await recordSpend(supabase, costUsd)

    if (!parsed) return { skipped: true, reason: 'parse_error' }

    await supabase.from('ai_signal_checks').insert({
      match_id: input.matchId,
      market: input.market,
      model_prob: input.modelProb,
      adjustment: Math.max(-15, Math.min(15, Number(parsed.adjustment) || 0)),
      confidence_penalty: Math.max(0, Math.min(30, Number(parsed.confidence_penalty) || 0)),
      reason: String(parsed.reason ?? '').slice(0, 200),
      raw_response: text.slice(0, 500),
    })

    return { skipped: false }
  } catch (e) {
    console.error('signalCheck error (non-fatal):', e)
    return { skipped: true, reason: 'exception' }
  }
}
