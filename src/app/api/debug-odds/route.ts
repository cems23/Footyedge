import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const today = new Date().toISOString().split('T')[0]
  const key = process.env.API_FOOTBALL_KEY
  
  const url = `https://v3.football.api-sports.io/odds?league=140&season=2025&bookmaker=8&date=${today}`
  const res = await fetch(url, { headers: { 'x-apisports-key': key! }, cache: 'no-store' })
  const data = await res.json()
  
  return NextResponse.json({
    today,
    status: res.status,
    total: data.response?.length ?? 0,
    errors: data.errors,
    sample: data.response?.[0]?.fixture ?? null
  })
}
