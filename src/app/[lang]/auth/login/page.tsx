"use client"
import { useState } from "react"
import AnimatedBackground from "@/components/AnimatedBackground"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { getLang, getT } from "@/lib/i18n/translations"

export default function LoginPage({ params }: { params: { lang: string } }) {
  const lang = getLang(params.lang)
  const t = getT(lang).auth.login
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push(`/${lang}/dashboard`)
    setLoading(false)
  }


  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }
  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <AnimatedBackground />
      <div style={{ position: "relative", zIndex: 1, background: "#0e1829", border: "1px solid #1a2a40", borderRadius: 16, padding: 40, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="FootyEdge" style={{ height: 140, width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
          <p style={{ color: "#6b7fa3", marginTop: 8, fontSize: 14 }}>{t.subtitle}</p>
        </div>

        {error && (
          <div style={{ background: "#ff4d4d20", border: "1px solid #ff4d4d40", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ff6b6b", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{t.email}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
            style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{t.password}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{ width: "100%", background: "#00c878", border: "none", borderRadius: 8, padding: "12px", color: "#070d1a", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? (lang === 'es' ? 'Entrando...' : 'Signing in...') : t.submit}
        </button>
        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#1a2a40' }} />
          <span style={{ color: '#4a6785', fontSize: 12 }}>{lang === 'en' ? 'or' : 'o'}</span>
          <div style={{ flex: 1, height: 1, background: '#1a2a40' }} />
        </div>

        {/* Google button */}
        <button onClick={handleGoogle}
          style={{ width: '100%', background: 'transparent', border: '1px solid #1a2a40', borderRadius: 8, padding: '11px', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {lang === 'en' ? 'Continue with Google' : 'Continuar con Google'}
        </button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
          <a href={`/${lang}/auth/reset-password`} style={{ color: "#4a6785", textDecoration: "none" }}>{t.forgot}</a>
        </p>

        <p style={{ textAlign: "center", marginTop: 12, color: "#6b7fa3", fontSize: 13 }}>
          {t.noAccount}{" "}
          <a href={`/${lang}/auth/register`} style={{ color: "#00c878", textDecoration: "none" }}>{t.register}</a>
        </p>
      </div>
    </div>
  )
}
