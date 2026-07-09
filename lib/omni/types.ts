// Shapes compartidos entre los distintos análisis de Omni, portados del
// piloto original — se reusan en la UI (FindingsSection, etc.) para no
// duplicar componentes por tipo de análisis.

export interface SlackFinding {
  titulo: string
  descripcion: string
  canales: string[]
  evidencia: string
  severidad: "alta" | "media" | "baja"
}

export interface ProspectRisk {
  prospecto: string
  estado: "en_riesgo" | "irremontable"
  situacion: string
  principio: string
  evidencia: string
  accion: string
  severidad: "alta" | "media" | "baja"
}
