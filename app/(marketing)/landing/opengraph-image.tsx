import { ImageResponse } from "next/og"

export const alt = "Omni — El sistema operativo de todo tu negocio"
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
          background: "#050706",
          backgroundImage: "radial-gradient(60% 50% at 50% 0%, rgba(68,240,140,0.22), transparent)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#44f08c",
              color: "#04150b",
              fontSize: 38,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            O
          </div>
          <div style={{ fontSize: 34, color: "#eaf2ec", fontFamily: "Georgia, serif" }}>Omni</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 62, lineHeight: 1.05, fontFamily: "Georgia, serif", maxWidth: 1000 }}>
          <div style={{ color: "#eaf2ec" }}>El sistema operativo de</div>
          <div style={{ color: "#44f08c" }}>todo tu negocio.</div>
        </div>
        <div style={{ fontSize: 26, color: "#9aa39d", marginTop: 28, maxWidth: 940 }}>
          Clientes, conversaciones, equipo, tareas, métricas y automatizaciones en un solo lugar —y una IA que te dice qué hacer.
        </div>
      </div>
    ),
    { ...size },
  )
}
