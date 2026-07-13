import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FootyEdge 2.0 — Value Betting Engine',
  description: 'Detección de apuestas EV+ con modelo Poisson híbrido',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-bg text-white antialiased">{children}</body>
    </html>
  )
}
