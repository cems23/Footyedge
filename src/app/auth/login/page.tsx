"use client"
import { useState } from "react"
import AnimatedBackground from "@/components/AnimatedBackground"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LoginPage() {
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
    else router.push('/es/dashboard')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <AnimatedBackground />
      <div style={{ position: "relative", zIndex: 1, background: "#0e1829", border: "1px solid #1a2a40", borderRadius: 16, padding: 40, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="FootyEdge" style={{ height: 140, width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
          <p style={{ color: "#6b7fa3", marginTop: 8, fontSize: 14 }}>Inicia sesión en tu cuenta</p>
        </div>

        {error && (
          <div style={{ background: "#ff4d4d20", border: "1px solid #ff4d4d40", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#ff6b6b", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: "#6b7fa3", fontSize: 12, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", background: "#070d1a", border: "1px solid #1a2a40", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", background: "#00c878", border: "none", borderRadius: 8, padding: "12px", color: "#070d1a", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Iniciando..." : "Iniciar Sesión"}
        </button>

        <p style={{ textAlign: "center", marginTop: 20, color: "#6b7fa3", fontSize: 13 }}>
          ¿No tienes cuenta?{" "}
          <a href="/auth/register" style={{ color: "#00c878", textDecoration: "none" }}>Regístrate</a>
        </p>
      </div>
    </div>
  )
}
