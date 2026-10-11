import "../legal.css"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Política de Privacidad — Nova Softwares",
  description: "Qué datos recopila Nova Softwares, con qué finalidad los usa, cuánto los conserva y cómo revocar el acceso.",
}

export default function PrivacidadPage() {
  return (
    <div className="legal">
      <div className="wrap">
        <header>
          <p className="eyebrow">Documento legal</p>
          <h1>Política de Privacidad</h1>
          <p className="meta">Última actualización: 11 de octubre de 2026 · Nova Softwares</p>
        </header>

        <p>Esta política explica qué datos recopila Nova Softwares (en adelante, «la Plataforma»), con qué finalidad los usa, cuánto tiempo los conserva y cómo podés revocar el acceso en cualquier momento.</p>

        <p><strong>Nova Softwares</strong> es una plataforma operada por <strong>Juan Pablo Acosta Caminos</strong>, con domicilio en 25 de Mayo 60, Piso 2 Depto D, Junín, Provincia de Buenos Aires (CP 6000), Argentina.</p>

        <h2><span className="num">01</span> Qué datos recopilamos</h2>

        <h3>Datos de tu cuenta</h3>
        <p>Cuando creás una cuenta, guardamos tu dirección de correo electrónico, tu nombre y la información necesaria para autenticarte.</p>

        <h3>Datos de YouTube</h3>
        <p>Si conectás tu canal de YouTube, accedemos únicamente en modo de solo lectura, mediante la YouTube Data API y la YouTube Analytics API, a:</p>
        <ul>
          <li>El nombre, identificador y foto de perfil de tu canal.</li>
          <li>La lista de videos publicados y sus metadatos (título, descripción, fecha).</li>
          <li>Métricas de rendimiento de YouTube Analytics sobre tu propio canal: visualizaciones, suscriptores ganados y perdidos, tiempo de reproducción, duración media de visualización y retención de audiencia.</li>
        </ul>
        <p>No publicamos, editamos ni eliminamos contenido en tu canal. No accedemos a videos privados salvo que aparezcan dentro del alcance que vos autorizaste.</p>

        <h3>Datos de Instagram</h3>
        <p>Si conectás una cuenta profesional de Instagram, accedemos a:</p>
        <ul>
          <li>El nombre de usuario, identificador y foto de perfil de la cuenta.</li>
          <li>Las conversaciones de mensajería directa que recibe la cuenta, para poder mostrarlas y responderlas desde la Plataforma.</li>
          <li>Métricas de publicaciones y de la cuenta.</li>
        </ul>

        <h3>Datos técnicos</h3>
        <p>Registramos dirección IP, tipo de navegador y marcas de tiempo de acceso, con fines de seguridad y diagnóstico.</p>

        <h2><span className="num">02</span> Para qué usamos los datos</h2>
        <p>Usamos la información exclusivamente para prestar el servicio que contrataste:</p>
        <ul>
          <li>Mostrar tus métricas y conversaciones en un panel unificado.</li>
          <li>Permitirte responder mensajes desde la Plataforma.</li>
          <li>Generar reportes de rendimiento sobre tus propias cuentas.</li>
          <li>Mostrarte cómo rinde tu contenido de YouTube para que puedas mejorarlo.</li>
          <li>Mantener la seguridad del servicio y prevenir usos indebidos.</li>
        </ul>

        <div className="callout">
          <p><strong>No vendemos tus datos.</strong> No los compartimos con anunciantes, no los usamos para entrenar modelos de inteligencia artificial ni para publicidad dirigida, y no los transferimos a terceros salvo en los casos descriptos en la sección 4.</p>
        </div>

        <h2><span className="num">03</span> Uso de los Servicios de la API de YouTube</h2>
        <p>La Plataforma utiliza la YouTube Data API y la YouTube Analytics API, ambas en modo de solo lectura.</p>
        <p>La Plataforma utiliza los Servicios de la API de YouTube. Al conectar tu canal, aceptás quedar vinculado por los <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">Términos de Servicio de YouTube</a>.</p>
        <p>El tratamiento que Google da a tu información se rige por la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Política de Privacidad de Google</a>.</p>
        <p>Podés revocar el acceso de la Plataforma a tus datos de Google en cualquier momento desde la <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">página de permisos de seguridad de tu Cuenta de Google</a>. Al revocarlo, dejamos de acceder a tus datos de YouTube de inmediato y eliminamos la información almacenada dentro de los 30 días.</p>

        <h2><span className="num">04</span> Con quién compartimos información</h2>
        <p>Compartimos datos únicamente con proveedores de infraestructura necesarios para operar el servicio, y solo en la medida en que resulte imprescindible:</p>
        <ul>
          <li>Servicios de alojamiento y base de datos.</li>
          <li>Plataformas de las que provienen los datos (Google, Meta), cuando la operación lo requiere.</li>
        </ul>
        <p>También podemos divulgar información si una autoridad competente lo exige mediante un requerimiento legal válido.</p>

        <h2><span className="num">05</span> Cuánto tiempo conservamos los datos</h2>
        <p>Conservamos tus datos mientras mantengas una cuenta activa. Si cerrás la cuenta o revocás los permisos, eliminamos la información asociada dentro de los <strong>30 días corridos</strong>, salvo aquellos registros que debamos retener por obligación legal o contable.</p>

        <h2><span className="num">06</span> Cookies y almacenamiento local</h2>
        <p>La Plataforma utiliza cookies y almacenamiento local del navegador para mantener tu sesión iniciada y recordar tus preferencias. No usamos cookies de publicidad ni de seguimiento de terceros, y no accedemos a otra información almacenada en tu dispositivo. Podés borrar estas cookies desde la configuración de tu navegador; si lo hacés, tendrás que volver a iniciar sesión.</p>

        <h2><span className="num">07</span> Seguridad</h2>
        <p>Los datos viajan cifrados mediante HTTPS y se almacenan en servidores con acceso restringido. Los tokens de acceso a plataformas externas se guardan cifrados. Ningún sistema es infalible, pero aplicamos las medidas razonables del estándar de la industria para protegerlos.</p>

        <h2><span className="num">08</span> Tus derechos</h2>
        <p>En cualquier momento podés:</p>
        <ul>
          <li>Solicitar una copia de los datos que tenemos sobre vos.</li>
          <li>Pedir su corrección o eliminación.</li>
          <li>Revocar los permisos otorgados a la Plataforma.</li>
          <li>Retirar tu consentimiento y cerrar tu cuenta.</li>
        </ul>
        <p>Para ejercer cualquiera de estos derechos, escribinos a la dirección indicada más abajo. Respondemos dentro de los 10 días hábiles.</p>
        <p>Si sos residente de Argentina, tenés además derecho a presentar un reclamo ante la Agencia de Acceso a la Información Pública, en su carácter de autoridad de aplicación de la Ley 25.326 de Protección de Datos Personales.</p>

        <h2><span className="num">09</span> Menores de edad</h2>
        <p>La Plataforma no está dirigida a menores de 18 años y no recopilamos deliberadamente datos de menores. Si detectamos que una cuenta pertenece a un menor, la eliminamos.</p>

        <h2><span className="num">10</span> Cambios en esta política</h2>
        <p>Si modificamos esta política, actualizamos la fecha del encabezado y notificamos por correo electrónico a las cuentas activas cuando el cambio sea sustancial.</p>

        <div className="contact">
          <h3>Contacto</h3>
          <p><strong>Responsable:</strong> Nova Softwares — Juan Pablo Acosta Caminos</p>
          <p><strong>Correo:</strong> <a href="mailto:juanpablo@novasoftwares.space">juanpablo@novasoftwares.space</a></p>
          <p><strong>Domicilio:</strong> 25 de Mayo 60, Piso 2 Depto D — Junín, Buenos Aires (CP 6000), Argentina</p>
        </div>

        <footer>
          <p>Nova Softwares · <Link href="/terminos">Condiciones del Servicio</Link></p>
        </footer>
      </div>
    </div>
  )
}
