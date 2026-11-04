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
  providerData: Record<string, unknown>
  providerFingerprint: string
}

type SignalResult = {
  adjustment: number
  confidencePenalty: number
  reason: string
  context: string
  rejected: boolean
  cached: boolean
}

const neutralResult = (reason: string): SignalResult => ({
  adjustment: 0,
  confidencePenalty: 0,
  reason,
  context: '',
  rejected: false,
  cached: false,
})

function normalizeResult(value: any, cached = false): SignalResult {
  const adjustment = Math.max(-15, Math.min(15, Number(value?.adjustment) || 0))
  const confidencePenalty = Math.max(0, Math.min(30, Number(value?.confidence_penalty) || 0))
  return {
    adjustment,
    confidencePenalty,
    reason: String(value?.reason ?? '').slice(0, 200),
    context: String(value?.context ?? '').slice(0, 1800),
    // Un descarte debe ser excepcional y explicable: una baja o contexto que
    // contradiga fuertemente el mercado, no una simple diferencia de opinión.
    rejected: adjustment <= -12 || confidencePenalty >= 25,
    cached,
  }
}

export async function runSignalCheck(input: SignalCheckInput): Promise<SignalResult> {
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('ai_signal_checks')
    .select('adjustment, confidence_penalty, reason, context, provider_fingerprint')
    .eq('match_id', input.matchId)
    .eq('market', input.market)
    .maybeSingle()
  if (existing?.provider_fingerprint === input.providerFingerprint) {
    return normalizeResult(existing, true)
  }

  const withinBudget = await checkBudget(supabase)
  if (!withinBudget) return existing ? normalizeResult(existing, true) : neutralResult('Presupuesto de IA mensual alcanzado')

  const prompt = `Eres el control de contexto previo a publicar picks de FootyEdge. Analiza este partido para el mercado ${input.market}, donde el modelo estadístico calculó ${(input.modelProb * 100).toFixed(1)}% de probabilidad.

EQUIPO LOCAL: ${input.homeTeam}
- Ultimos 5 resultados: ${input.formHome}
- Goles a favor/en contra ultimos 5: ${input.goalsForHome ?? '?'}/${input.goalsAgainstHome ?? '?'}
- Lesiones confirmadas: ${input.injuriesHome || 'ninguna reportada'}

EQUIPO VISITANTE: ${input.awayTeam}
- Ultimos 5 resultados: ${input.formAway}
- Goles a favor/en contra ultimos 5: ${input.goalsForAway ?? '?'}/${input.goalsAgainstAway ?? '?'}
- Lesiones confirmadas: ${input.injuriesAway || 'ninguna reportada'}

H2H reciente: ${input.h2hSummary || 'sin datos suficientes'}

DATOS DE API-FOOTBALL (solo llama "confirmado" a un bloque cuyo campo *_available sea true; una lista vacía con injuries_available=true significa que API-Football no registró bajas. Si *_available=false, di que ese dato no estaba disponible y no infieras nada):
${JSON.stringify(input.providerData)}

Busca en la web únicamente información actual y específica de este partido: sanciones, comunicaciones oficiales, motivación de tabla, calendario y noticias de alineaciones. Las noticias web son reportes, NO confirmaciones, salvo que citen una fuente oficial. No inventes lesiones, alineaciones ni estadísticas.

¿Hay algo que haga la probabilidad del modelo para ${input.market} menos o más fiable? Considera bajas clave, forma contradictoria, fatiga, contexto de tabla y cambios de once. Un rechazo se reserva para contradicciones fuertes; con incertidumbre normal mantén el pick y penalízalo moderadamente.

Responde SOLO con JSON valido, sin texto adicional, en este formato exacto:
{"adjustment": numero entre -15 y 15, "confidence_penalty": numero entre 0 y 30, "reason": "maximo 20 palabras", "context": "120-180 palabras en español, separando claramente datos confirmados de API-Football y reportes web; explica por qué refuerza o debilita este pick"}`

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
        max_tokens: 450,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
      }),
    })

    if (!res.ok) return existing ? normalizeResult(existing, true) : neutralResult('No se pudo completar la comprobación de contexto')

    const data = await res.json()
    const usage = data.usage ?? {}
    // Anthropic factura la búsqueda web aparte ($10/1.000 búsquedas). Usamos el
    // contador real de la respuesta, no el máximo permitido, para que el tope
    // mensual siga siendo un freno efectivo.
    const webSearches = Number(usage.server_tool_use?.web_search_requests ?? 0)
    const costUsd = (usage.input_tokens ?? 0) * HAIKU_INPUT_PER_TOKEN
      + (usage.output_tokens ?? 0) * HAIKU_OUTPUT_PER_TOKEN
      + webSearches * 0.01

    const text = data.content?.find((c: any) => c.type === 'text')?.text ?? ''
    const sources = (data.content ?? []).flatMap((block: any) => {
      if (block.type !== 'web_search_tool_result' || !Array.isArray(block.content)) return []
      return block.content
        .filter((result: any) => result.type === 'web_search_result' && result.url)
        .map((result: any) => ({ title: String(result.title ?? result.url).slice(0, 180), url: String(result.url).slice(0, 1000) }))
    }).slice(0, 6)
    let parsed: any = null
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    } catch {
      parsed = null
    }

    await recordSpend(supabase, costUsd)

    if (!parsed) return existing ? normalizeResult(existing, true) : neutralResult('Respuesta de contexto no válida')

    const normalized = normalizeResult(parsed)

    const { error: upsertError } = await supabase.from('ai_signal_checks').upsert({
      match_id: input.matchId,
      market: input.market,
      model_prob: input.modelProb,
      adjustment: normalized.adjustment,
      confidence_penalty: normalized.confidencePenalty,
      reason: normalized.reason,
      context: normalized.context,
      raw_response: text.slice(0, 500),
      provider_data: input.providerData,
      provider_fingerprint: input.providerFingerprint,
      sources,
      checked_at: new Date().toISOString(),
    }, { onConflict: 'match_id,market' })
    if (upsertError) {
      console.error('signalCheck persistence error:', upsertError)
      return neutralResult('El contexto no se pudo guardar')
    }

    return normalized
  } catch (e) {
    console.error('signalCheck error (non-fatal):', e)
    return existing ? normalizeResult(existing, true) : neutralResult('No se pudo completar la comprobación de contexto')
  }
}
