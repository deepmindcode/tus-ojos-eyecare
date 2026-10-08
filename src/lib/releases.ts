/**
 * src/lib/releases.ts
 *
 * Control de versiones del sitio: una entrada por cada publicacion, la mas
 * nueva arriba.
 *
 * CADA VEZ QUE SE PUBLICA UN CAMBIO se agrega aqui una entrada, en el mismo
 * commit: el numero siguiente, la fecha de publicacion (AAAA-MM-DD), un
 * titulo corto y los cambios explicados en lenguaje sencillo, en espanol y
 * en ingles, como los entenderia quien usa el sitio (sin terminos tecnicos).
 * La pantalla Updates del panel (/admin/updates) muestra esta lista.
 *
 * Vive en el codigo y no en la base de datos por lo mismo que el manual:
 * la entrada tiene que nacer en el mismo commit que el cambio que describe.
 */

export type ReleaseLang = "es" | "en";

export interface Release {
  /** Numero de version: sube de uno en uno con cada publicacion. */
  readonly version: number;
  /** Fecha de publicacion, AAAA-MM-DD. */
  readonly date: string;
  readonly title: Readonly<Record<ReleaseLang, string>>;
  readonly changes: Readonly<Record<ReleaseLang, readonly string[]>>;
}

export const RELEASES: readonly Release[] = [
  {
    version: 19,
    date: "2026-10-08",
    title: { es: "Manzanito, la mascota", en: "Manzanito, the mascot" },
    changes: {
      es: [
        "Nueva mascota: un ojito con bata de óptico que sale caminando por un lado de la web, saluda e invita a pedir cita.",
        "Habla en el idioma de la página: español a quien lee en español, inglés a quien lee en inglés.",
        "Si hay una oferta activa, Manzanito la anuncia y lleva al formulario con el descuento ya puesto.",
        "Se enciende y se apaga desde Offers, en el panel. Llega apagado: en la web no cambia nada hasta que lo enciendas.",
        "Mientras esté encendido, la ventana emergente de ofertas no sale: la anuncia él. Al apagarlo, vuelve como antes.",
        "Sale una vez al día por visitante, y nunca en las páginas legales ni en el formulario de cita.",
      ],
      en: [
        "New mascot: a little eye in an optician's coat who walks in from one side of the site, waves, and invites the visitor to book.",
        "He speaks the page's language: Spanish to Spanish readers, English to English readers.",
        "When an offer is running, Manzanito announces it and takes the visitor to the form with the discount already applied.",
        "He is switched on and off from Offers in the panel. He arrives switched off: nothing changes on the site until you turn him on.",
        "While he is on, the offer popup does not appear — he announces it instead. Switch him off and it comes back as before.",
        "He appears once a day per visitor, and never on the legal pages or the appointment form.",
      ],
    },
  },
  {
    version: 18,
    date: "2026-10-08",
    title: { es: "El sitio va más rápido", en: "The site is faster" },
    changes: {
      es: [
        "Las páginas del sitio descargan bastante menos: se quitó un archivo pesado que viajaba a todas ellas sin hacer falta.",
        "Las páginas de servicios, de salud visual y de cada sede ahora están listas de antemano, así que la primera persona que entra ya no espera a que se preparen.",
        "El logotipo y la foto de la página «Nosotros» se descargan al tamaño en que se ven, no a diez veces más.",
        "Las imágenes y los iconos se quedan guardados en el navegador: a partir de la segunda visita no se vuelven a descargar.",
        "El panel responde más rápido en las pantallas con muchas filas, como el directorio de clientes y las campañas.",
      ],
      en: [
        "Pages download considerably less: a heavy file that was travelling to all of them unnecessarily was removed.",
        "The service, eye-health and office pages are now prepared in advance, so the first visitor no longer waits for them to be built.",
        "The logo and the photo on the About page now download at the size they are shown, not ten times larger.",
        "Images and icons stay in the browser: from the second visit on they are not downloaded again.",
        "The panel responds faster on screens with many rows, such as the client directory and campaigns.",
      ],
    },
  },
  {
    version: 17,
    date: "2026-10-08",
    title: {
      es: "Notas de la llamada, el panel en el teléfono y avisos",
      en: "Call notes, the panel on your phone, and alerts",
    },
    changes: {
      es: [
        "En cada solicitud se puede escribir una nota con lo que salió de la llamada. Queda con tu nombre y la hora, junto al resto del historial.",
        "Las notas no se pueden editar ni borrar: para corregir una, se escribe otra.",
        "El panel se puede instalar como una aplicación, con su icono, en el teléfono y en el ordenador.",
        "Se puede activar un aviso que suena cuando entra una solicitud nueva que nadie ha contactado, aunque el panel esté cerrado. El aviso nunca dice el nombre del paciente ni el motivo: sólo la oficina.",
      ],
      en: [
        "On every request you can write a note with what came out of the call. It is kept with your name and the time, alongside the rest of the history.",
        "Notes cannot be edited or deleted: to correct one, write another.",
        "The panel can be installed as an app, with its own icon, on your phone and on your computer.",
        "You can turn on an alert that buzzes when a new request arrives that nobody has contacted, even with the panel closed. The alert never says the patient's name or reason — only the office.",
      ],
    },
  },
  {
    version: 16,
    date: "2026-10-06",
    title: { es: "Control de versiones", en: "Version history" },
    changes: {
      es: ["Nueva pantalla Updates en el panel: muestra la versión que está en línea y lo que cambió en cada actualización, con su fecha."],
      en: ["New Updates screen in the panel: it shows the version that is live and what changed in each update, with its date."],
    },
  },
  {
    version: 15,
    date: "2026-10-04",
    title: { es: "Campañas: elegir destinatarios y enviar una prueba", en: "Campaigns: choose recipients and send a test" },
    changes: {
      es: [
        "Se puede elegir a mano a quién se envía una campaña.",
        "Envío de prueba a tu propio correo antes de enviar a todos.",
        "Se puede cerrar la lista y cancelar una campaña.",
      ],
      en: ["You can hand-pick who receives a campaign.", "Test send to your own email before sending to everyone.", "You can close the list and cancel a campaign."],
    },
  },
  {
    version: 14,
    date: "2026-10-04",
    title: { es: "Campañas por correo", en: "Email campaigns" },
    changes: {
      es: [
        "Nueva sección Campaigns: ofertas por correo a un grupo de clientes.",
        "Una oferta puede ser para la web, para el correo o para las dos.",
        "Una campaña solo usa promociones activas.",
      ],
      en: ["New Campaigns section: email offers to a group of clients.", "An offer can be for the website, for email, or for both.", "A campaign only uses active promotions."],
    },
  },
  {
    version: 13,
    date: "2026-10-04",
    title: { es: "Historial de clientes desde 2023", en: "Client history since 2023" },
    changes: {
      es: ["Se trajo el historial de clientes del sitio anterior, desde 2023."],
      en: ["Client history from the previous website was brought in, going back to 2023."],
    },
  },
  {
    version: 12,
    date: "2026-10-04",
    title: { es: "Tendencias", en: "Trends" },
    changes: {
      es: ["Nueva sección Trends: solicitudes por mes, por año y por motivo de consulta."],
      en: ["New Trends section: requests by month, by year and by reason for visit."],
    },
  },
  {
    version: 11,
    date: "2026-10-04",
    title: { es: "Directorio de clientes", en: "Client directory" },
    changes: {
      es: ["Nueva sección Clients: directorio de clientes con su historial.", "Se puede filtrar por motivo de consulta y por sede."],
      en: ["New Clients section: a client directory with each person's history.", "It can be filtered by reason for visit and by location."],
    },
  },
  {
    version: 10,
    date: "2026-10-04",
    title: { es: "Manual de uso en el panel", en: "User guide in the panel" },
    changes: {
      es: ["El panel trae su manual de uso (Guide), en español y en inglés, según el rol de cada persona."],
      en: ["The panel now includes its user guide, in Spanish and English, tailored to each person's role."],
    },
  },
  {
    version: 9,
    date: "2026-10-03",
    title: { es: "Horarios reales por sede", en: "Real hours for each location" },
    changes: {
      es: ["Cada sede muestra su horario real."],
      en: ["Each location shows its real opening hours."],
    },
  },
  {
    version: 8,
    date: "2026-10-02",
    title: { es: "Logo del pie de página", en: "Footer logo" },
    changes: {
      es: ["El logo oscuro del pie de página ya no muestra rellenos blancos."],
      en: ["The dark footer logo no longer shows white fills."],
    },
  },
  {
    version: 7,
    date: "2026-10-02",
    title: { es: "Oftalmología, queratocono y marcas", en: "Ophthalmology, keratoconus and brands" },
    changes: {
      es: [
        "Páginas de oftalmología y queratocono, y marcas autorizadas.",
        "Mejoras para aparecer mejor en Google y en asistentes de IA, incluido «Se habla español».",
        "Las direcciones del sitio anterior llevan a las páginas nuevas.",
      ],
      en: [
        "Ophthalmology and keratoconus pages, plus authorized brands.",
        "Improvements to show up better on Google and AI assistants, including “Se habla español”.",
        "Addresses from the previous website now lead to the new pages.",
      ],
    },
  },
  {
    version: 6,
    date: "2026-10-01",
    title: { es: "Cuentas del equipo y nueva foto principal", en: "Team accounts and new main photo" },
    changes: {
      es: ["Se puede desactivar una cuenta, reiniciar una contraseña y cambiar la propia.", "Nueva foto principal en la página de inicio."],
      en: ["You can deactivate an account, reset a password and change your own.", "New main photo on the home page."],
    },
  },
  {
    version: 5,
    date: "2026-10-01",
    title: { es: "Inbox: archivar mensajes", en: "Inbox: archive messages" },
    changes: {
      es: ["Los mensajes se pueden archivar.", "Borrar mensajes queda reservado a dirección."],
      en: ["Messages can be archived.", "Deleting messages is reserved for leadership."],
    },
  },
  {
    version: 4,
    date: "2026-10-01",
    title: { es: "Avisos por correo y formulario de contacto", en: "Email notices and contact form" },
    changes: {
      es: ["Llega un correo cuando entra una solicitud de cita.", "Nuevo formulario de contacto, con aviso por correo de los mensajes nuevos."],
      en: ["An email arrives when an appointment request comes in.", "New contact form, with an email notice for new messages."],
    },
  },
  {
    version: 3,
    date: "2026-10-01",
    title: { es: "Inbox, auditoría y aviso de cookies", en: "Inbox, audit log and cookie notice" },
    changes: {
      es: ["Bandeja de mensajes (Inbox) y registro de auditoría en el panel.", "Aviso de cookies en el sitio."],
      en: ["Message inbox and audit log in the panel.", "Cookie notice on the website."],
    },
  },
  {
    version: 2,
    date: "2026-10-01",
    title: { es: "Páginas del sitio y promociones", en: "Website pages and promotions" },
    changes: {
      es: ["Páginas de servicios, sedes, pacientes, contacto y salud visual.", "Promociones conectadas al formulario de citas."],
      en: ["Pages for services, locations, patients, contact and eye health.", "Promotions connected to the appointment form."],
    },
  },
  {
    version: 1,
    date: "2026-08-16",
    title: { es: "Lanzamiento del sitio nuevo", en: "New website launch" },
    changes: {
      es: ["Sitio bilingüe de Tus Ojos Eyecare, con formulario de citas y panel administrativo."],
      en: ["Bilingual Tus Ojos Eyecare website, with an appointment form and an admin panel."],
    },
  },
];

/** La version que esta en linea. */
export const CURRENT_RELEASE = RELEASES[0] as Release;
