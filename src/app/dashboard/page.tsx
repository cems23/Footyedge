"use client"
import { useEffect, useState } from "react"
import DashboardClient from "@/components/dashboard/DashboardClient"

export default function DashboardPage() {
  const [data, setData] = useState({
    rankings: [],
    picks: [],
    allMatches: [],
    btts: [],
    over15: [],
    over25: [],
    corners: [],
    firsthalf: [],
    doublechance: [],
    performance: null,
    user: { plan: "free", picks_today: 0, bankroll: 100 },
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
        corners: d.corners ?? [],
        firsthalf: d.firsthalf ?? [],
        doublechance: d.doublechance ?? [],
      })))
      .catch(console.error)

    fetch("/api/analytics")
      .then(r => r.json())
      .then(d => setData(prev => ({ ...prev, performance: d.metrics ?? null })))
      .catch(console.error)

    fetch("/api/analytics/model")
      .then(r => r.json())
      .then(d => setData(prev => ({ ...prev, modelPerformance: d.metrics ?? null })))
      .catch(console.error)

    fetch("/api/picks")
      .then(r => r.json())
      .then(d => setData(prev => ({ ...prev, picks: d.picks ?? [], user: d.user ?? prev.user })))
      .catch(console.error)
  }, [])

  return <DashboardClient {...data} />
}
