"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getLang, getT } from "@/lib/i18n/translations"

export default function ForgotPasswordPage({ params }: { params: { lang: string } }) {
  const lang = getLang(params.lang)
  const t = getT(lang).auth.reset
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleSubmit() {
    setError("")
    if (!email) { setError(lang === "en" ? "Enter your email" : "Ingresa tu email"); return }
    setLoading(true)
    const redirectTo = `${window.location.origin}/${lang}/auth/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0e1829", border: "1px solid #1a2a40", borderRadius: 16, padding: 40, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="FootyEdge" style={{ height: 140, width: "auto", objectFit: "contain", display: "block", margin: "0 auto 8px" }} />
          <p style={{ color: "#6b7fa3", marginTop: 8, fontSize: 14 }}>{t.title}</p>
        </div>

        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <p style={{ color: "white", fontSize: 15 }}>{t.sent}</p>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: "#ff4d4d20", border: "1px solid #ff4d4d40", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ff6b6b", fontSize: 13 }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder={t.emailPlaceholder}
                style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: "100%", background: "#00c878", border: "none", borderRadius: 8, padding: "12px", color: "#070d1a", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? t.sending : t.submit}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
