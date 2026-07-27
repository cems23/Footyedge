'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const BORDER = '#1a2e4a'
const G = '#00c878'
const MUTE = '#8ba2c0'

export default function EloChart({ data }: { data: { date: string; elo: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
        <XAxis dataKey="date" stroke={MUTE} fontSize={11} />
        <YAxis stroke={MUTE} fontSize={11} domain={['dataMin - 20', 'dataMax + 20']} />
        <Tooltip contentStyle={{ background: '#0d1e35', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'white' }} />
        <Line type="monotone" dataKey="elo" stroke={G} strokeWidth={2} dot={{ fill: G, r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
