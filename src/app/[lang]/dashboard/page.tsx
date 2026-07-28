"use client"
import { useEffect, useState } from "react"
import DashboardClient from "@/components/dashboard/DashboardClient"

export default function DashboardPage({ params }: { params: { lang: string } }) {
  const lang = params.lang || 'es'
  const [data, setData] = useState({
    rankings: [],
    picks: [],
    allMatches: [],
    btts: [],
    over15: [],
    over25: [],
    performance: null,
    user: { plan: "free", picks_today: 0 },
    today: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetch("/api/matches/today")
      .then(r => r.json())
      .then(d => setData(prev => ({ ...prev, rankings: d.rankings ?? [] })))
      .catch(console.error)

    fetch("/api/matches/all-today")
      .then(r => r.json())
      .then(d => setData(prev => ({
        ...prev,
        allMatches: d.matches ?? [],
        btts: d.btts ?? [],
        over15: d.over15 ?? [],
        over25: d.over25 ?? [],
      })))
      .catch(console.error)

    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => setData(prev => ({ ...prev, performance: d.metrics ?? null })))
      .catch(console.error)

    fetch("/api/picks")
      .then(r => r.json())
      .then(d => setData(prev => ({ ...prev, picks: d.picks ?? [], user: d.user ?? prev.user })))
      .catch(console.error)
  }, [])

  return <DashboardClient {...data} lang={lang} />
}
