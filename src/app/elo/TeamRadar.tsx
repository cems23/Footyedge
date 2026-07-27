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

const LABELS: Record<keyof Profile, string> = {
  elo: 'Elo (percentil)',
  attack: 'Ataque',
  defense: 'Defensa',
  btts: 'BTTS',
  over25: 'Over 2.5',
  form: 'Forma (victorias)',
}

export default function TeamRadar({ profile }: { profile: Profile }) {
  const data = (Object.keys(LABELS) as (keyof Profile)[]).map(key => ({
    metric: LABELS[key],
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
