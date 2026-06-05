-- ============================================================
-- Omni — Migration 023 — Playbook de crecimiento en la estrategia
-- ============================================================
-- Agrega la metodología de adquisición (GTM) de KAVAR al hub de estrategia.
-- Columna playbook (jsonb) en business_strategy + seed del contenido.
-- ============================================================

alter table public.business_strategy
  add column if not exists playbook jsonb not null default '{}'::jsonb;

update public.business_strategy set playbook = '{
  "thesis": "Vendemos high-ticket con Instagram orgánico: los reels traen tráfico frío, las historias nutren y convierten, y los ads solo potencian lo que ya funciona. Sin lanzamientos ni embudos complejos — vendemos exactamente lo que aplicamos.",
  "repair_order": ["Fundacional", "Marketing", "Ventas", "Servicio"],
  "stages": [
    {"n":"01","title":"Fundaciones","tag":"nicho · oferta · precio","points":["Anicharse en una cosa (avatar / vehículo / problema) y descartar el resto. Anicharse es lo que permite escalar.","No hay nichos quemados, hay métodos quemados.","Oferta = un resultado concreto en un tiempo específico, no un servicio ni horas.","Oferta espejo (refleja lo que el cliente quiere) + oferta cebolla (mismo resultado, distintos niveles de acceso).","Una sola oferta a un solo avatar.","Sacrificar precio al inicio: primeros 2-5 casos de éxito baratos (⅓ o menos)."]},
    {"n":"02","title":"Ángulos ganadores","tag":"trazabilidad inversa","points":["Un ángulo ganador es un tema que, cuando lo tocás, trae clientes calificados.","3 categorías: Problemas (~80%), Solución (poco), Producto (mínimo).","Hablarle al cliente sobrecalificado para que llegue el ideal.","Los ángulos no se queman; lo que se quema son los formatos y los ads.","Trazabilidad inversa: juntá clientes/agendas de 90-120 días, mirá qué contenido contestó cada uno → ~10 temas = tus ángulos."]},
    {"n":"03","title":"Contenido — Reels","tag":"fórmula de 4 partes","points":["Los reels traen tráfico frío. Volumen + calidad: ≥4 reels/semana.","No importan las visitas, importan los comentarios y respuestas de gente calificada.","Retención objetivo: ≥40% pasa los 3 seg, ~60% que termina.","Fórmula de 4 partes: Hook que desafía · Valor segmentado · Flores al recurso · CTA."]},
    {"n":"04","title":"Historias","tag":"donde se convierte (90%)","points":["Las historias no traen audiencia nueva: nutren y convierten a quien ya te sigue.","No vender todo el tiempo; vender públicamente una sola vez al mes.","3 tipos: Hand Racer (levantar la mano), Why Now (motivo real para actuar ya), CTA de venta privada.","Tener calendario de historias (el 99% no lo tiene). Métricas: retención 60%, tasa de respuesta ~2-5%."]},
    {"n":"05","title":"Conversación & calificación","tag":"captar · etiquetar · automatizar","points":["Cada pieza de contenido lleva su etiqueta para trazabilidad. Lead scoring A/B/C/D.","Estructura de prospección de 7 pasos: Apertura → Calificación → Dolor → Solución → Pitch call → Calendario → Seguimientos (7-12).","Calificación asistida por IA: lee la respuesta, la interpreta y recategoriza el lead (apoyado en Conversaciones + el agente de Omni).","Para cada dolor típico, 2-3 audios/mensajes pregrabados de ~30 seg."]},
    {"n":"06","title":"Ventas","tag":"cerrá por llamada","points":["Cerrar por llamada, no por chat. El precio va detrás de la conversación, no en el contenido.","Subir el costo de NO sumarse a la llamada (sube el show rate).","Métricas: leads, tasa de agenda, show rate, tasa de calificación, tasa de cierre, AOV."]},
    {"n":"07","title":"Anuncios","tag":"potenciador, no base","points":["Solo se invierte con un ángulo ganador validado.","Los ads potencian el orgánico; nunca son la base.","Follow me ads. El creativo segmenta, no la segmentación de Meta.","Métricas: costo por visita al perfil, hook rate, CTR, frecuencia."]},
    {"n":"08","title":"Servicio & escala","tag":"meterse en el barro","points":["No delegar lo importante, sobre todo marketing/contenido (es tu voz). Delegar solo sistemas ya probados.","Negocio escalable = simple: pocos miembros, baja complejidad, márgenes altos.","Onboarding rápido, time-to-value cuanto antes.","Métricas de salud: reembolsos, NPS, completitud de feedback."]},
    {"n":"09","title":"Reglas mentales","tag":"cómo se piensa","points":["Dar valor gratis hace vender más, no menos.","Lo que se vende es velocidad.","Explicar simple = entender de verdad.","Congruencia total: vendé lo que aplicás."]}
  ],
  "checklist": [
    "Elegí un nicho específico (avatar / vehículo / problema) y descartá el resto.",
    "Armá una oferta espejo: resultado concreto + tiempo + dos precios.",
    "Sin casos: cobrá barato o trabajá con 2-5 personas a cambio del caso.",
    "Listá los problemas/objeciones del cliente sobrecalificado → de ahí salen tus ángulos.",
    "Subí reels de nicho (≥4/semana) con la fórmula hook + valor segmentado + flores al recurso + CTA.",
    "Armá calendario de historias con ciclo mensual (valor todo el mes, Hand Racers, un Why Now, CTA de venta privada).",
    "Montá la conversación: etiquetas por contenido + estructura de 7 pasos + 7-12 seguimientos.",
    "Cerrá por llamada; el precio va detrás de la conversación, nunca en el contenido.",
    "Recién con un ángulo validado, sumá follow me ads (creativo bueno > segmentación).",
    "Cada 90-120 días corré trazabilidad inversa para refinar ángulos y cortar los perdedores."
  ]
}'::jsonb
where singleton = true;
