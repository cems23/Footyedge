"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))
    const token = params.get('access_token')
    const type = params.get('type')

    if (token && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: token, type: 'email' })
        .then(({ error }) => {
          if (error) setError("Link inválido o expirado. Solicita un nuevo reset.")
          else setReady(true)
        })
    } else {
      setError("Link inválido. Solicita un nuevo reset.")
    }
  }, [])

  async function handleReset() {
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return }
    if (password.length < 6) { setError("Mínimo 6 caracteres"); return }
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
        <h2 style={{ color: "white" }}>Contraseña actualizada</h2>
        <button onClick={() => router.push("/dashboard")}
          style={{ marginTop: 20, background: "#00c878", border: "none", borderRadius: 8, padding: "10px 24px", color: "#070d1a", fontWeight: 700, cursor: "pointer" }}>
          Ir al dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0e1829", border: "1px solid #1a2a40", borderRadius: 16, padding: 40, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="FootyEdge" style={{ height: 140, width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
          <p style={{ color: "#6b7fa3", marginTop: 8, fontSize: 14 }}>Nueva contraseña</p>
        </div>
        {error && (
          <div style={{ background: "#ff4d4d20", border: "1px solid #ff4d4d40", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ff6b6b", fontSize: 13 }}>
            {error}
          </div>
        )}
        {!ready && !error && <p style={{ color: "#6b7fa3", textAlign: "center" }}>Verificando...</p>}
        {ready && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Nueva contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleReset()}
                style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={handleReset} disabled={loading}
              style={{ width: "100%", background: "#00c878", border: "none", borderRadius: 8, padding: "12px", color: "#070d1a", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Guardando..." : "Cambiar Contraseña"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
