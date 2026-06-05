import { ImageResponse } from "next/og"

export const alt = "Omni — Tu propio sistema operativo de negocio, con IA que te aconseja"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#080808",
          backgroundImage: "radial-gradient(60% 50% at 50% 0%, rgba(34,197,94,0.22), transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#22c55e",
              color: "#080808",
              fontSize: 38,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            O
          </div>
          <div style={{ fontSize: 34, color: "#fff", fontFamily: "Georgia, serif" }}>Omni</div>
        </div>
        <div style={{ fontSize: 60, color: "#fff", lineHeight: 1.1, fontFamily: "Georgia, serif", maxWidth: 1000 }}>
          No es otro dashboard. Es tu propio sistema operativo —
          <span style={{ color: "#22c55e" }}> con IA que te aconseja.</span>
        </div>
        <div style={{ fontSize: 26, color: "#a1a1aa", marginTop: 28, maxWidth: 900 }}>
          Clientes, leads, métricas, contenido y redes en un solo lugar. Tu marca, tu dominio, tu instancia.
        </div>
      </div>
    ),
    { ...size },
  )
}
