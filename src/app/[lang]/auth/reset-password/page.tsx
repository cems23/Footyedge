"use client"
import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { getLang, getT } from "@/lib/i18n/translations"

function ResetPasswordInner({ lang }: { lang: "es" | "en" }) {
  const t = getT(lang).auth.reset
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error }) => {
          if (error) setError(t.expiredLink)
          else setReady(true)
        })
      return
    }

    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const hashType = hashParams.get('type')

    if (accessToken && refreshToken && hashType === 'recovery') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) setError(t.expiredLink)
          else setReady(true)
        })
    } else {
      setError(t.invalidLink)
    }
  }, [])

  async function handleReset() {
    if (password !== confirm) { setError(t.noMatch); return }
    if (password.length < 6) { setError(t.minChars); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  if (success) return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0e1829", border: "1px solid #00c87840", borderRadius: 16, padding: 40, width: 380, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: "white" }}>{t.updated}</h2>
        <button onClick={() => router.push(`/${lang}/dashboard`)}
          style={{ marginTop: 20, background: "#00c878", border: "none", borderRadius: 8, padding: "10px 24px", color: "#070d1a", fontWeight: 700, cursor: "pointer" }}>
          {t.goDashboard}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0e1829", border: "1px solid #1a2a40", borderRadius: 16, padding: 40, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="FootyEdge" style={{ height: 140, width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
          <p style={{ color: "#6b7fa3", marginTop: 8, fontSize: 14 }}>{t.newTitle}</p>
        </div>
        {error && (
          <div style={{ background: "#ff4d4d20", border: "1px solid #ff4d4d40", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ff6b6b", fontSize: 13 }}>
            {error}
          </div>
        )}
        {!ready && !error && <p style={{ color: "#6b7fa3", textAlign: "center" }}>{t.verifying}</p>}
        {ready && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{t.newPassword}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{t.confirmPassword}</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleReset()}
                style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleReset} disabled={loading}
              style={{ width: "100%", background: "#00c878", border: "none", borderRadius: 8, padding: "12px", color: "#070d1a", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? t.saving : t.changePassword}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage({ params }: { params: { lang: string } }) {
  const lang = getLang(params.lang)
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7fa3" }}>...</p>
      </div>
    }>
      <ResetPasswordInner lang={lang} />
    </Suspense>
  )
}
