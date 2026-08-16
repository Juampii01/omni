import "../legal.css"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Condiciones del Servicio — Omni",
  description: "Condiciones que regulan el uso de Omni: cuenta, uso aceptable, servicios de terceros, responsabilidad y jurisdicción.",
}

export default function TerminosPage() {
  return (
    <div className="legal">
      <div className="wrap">
        <header>
          <p className="eyebrow">Documento legal</p>
          <h1>Condiciones del Servicio</h1>
          <p className="meta">Última actualización: 15 de agosto de 2026 · Omni</p>
        </header>

        <p>Estas condiciones regulan el uso de Omni (en adelante, «la Plataforma»), un producto de <strong>Nova Softwares</strong>, operado por <strong>Acosta Caminos Juan Pablo</strong>, con domicilio en 25 de Mayo 60, Piso 2 Depto D, Junín, Provincia de Buenos Aires (CP 6000), Argentina.</p>

        <p>Al crear una cuenta o conectar una red social, aceptás estas condiciones en su totalidad. Si no estás de acuerdo con alguna parte, no uses el servicio.</p>

        <h2><span className="num">01</span> Qué hace la Plataforma</h2>
        <p>Omni permite conectar cuentas de YouTube e Instagram para centralizar en un solo panel las métricas de rendimiento y las conversaciones entrantes, y responder desde ahí.</p>
        <p>La Plataforma es una herramienta independiente. No está afiliada, patrocinada ni respaldada por Google LLC, YouTube ni Meta Platforms, Inc.</p>

        <h2><span className="num">02</span> Cuenta y responsabilidad del usuario</h2>
        <ul>
          <li>Debés tener al menos 18 años para usar el servicio.</li>
          <li>Sos responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
          <li>Sos responsable de toda actividad que ocurra bajo tu cuenta.</li>
          <li>Debés notificarnos de inmediato ante cualquier uso no autorizado.</li>
        </ul>
        <p>Solo podés conectar cuentas de redes sociales sobre las que tengas autorización legítima para operar.</p>

        <h2><span className="num">03</span> Uso aceptable</h2>
        <p>No está permitido usar la Plataforma para:</p>
        <ul>
          <li>Enviar mensajes masivos no solicitados, spam o comunicaciones automatizadas que violen las políticas de las plataformas conectadas.</li>
          <li>Recopilar datos de terceros sin su consentimiento.</li>
          <li>Vulnerar, sondear o sobrecargar la infraestructura del servicio.</li>
          <li>Realizar ingeniería inversa del software o intentar acceder a código o datos ajenos.</li>
          <li>Infringir derechos de propiedad intelectual, leyes aplicables o los términos de las plataformas conectadas.</li>
        </ul>

        <div className="callout">
          <p>Al conectar tu canal de YouTube, quedás vinculado por los <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener">Términos de Servicio de YouTube</a>. Al conectar Instagram, por las condiciones de Meta. El incumplimiento de esas condiciones puede provocar la suspensión de tu acceso, tanto en la plataforma de origen como en Omni.</p>
        </div>

        <h2><span className="num">04</span> Servicios de terceros</h2>
        <p>La Plataforma depende de las APIs de Google, YouTube y Meta. Esas empresas pueden modificar, restringir o discontinuar el acceso a sus servicios en cualquier momento y sin previo aviso.</p>
        <p>No somos responsables por interrupciones, cambios de funcionalidad o pérdida de acceso derivados de decisiones de esos proveedores.</p>

        <h2><span className="num">05</span> Datos personales</h2>
        <p>El tratamiento de tus datos se rige por nuestra <Link href="/privacidad">Política de Privacidad</Link>, que forma parte integrante de estas condiciones.</p>
        <p>Conservás la titularidad de todos los datos y contenidos que ingreses o que provengan de tus cuentas conectadas. Nos otorgás una licencia limitada para procesarlos con el único fin de prestarte el servicio.</p>

        <h2><span className="num">06</span> Disponibilidad del servicio</h2>
        <p>Trabajamos para mantener la Plataforma operativa, pero no garantizamos disponibilidad ininterrumpida. Podemos realizar tareas de mantenimiento, actualizaciones o suspensiones temporales.</p>
        <p>El servicio se presta «tal como está», sin garantías implícitas de comerciabilidad o adecuación a un fin específico.</p>

        <h2><span className="num">07</span> Limitación de responsabilidad</h2>
        <p>En la máxima medida permitida por la ley aplicable, no seremos responsables por daños indirectos, lucro cesante, pérdida de datos o pérdida de oportunidades comerciales derivados del uso o de la imposibilidad de uso de la Plataforma.</p>
        <p>Nuestra responsabilidad total, por cualquier concepto, no excederá el monto que hayas abonado por el servicio en los doce meses anteriores al hecho que dio origen al reclamo.</p>

        <h2><span className="num">08</span> Precio y pagos</h2>
        <p>Las condiciones comerciales, el precio y la modalidad de facturación se acuerdan por escrito con cada cliente. Salvo pacto en contrario, los importes no incluyen impuestos.</p>
        <p>La falta de pago habilita la suspensión del acceso previa notificación.</p>

        <h2><span className="num">09</span> Suspensión y baja</h2>
        <p>Podés dar de baja tu cuenta en cualquier momento escribiéndonos. Al hacerlo, eliminamos tus datos según lo indicado en la Política de Privacidad.</p>
        <p>Podemos suspender o cancelar cuentas que incumplan estas condiciones, previa notificación salvo que la gravedad del incumplimiento requiera acción inmediata.</p>

        <h2><span className="num">10</span> Modificaciones</h2>
        <p>Podemos actualizar estas condiciones. Si el cambio es sustancial, lo notificamos por correo electrónico con al menos 15 días de anticipación. El uso continuado del servicio después de esa fecha implica aceptación.</p>

        <h2><span className="num">11</span> Ley aplicable y jurisdicción</h2>
        <p>Estas condiciones se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a los tribunales ordinarios competentes de la ciudad de Junín, Provincia de Buenos Aires, con renuncia a cualquier otro fuero.</p>

        <div className="contact">
          <h3>Contacto</h3>
          <p><strong>Titular:</strong> Nova Softwares — Acosta Caminos Juan Pablo</p>
          <p><strong>Correo:</strong> <a href="mailto:contacto@novasoftwares.space">contacto@novasoftwares.space</a></p>
          <p><strong>Domicilio:</strong> 25 de Mayo 60, Piso 2 Depto D — Junín, Buenos Aires (CP 6000), Argentina</p>
        </div>

        <footer>
          <p>Nova Softwares · <Link href="/privacidad">Política de Privacidad</Link></p>
        </footer>
      </div>
    </div>
  )
}
