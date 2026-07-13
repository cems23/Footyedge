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
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase puede enviar el token en query params o en el hash
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))

    const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash')
    const accessToken = hashParams.get('access_token')
    const type = searchParams.get('type') || hashParams.get('type')

    if (tokenHash) {
      // Nuevo formato Supabase: token_hash en query params
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error }) => {
          if (error) setError("Link inválido o expirado. Solicita un nuevo reset.")
          else setReady(true)
        })
    } else if (accessToken && type === 'recovery') {
      // Formato antiguo: access_token en hash
      supabase.auth.verifyOtp({ token_hash: accessToken, type: 'email' })
        .then(({ error }) => {
          if (error) setError("Link inválido o expirado. Solicita un nuevo reset.")
          else setReady(true)
        })
    } else if (accessToken) {
      // access_token directo — setear sesión manualmente
      const refreshToken = hashParams.get('refresh_token') || ''
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
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
              <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 40px 10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#4a6785", cursor: "pointer", fontSize: 16 }}>{showPass ? "🙈" : "👁"}</button>
            </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Confirmar contraseña</label>
              <div style={{ position: "relative" }}>
              <input type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleReset()}
                style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 40px 10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#4a6785", cursor: "pointer", fontSize: 16 }}>{showConfirm ? "🙈" : "👁"}</button>
            </div>
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
