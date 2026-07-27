'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'

const G = '#00c878'
const MUTE = '#8ba2c0'
const BORDER = '#1a2e4a'

interface Profile {
  elo: number
  attack: number
  defense: number
  btts: number
  over25: number
  form: number
}

const LABELS: Record<string, Record<keyof Profile, string>> = {
  es: {
    elo: 'Elo (percentil)',
    attack: 'Ataque',
    defense: 'Defensa',
    btts: 'BTTS',
    over25: 'Over 2.5',
    form: 'Forma (victorias)',
  },
  en: {
    elo: 'Elo (percentile)',
    attack: 'Attack',
    defense: 'Defense',
    btts: 'BTTS',
    over25: 'Over 2.5',
    form: 'Form (wins)',
  },
}

export default function TeamRadar({ profile, lang = 'es' }: { profile: Profile; lang?: 'es' | 'en' }) {
  const labels = LABELS[lang] ?? LABELS.es
  const data = (Object.keys(labels) as (keyof Profile)[]).map(key => ({
    metric: labels[key],
    value: profile[key],
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke={BORDER} />
        <PolarAngleAxis dataKey="metric" tick={{ fill: MUTE, fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: MUTE, fontSize: 9 }} />
        <Radar dataKey="value" stroke={G} fill={G} fillOpacity={0.35} strokeWidth={2} />
        <Tooltip contentStyle={{ background: '#0d1e35', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white' }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
