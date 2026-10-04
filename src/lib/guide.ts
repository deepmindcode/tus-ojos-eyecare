/**
 * src/lib/guide.ts
 *
 * Manual de uso del panel, en texto plano y versionado con el código.
 *
 * Por qué vive aquí y no en la base de datos: el manual describe botones
 * y estados concretos. Si mañana se renombra un estado, el manual tiene
 * que cambiar en el mismo commit; en una tabla se quedaría mintiendo
 * durante meses sin que nadie se entere.
 *
 * Y por qué está en los dos idiomas cuando el resto del panel sólo está
 * en inglés: el panel lo usa gente que ya sabe dónde está cada cosa. Un
 * manual que quien lo necesita no puede leer no es un manual.
 */

export type GuideLang = "es" | "en";
export type GuideAudience = "FRONT_DESK" | "LEADERSHIP";

export interface GuideDef {
  readonly term: string;
  readonly desc: string;
}

export type GuideBlock =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "steps"; readonly items: readonly string[] }
  | { readonly kind: "defs"; readonly defs: readonly GuideDef[] }
  | { readonly kind: "note"; readonly text: string }
  | { readonly kind: "warn"; readonly text: string };

export interface GuideSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly GuideBlock[];
}

export interface GuideDoc {
  readonly title: string;
  readonly intro: string;
  readonly sections: readonly GuideSection[];
}

/* ------------------------------------------------------------------ */
/* Recepción — español                                                 */
/* ------------------------------------------------------------------ */

const FRONT_DESK_ES: GuideDoc = {
  title: "Manual de recepción",
  intro:
    "Todo lo que necesitas para trabajar con las solicitudes de cita. Si algo no coincide con lo que ves en pantalla, avisa: el manual está mal, no tú.",
  sections: [
    {
      id: "pantalla",
      title: "Qué es esta pantalla",
      blocks: [
        {
          kind: "text",
          text: "Appointments es la lista de personas que pidieron cita por el sitio web. Cada fila es alguien esperando una llamada. Sólo ves las solicitudes de la sede o sedes que tengas asignadas; si crees que falta alguna, no es un fallo del sistema: pide a dirección que revise tu acceso.",
        },
        {
          kind: "text",
          text: "Por defecto se muestran los últimos 30 días. Arriba tienes filtros por sede y por estado, y la dirección de la página guarda el filtro: si trabajas siempre con una sede, guarda esa dirección en favoritos y entrarás directo.",
        },
      ],
    },
    {
      id: "como-llega",
      title: "Cómo llega una cita",
      blocks: [
        {
          kind: "steps",
          items: [
            "La persona rellena el formulario del sitio y elige la sede.",
            "La solicitud aparece aquí con estado NEW. Nadie la ha llamado todavía.",
            "El sistema NO le ha confirmado día ni hora. Lo que vio en pantalla es que vamos a llamarla.",
          ],
        },
        {
          kind: "warn",
          text: "Una solicitud no es una cita. Hasta que tú hables con la persona y acordéis día y hora, no hay nada reservado.",
        },
      ],
    },
    {
      id: "estados",
      title: "Qué estado marcar después de contactar",
      blocks: [
        {
          kind: "text",
          text: "El estado se cambia en la propia fila. Marca siempre lo que de verdad pasó, aunque sea un no: el estado es lo que le dice al resto del equipo si hay que volver a llamar o no.",
        },
        {
          kind: "defs",
          defs: [
            { term: "NEW", desc: "Acaba de entrar. Nadie la ha tocado. No cambies este estado hasta haber intentado llamar." },
            { term: "CONTACT ATTEMPTED", desc: "Llamaste y no contestó, o dejaste mensaje. Hay que volver a intentarlo." },
            { term: "PATIENT REACHED", desc: "Hablaste con la persona, pero todavía no hay día y hora cerrados. Por ejemplo: va a mirar su horario y te devuelve la llamada." },
            { term: "CONFIRMED", desc: "Hay día y hora acordados. Éste es el único estado que significa que la cita existe." },
            { term: "RESCHEDULE REQUESTED", desc: "Ya había cita y pidió cambiarla. Queda pendiente de cerrar la nueva fecha." },
            { term: "CANCELLED", desc: "La persona canceló. No hace falta volver a llamar." },
            { term: "COMPLETED", desc: "Vino a la cita. Se marca después de la visita." },
            { term: "NO RESPONSE", desc: "Varios intentos y nunca contestó. Antes de marcarlo, prueba el otro medio que dejó (si dio teléfono y correo, usa los dos)." },
            { term: "SPAM", desc: "Formulario falso, publicidad o datos inventados. Márcalo y olvídalo: no pierdas tiempo llamando." },
            { term: "IMPORTED", desc: "Registro traído del sitio web anterior, de mayo a septiembre de 2026. No es trabajo pendiente: nadie tiene que llamar por una solicitud de hace meses. Está ahí para que el historial del cliente esté completo." },
          ],
        },
        {
          kind: "note",
          text: "Cada cambio de estado queda registrado con tu nombre y la hora. No es para vigilarte: es para que, si alguien pregunta por qué un paciente no fue llamado, se pueda responder con hechos.",
        },
      ],
    },
    {
      id: "seguimiento",
      title: "Cuándo una solicitud se está enfriando",
      blocks: [
        {
          kind: "text",
          text: "El filtro Needs follow-up te muestra lo que lleva demasiado tiempo parado:",
        },
        {
          kind: "defs",
          defs: [
            { term: "NEW más de 24 horas", desc: "Entró ayer y todavía nadie ha llamado." },
            { term: "CONTACT ATTEMPTED más de 48 horas", desc: "Se intentó una vez y ahí quedó." },
          ],
        },
        {
          kind: "text",
          text: "Empieza el día por ese filtro. Una persona que pidió cita el lunes y recibe la llamada el jueves normalmente ya fue a otro sitio.",
        },
      ],
    },
    {
      id: "detalles",
      title: "Lo que no se puede pasar por alto en la ficha",
      blocks: [
        {
          kind: "defs",
          defs: [
            {
              term: "Descuento (promoción)",
              desc: "Si la fila trae una etiqueta de descuento, es lo que se le prometió a esa persona cuando hizo clic en la oferta. Queda guardado tal cual; respétalo aunque la promoción ya haya terminado.",
            },
            {
              term: "Preferencia de contacto",
              desc: "Llamada, mensaje de texto o correo. Empieza por el medio que eligió. Si pidió texto, llamarle por sorpresa es la forma más rápida de que no conteste.",
            },
            {
              term: "Consentimiento de SMS",
              desc: "Si NO lo dio, puedes llamar, pero no mandarle mensajes. Es una obligación legal, no una preferencia nuestra.",
            },
            {
              term: "Notas",
              desc: "Lo que escribió la persona. Léelo antes de llamar: muchas veces ya dice qué necesita y con qué seguro.",
            },
          ],
        },
      ],
    },
    {
      id: "inbox",
      title: "La bandeja de mensajes (Inbox)",
      blocks: [
        {
          kind: "text",
          text: "Inbox son los mensajes del formulario de contacto: preguntas, no solicitudes de cita. Se abren, se responden y se marcan.",
        },
        {
          kind: "defs",
          defs: [
            { term: "UNREAD", desc: "Nadie lo ha abierto." },
            { term: "READ", desc: "Alguien lo leyó. Se marca solo al abrirlo." },
            { term: "IN PROGRESS", desc: "Estás ocupándote de ello pero aún no has respondido." },
            { term: "REPLIED", desc: "Ya se le contestó." },
            { term: "CLOSED", desc: "Asunto terminado." },
            { term: "SPAM", desc: "Publicidad o mensaje falso." },
          ],
        },
        {
          kind: "note",
          text: "Un mensaje sin abrir más de 24 horas aparece marcado: es alguien esperando respuesta.",
        },
      ],
    },
    {
      id: "imprimir",
      title: "Llevar la lista en papel",
      blocks: [
        {
          kind: "text",
          text: "El botón Print list genera la lista de la sede que tengas filtrada, lista para imprimir.",
        },
        {
          kind: "warn",
          text: "Ese papel lleva nombres y teléfonos de pacientes. No lo dejes en el mostrador ni lo tires a la papelera común: destrúyelo al terminar el día.",
        },
      ],
    },
    {
      id: "clave",
      title: "Tu contraseña",
      blocks: [
        {
          kind: "steps",
          items: [
            "Para cambiarla tú: My account, abajo a la izquierda. Te pide la actual y la nueva.",
            "Si la olvidaste: no hay recuperación por correo. Pídele a Wilfredo que te la restablezca desde Team; te dará una nueva y la cambias al entrar.",
            "Al restablecerla se cierran todas tus sesiones abiertas, también en el móvil. Es a propósito.",
          ],
        },
        {
          kind: "warn",
          text: "Una cuenta por persona. No compartas la tuya ni uses la de otro: el registro de actividad asocia cada cambio a quien tenía la sesión, y si compartís cuenta, los errores de otro aparecen con tu nombre.",
        },
      ],
    },
    {
      id: "privacidad",
      title: "Datos de pacientes",
      blocks: [
        {
          kind: "steps",
          items: [
            "No mandes capturas del panel por WhatsApp, Messenger ni correo personal.",
            "No copies listas de pacientes a un documento propio ni a tu teléfono.",
            "Si alguien te pide datos de un paciente por teléfono, no los des: pásalo a dirección.",
            "Cierra sesión si dejas el ordenador del mostrador sin vigilancia.",
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Recepción — inglés                                                  */
/* ------------------------------------------------------------------ */

const FRONT_DESK_EN: GuideDoc = {
  title: "Front desk manual",
  intro:
    "Everything you need to work through appointment requests. If something here does not match what you see on screen, say so: the manual is wrong, not you.",
  sections: [
    {
      id: "pantalla",
      title: "What this screen is",
      blocks: [
        {
          kind: "text",
          text: "Appointments is the list of people who requested a visit through the website. Every row is someone waiting for a call. You only see requests for the office or offices assigned to you; if one seems missing, that is not a bug — ask leadership to check your access.",
        },
        {
          kind: "text",
          text: "The last 30 days are shown by default. Filters for office and status are at the top, and the page address keeps the filter: if you always work one office, bookmark that address and you land straight on it.",
        },
      ],
    },
    {
      id: "como-llega",
      title: "How a request arrives",
      blocks: [
        {
          kind: "steps",
          items: [
            "The person fills in the website form and picks an office.",
            "The request shows up here as NEW. Nobody has called them yet.",
            "The system did NOT confirm a day or a time. What they saw on screen is that we will call them.",
          ],
        },
        {
          kind: "warn",
          text: "A request is not an appointment. Until you speak to the person and agree on a day and time, nothing is booked.",
        },
      ],
    },
    {
      id: "estados",
      title: "Which status to set after contacting",
      blocks: [
        {
          kind: "text",
          text: "The status is changed on the row itself. Always record what actually happened, even when it is a no: the status is what tells everyone else whether to call again.",
        },
        {
          kind: "defs",
          defs: [
            { term: "NEW", desc: "Just arrived. Untouched. Do not change this until you have tried to call." },
            { term: "CONTACT ATTEMPTED", desc: "You called and got no answer, or left a message. It needs another try." },
            { term: "PATIENT REACHED", desc: "You spoke to the person, but no day and time are settled yet — they are checking their schedule and will call back." },
            { term: "CONFIRMED", desc: "Day and time agreed. This is the only status that means the appointment exists." },
            { term: "RESCHEDULE REQUESTED", desc: "There was an appointment and they asked to move it. A new date is still pending." },
            { term: "CANCELLED", desc: "The person cancelled. No need to call again." },
            { term: "COMPLETED", desc: "They came in. Set after the visit." },
            { term: "NO RESPONSE", desc: "Several attempts, never answered. Before setting this, try the other channel they gave (if both phone and email, use both)." },
            { term: "SPAM", desc: "Fake form, advertising or made-up details. Mark it and move on." },
            { term: "IMPORTED", desc: "A record carried over from the previous website, May to September 2026. Not pending work: nobody has to call about a request from months ago. It is there so the client history is complete." },
          ],
        },
        {
          kind: "note",
          text: "Every status change is recorded with your name and the time. Not to watch you: so that when someone asks why a patient was never called, the answer is a fact rather than a guess.",
        },
      ],
    },
    {
      id: "seguimiento",
      title: "When a request is going cold",
      blocks: [
        {
          kind: "text",
          text: "The Needs follow-up filter shows what has been sitting too long:",
        },
        {
          kind: "defs",
          defs: [
            { term: "NEW for over 24 hours", desc: "It came in yesterday and nobody has called." },
            { term: "CONTACT ATTEMPTED for over 48 hours", desc: "One attempt was made and it stopped there." },
          ],
        },
        {
          kind: "text",
          text: "Start the day with that filter. Someone who asked on Monday and hears from us on Thursday has usually gone elsewhere.",
        },
      ],
    },
    {
      id: "detalles",
      title: "What you cannot skip on the record",
      blocks: [
        {
          kind: "defs",
          defs: [
            {
              term: "Discount (promotion)",
              desc: "If the row carries a discount label, that is what was promised to that person when they clicked the offer. It is stored as it was; honour it even if the promotion has since ended.",
            },
            {
              term: "Contact preference",
              desc: "Call, text or email. Start with what they chose. If they asked for a text, an unannounced call is the fastest way to not reach them.",
            },
            {
              term: "SMS consent",
              desc: "If they did NOT give it, you may call but you may not text them. That is a legal obligation, not a house preference.",
            },
            {
              term: "Notes",
              desc: "What the person wrote. Read it before calling: it often already says what they need and which insurance they have.",
            },
          ],
        },
      ],
    },
    {
      id: "inbox",
      title: "The message inbox",
      blocks: [
        {
          kind: "text",
          text: "Inbox holds contact-form messages: questions, not appointment requests. They are opened, answered and marked.",
        },
        {
          kind: "defs",
          defs: [
            { term: "UNREAD", desc: "Nobody has opened it." },
            { term: "READ", desc: "Someone read it. Set automatically on opening." },
            { term: "IN PROGRESS", desc: "You are handling it but have not replied yet." },
            { term: "REPLIED", desc: "An answer has been sent." },
            { term: "CLOSED", desc: "Matter finished." },
            { term: "SPAM", desc: "Advertising or a fake message." },
          ],
        },
        {
          kind: "note",
          text: "A message left unopened for more than 24 hours is flagged: that is somebody waiting.",
        },
      ],
    },
    {
      id: "imprimir",
      title: "Taking the list on paper",
      blocks: [
        {
          kind: "text",
          text: "Print list produces the list for whichever office you have filtered, ready to print.",
        },
        {
          kind: "warn",
          text: "That paper carries patient names and phone numbers. Do not leave it on the counter or drop it in the shared bin: destroy it at the end of the day.",
        },
      ],
    },
    {
      id: "clave",
      title: "Your password",
      blocks: [
        {
          kind: "steps",
          items: [
            "To change it yourself: My account, bottom left. It asks for the current one and the new one.",
            "If you forgot it: there is no email recovery. Ask Wilfredo to reset it from Team; he gives you a new one and you change it once you are in.",
            "Resetting signs you out everywhere, phone included. That is deliberate.",
          ],
        },
        {
          kind: "warn",
          text: "One account per person. Do not share yours or use someone else's: the activity log ties every change to whoever held the session, so a shared account puts another person's mistakes under your name.",
        },
      ],
    },
    {
      id: "privacidad",
      title: "Patient information",
      blocks: [
        {
          kind: "steps",
          items: [
            "Do not send screenshots of the panel over WhatsApp, Messenger or personal email.",
            "Do not copy patient lists into your own document or your phone.",
            "If someone asks you for a patient's details over the phone, do not give them: pass it to leadership.",
            "Sign out if you leave the front desk computer unattended.",
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Dirección — secciones adicionales                                   */
/* ------------------------------------------------------------------ */

const LEADERSHIP_EXTRA_ES: readonly GuideSection[] = [
  {
    id: "dirigir",
    title: "Dirigir el seguimiento del equipo",
    blocks: [
      {
        kind: "text",
        text: "Los cuatro números de arriba no son decoración. El que importa es Needs follow-up: no mide cuántas citas entran, sino cuántas se están enfriando. Si ese número sube durante la semana, hay un problema de personal o de carga, no de marketing.",
      },
      {
        kind: "steps",
        items: [
          "Filtra por sede para ver de dónde viene el atasco.",
          "Mira el Audit log para saber quién movió qué y cuándo.",
          "Si una sede acumula NEW sin tocar, lo normal es que falte alguien con acceso a esa sede, no que falte voluntad.",
        ],
      },
      {
        kind: "note",
        text: "Esta pantalla se actualiza sola mientras la tengas abierta. Lo que marque recepción aparece aquí sin recargar.",
      },
    ],
  },
  {
    id: "ofertas",
    title: "Crear una promoción",
    blocks: [
      {
        kind: "text",
        text: "Una promoción es una ventana que aparece en el sitio. Cuando el visitante acepta, llega al formulario de cita con el descuento ya anotado, y recepción ve en la ficha exactamente qué se le prometió antes de llamarle.",
      },
      {
        kind: "steps",
        items: [
          "Entra en Offers y crea una nueva.",
          "Nombre interno: sólo para ti, no se publica. Sirve para distinguirla en la lista.",
          "Título y descripción, en inglés y en español. Los dos: el visitante ve el de su idioma.",
          "Descuento: escribe el texto EXACTO que recepción verá en la ficha de la cita. Si pones «20% off frames», eso es lo que habrá que cumplir.",
          "Condiciones: la letra pequeña. Lo que no esté escrito aquí no se puede negar después.",
          "Sede: elige una, o déjalo vacío para que valga en las tres.",
          "Publica cuando esté revisada.",
        ],
      },
      {
        kind: "warn",
        text: "El descuento se copia a la solicitud en el momento en que la persona la envía. Si luego editas o terminas la promoción, las solicitudes ya hechas conservan lo que se les prometió. Es a propósito, y es lo que evita una discusión en el mostrador.",
      },
      {
        kind: "note",
        text: "Si la promoción es de una sola sede y llega una solicitud de otra, el sistema guarda la cita pero sin el descuento: la oferta no aplicaba ahí.",
      },
    ],
  },
  {
    id: "trends",
    title: "Trends: en qué meses y años hay más solicitudes",
    blocks: [
      {
        kind: "text",
        text: "Trends responde a dos preguntas: cuándo entra el trabajo y por qué viene la gente. Arriba hay cuatro cifras de un vistazo —total de solicitudes, mes más cargado, motivo más pedido y mensajes de contacto— y debajo las gráficas con el número y el porcentaje de cada barra.",
      },
      {
        kind: "defs",
        defs: [
          {
            term: "Solicitudes por mes",
            desc: "Por defecto suma TODOS los años en los doce meses. Eso es lo que enseña la temporada: si septiembre es alto cada año, se ve de golpe. Elige un año arriba para ver sólo ése.",
          },
          {
            term: "Por qué piden cita",
            desc: "Los motivos ordenados de mayor a menor, con cuántas solicitudes y qué porcentaje del total. Es lo que dice en qué conviene invertir y de qué hablar en las promociones.",
          },
          {
            term: "Solicitudes por sede",
            desc: "El reparto entre Camden, Philadelphia y Cherry Hill en el periodo elegido.",
          },
          {
            term: "Solicitudes por año",
            desc: "Siempre el histórico completo, sin filtrar: su trabajo es comparar un año con otro.",
          },
        ],
      },
      {
        kind: "steps",
        items: [
          "Los botones de año de arriba afectan a todo lo de abajo a la vez.",
          "Pasa el ratón por una barra para ver el mes, la cifra y el porcentaje.",
          "Debajo de la gráfica de meses, «Show the numbers» abre la tabla con los mismos datos, por si prefieres leerlos o imprimirlos.",
        ],
      },
      {
        kind: "note",
        text: "Sólo se etiqueta con su cifra la barra más alta. Poner el número sobre las doce convierte la gráfica en ruido; el resto se lee pasando el ratón o en la tabla.",
      },
      {
        kind: "warn",
        text: "Aquí se cuentan SOLICITUDES RECIBIDAS, no citas cumplidas. Un mes con muchas solicitudes y pocas confirmadas no es un buen mes: es un mes en el que no se devolvieron las llamadas. Para eso está el filtro Needs follow-up en Appointments.",
      },
    ],
  },
  {
    id: "clientes",
    title: "El directorio de clientes",
    blocks: [
      {
        kind: "text",
        text: "Clients es la lista de todas las personas que han escrito por el sitio, una fila por persona. Quien ha pedido cita tres veces aparece una sola vez con un 3 al lado; al abrirla ves cada solicitud y cada mensaje con su fecha, su sede y su motivo. Nada se sobrescribe cuando alguien vuelve: se añade al historial.",
      },
      {
        kind: "steps",
        items: [
          "Busca por nombre, por teléfono o por correo. El teléfono funciona aunque lo escribas con guiones o sin ellos.",
          "Filtra por motivo y por sede, juntos o por separado: por ejemplo, todo el que alguna vez pidió cita por ojo seco en Camden. Debajo del nombre ves los motivos de cada persona sin tener que abrirla.",
          "Haz clic en el nombre para abrir el historial completo.",
          "Print list saca en papel exactamente la lista que estás viendo, con el filtro aplicado; el botón de imprimir dentro de una ficha saca sólo esa persona.",
        ],
      },
      {
        kind: "note",
        text: "El directorio incluye 315 solicitudes traídas del correo del sitio web anterior, desde septiembre de 2023. De esos registros antiguos casi nunca se sabe el motivo: el formulario de entonces o no lo preguntaba, o su campo lo llenaron sobre todo los robots de spam. Salen como «Other» y el filtro por motivo no los encuentra; sus datos de contacto sí son buenos. En 57 tampoco quedó la sede, y esos sólo los ve dirección: nadie en recepción puede trabajar una solicitud sin saber a qué oficina va.",
      },
      {
        kind: "note",
        text: "Las personas se agrupan por teléfono y por correo, porque el formulario no pide cuenta. Si dos familiares comparten teléfono pueden salir como una sola ficha: se nota al abrirla, porque los nombres del historial no coinciden.",
      },
      {
        kind: "text",
        text: "Para qué sirven los filtros: preparar una oferta dirigida. Sacas la lista de quien vino por ojo seco y le ofreces una revisión de seguimiento, en vez de mandar la misma promoción a todo el mundo; y si la promoción es sólo de una sede, filtras también por sede y llamas únicamente a quien le queda cerca. Ambos miran TODO el historial, no sólo la última solicitud: quien preguntó por cataratas hace un año, o fue una vez a Camden, sigue apareciendo.",
      },
      {
        kind: "warn",
        text: "Antes de llamar u ofrecer algo, comprueba en la ficha el consentimiento de SMS de esa persona. Y recuerda que una oferta basada en un motivo de consulta es información de salud: no la pongas en el asunto de un correo ni en un mensaje que pueda leer alguien por encima del hombro.",
      },
      {
        kind: "warn",
        text: "Esta pantalla sólo la ve dirección, y con motivo: reúne el teléfono, el correo y el motivo de consulta de todo el mundo en un sitio. Cada vez que se abre una ficha o se imprime el directorio queda anotado en el registro de actividad con tu nombre.",
      },
    ],
  },
  {
    id: "inbox-direccion",
    title: "La bandeja: archivar y borrar",
    blocks: [
      {
        kind: "defs",
        defs: [
          {
            term: "Archivar",
            desc: "Lo quita de la vista de trabajo sin borrarlo. Es lo que debes usar casi siempre: la bandeja se queda limpia y el mensaje sigue ahí si hace falta.",
          },
          {
            term: "Borrar",
            desc: "Sólo dirección puede. Desaparece y no se recupera. Antes de borrarse queda anotado en el registro quién lo hizo, de qué asunto y de qué fecha.",
          },
        ],
      },
      {
        kind: "warn",
        text: "Si un mensaje pudiera tener valor en una reclamación o una queja, archívalo, no lo borres.",
      },
    ],
  },
  {
    id: "equipo",
    title: "El equipo: altas, sedes, bajas y contraseñas",
    blocks: [
      {
        kind: "text",
        text: "Todo está en Team. Es la pantalla con más poder del panel: desde ahí se decide quién ve datos de pacientes.",
      },
      {
        kind: "steps",
        items: [
          "Alta: correo, nombre, contraseña inicial, rol y sede o sedes. Dale sólo las sedes donde esa persona trabaja de verdad.",
          "Asignar sedes: se puede cambiar después. Sin sede asignada, una persona de recepción entra pero no ve ninguna solicitud, y la pantalla se lo dice.",
          "Baja: desactiva la cuenta en vez de borrarla. Deja de poder entrar al momento, y el historial de lo que hizo se conserva.",
          "Contraseña olvidada: restablécela desde ahí. Dale la nueva en persona o por teléfono, nunca por correo ni por WhatsApp.",
        ],
      },
      {
        kind: "note",
        text: "El sistema no te deja desactivarte a ti mismo ni quitar al último propietario. Es a propósito: evita quedarte fuera de tu propio panel.",
      },
    ],
  },
  {
    id: "roles",
    title: "Quién puede hacer qué",
    blocks: [
      {
        kind: "defs",
        defs: [
          { term: "OWNER", desc: "Todo: citas, bandeja, promociones, equipo y registro de actividad. Es el rol de Wilfredo." },
          { term: "MANAGER", desc: "Citas, bandeja, promociones y sedes. No gestiona usuarios ni ve el registro de actividad." },
          { term: "FRONT_DESK", desc: "Citas y bandeja de las sedes que tenga asignadas. No crea promociones ni usuarios." },
          { term: "CONTENT_EDITOR", desc: "Crea promociones y contenido, pero no las publica y no ve datos de pacientes." },
          { term: "SUPER_ADMIN", desc: "Mantenimiento técnico. Reservado al desarrollador." },
        ],
      },
      {
        kind: "warn",
        text: "Da siempre el rol más pequeño que permita hacer el trabajo. Un rol de más no se nota hasta el día que pasa algo.",
      },
    ],
  },
  {
    id: "auditoria",
    title: "Registro de actividad",
    blocks: [
      {
        kind: "text",
        text: "Audit log guarda quién hizo qué y cuándo: cambios de estado, altas y bajas de personal, restablecimientos de contraseña y borrados. Es la respuesta a «esto quién lo cambió». No se puede editar, tampoco por ti.",
      },
    ],
  },
  {
    id: "cambios-web",
    title: "Cambiar textos, fotos o datos del sitio",
    blocks: [
      {
        kind: "text",
        text: "Desde el panel se gestiona el trabajo del día: citas, mensajes, promociones y personal. El contenido del sitio público —los textos de los servicios, las fotos, las direcciones, los teléfonos y los horarios— se cambia pidiéndoselo al desarrollador.",
      },
      {
        kind: "text",
        text: "No es una limitación por descuido. Esas páginas llevan avisos legales, horarios que tienen que coincidir con la ficha de Google y texto escrito para que los buscadores encuentren la óptica. Un editor abierto permitiría romper cualquiera de esas tres cosas sin darse cuenta, y nadie notaría el daño hasta semanas después, cuando el teléfono deja de sonar.",
      },
      {
        kind: "steps",
        items: [
          "Escribe o llama al desarrollador con el cambio concreto: qué página, qué dice ahora y qué debe decir.",
          "Para una foto, mándala al tamaño original, sin recortar ni comprimir.",
          "Si cambia un horario o un teléfono, dilo también para la ficha de Google: los dos sitios tienen que decir lo mismo.",
        ],
      },
      {
        kind: "warn",
        text: "Los horarios y los teléfonos del sitio y los de Google Business Profile tienen que coincidir carácter a carácter. Cuando no coinciden, Google se queda con los suyos y el sitio pierde posiciones en las búsquedas de la zona.",
      },
    ],
  },
];

const LEADERSHIP_EXTRA_EN: readonly GuideSection[] = [
  {
    id: "dirigir",
    title: "Running the team's follow-up",
    blocks: [
      {
        kind: "text",
        text: "The four numbers at the top are not decoration. The one that matters is Needs follow-up: it does not measure how many requests arrive, but how many are going cold. If it climbs across the week, the problem is staffing or load, not marketing.",
      },
      {
        kind: "steps",
        items: [
          "Filter by office to see where the backlog is.",
          "Check the Audit log for who moved what, and when.",
          "An office piling up untouched NEW requests usually means nobody with access to that office is on, not that nobody cares.",
        ],
      },
      {
        kind: "note",
        text: "This screen refreshes itself while you keep it open. What the front desk marks shows up here without reloading.",
      },
    ],
  },
  {
    id: "ofertas",
    title: "Creating a promotion",
    blocks: [
      {
        kind: "text",
        text: "A promotion is a popup on the site. When a visitor accepts it, they reach the appointment form with the discount already recorded, and the front desk sees exactly what was promised before calling them.",
      },
      {
        kind: "steps",
        items: [
          "Go to Offers and create a new one.",
          "Internal name: yours only, never published. It tells promotions apart in the list.",
          "Title and description, in English and Spanish. Both: the visitor sees their own language.",
          "Discount: write the EXACT text the front desk will see on the request. If it says \"20% off frames\", that is what has to be honoured.",
          "Terms: the small print. What is not written here cannot be refused later.",
          "Office: pick one, or leave it empty for all three.",
          "Publish once it has been checked.",
        ],
      },
      {
        kind: "warn",
        text: "The discount is copied onto the request at the moment the person submits it. Editing or ending the promotion afterwards does not change requests already made — they keep what was promised. That is deliberate, and it is what prevents an argument at the counter.",
      },
      {
        kind: "note",
        text: "If a promotion belongs to one office and a request arrives from another, the system saves the appointment without the discount: the offer did not apply there.",
      },
    ],
  },
  {
    id: "trends",
    title: "Trends: which months and years bring the most requests",
    blocks: [
      {
        kind: "text",
        text: "Trends answers two questions: when the work arrives, and why people come. Four figures at a glance across the top — total requests, busiest month, most requested reason and contact messages — and below them the charts, each bar carrying its count and its share.",
      },
      {
        kind: "defs",
        defs: [
          {
            term: "Requests by month",
            desc: "By default it adds up EVERY year into twelve months. That is what shows the season: if September runs high year after year, it is obvious at once. Pick a year at the top to see that one alone.",
          },
          {
            term: "Why they ask for an appointment",
            desc: "Reasons ranked highest to lowest, with the count and the share of the total. This is what tells you where to invest and what the promotions should talk about.",
          },
          {
            term: "Requests by office",
            desc: "How the chosen period splits across Camden, Philadelphia and Cherry Hill.",
          },
          {
            term: "Requests by year",
            desc: "Always the full history, unfiltered: its job is to compare one year with another.",
          },
        ],
      },
      {
        kind: "steps",
        items: [
          "The year buttons at the top scope everything below them at once.",
          "Hover a bar to see the month, the count and the percentage.",
          "Under the month chart, \"Show the numbers\" opens a table with the same data, for reading or printing.",
        ],
      },
      {
        kind: "note",
        text: "Only the tallest bar carries its figure. A number on all twelve turns the chart into noise; the rest is read on hover or in the table.",
      },
      {
        kind: "warn",
        text: "These are REQUESTS RECEIVED, not appointments kept. A month with many requests and few confirmed is not a good month: it is a month where the calls were not returned. The Needs follow-up filter in Appointments is what shows that.",
      },
    ],
  },
  {
    id: "clientes",
    title: "The client directory",
    blocks: [
      {
        kind: "text",
        text: "Clients lists everyone who has written through the site, one row per person. Someone who asked three times appears once with a 3 beside them; opening the row shows every request and message with its date, office and reason. Nothing is overwritten when a person comes back: it is added to the history.",
      },
      {
        kind: "steps",
        items: [
          "Search by name, phone or email. The phone works with or without dashes.",
          "Filter by reason and by office, together or apart: everyone who ever asked about dry eye at Camden, say. Each person's reasons show under their name, so you do not have to open them one by one.",
          "Click the name to open the full history.",
          "Print list prints exactly the list you are looking at, filter included; the print button inside a record prints that one person.",
        ],
      },
      {
        kind: "note",
        text: "The directory includes 315 requests carried over from the previous website's email, going back to September 2023. Those old records almost never carry a reason: the form of the day either did not ask, or its field was filled mostly by spam bots. They show as \"Other\" and the reason filter will not find them; their contact details are good. In 57 of them the office was not recorded either, and those are visible to leadership only — nobody at the front desk can work a request without knowing which office it is for.",
      },
      {
        kind: "note",
        text: "People are grouped by phone and email, because the form asks for no account. Two family members sharing a phone can end up as one record — you can tell on opening it, because the names in the history do not match.",
      },
      {
        kind: "text",
        text: "What the filters are for: building a targeted offer. Pull everyone who came about dry eye and offer them a follow-up check, instead of sending the same promotion to everybody; and when the promotion belongs to one office, filter by office too and call only the people it is near. Both look at the WHOLE history, not just the latest request: someone who asked about cataracts a year ago, or went to Camden once, still shows up.",
      },
      {
        kind: "warn",
        text: "Before calling or offering anything, check that person's SMS consent on their record. And remember that an offer built on a reason for visiting is health information: keep it out of an email subject line and out of a message someone could read over a shoulder.",
      },
      {
        kind: "warn",
        text: "Leadership only, and for good reason: it gathers everyone's phone, email and reason for visiting in one place. Every record opened and every directory printed is written to the activity log under your name.",
      },
    ],
  },
  {
    id: "inbox-direccion",
    title: "The inbox: archive versus delete",
    blocks: [
      {
        kind: "defs",
        defs: [
          {
            term: "Archive",
            desc: "Takes it out of the working view without destroying it. This is what you should use almost always: the inbox stays clean and the message is still there if needed.",
          },
          {
            term: "Delete",
            desc: "Leadership only. It is gone and cannot be recovered. Before it goes, the log records who deleted it, the subject and the date.",
          },
        ],
      },
      {
        kind: "warn",
        text: "If a message could matter in a complaint or a claim, archive it, do not delete it.",
      },
    ],
  },
  {
    id: "equipo",
    title: "The team: adding, offices, removing, passwords",
    blocks: [
      {
        kind: "text",
        text: "Everything is under Team. It is the most powerful screen in the panel: it decides who can see patient information.",
      },
      {
        kind: "steps",
        items: [
          "Add: email, name, starting password, role and office or offices. Give only the offices where that person actually works.",
          "Assign offices: changeable later. With no office assigned, a front desk account can sign in but sees no requests at all, and the screen says so.",
          "Remove: deactivate rather than delete. They lose access immediately and the history of what they did is kept.",
          "Forgotten password: reset it here. Hand the new one over in person or by phone, never by email or WhatsApp.",
        ],
      },
      {
        kind: "note",
        text: "The system refuses to let you deactivate yourself or remove the last owner. That is deliberate: it stops you locking yourself out of your own panel.",
      },
    ],
  },
  {
    id: "roles",
    title: "Who can do what",
    blocks: [
      {
        kind: "defs",
        defs: [
          { term: "OWNER", desc: "Everything: requests, inbox, promotions, team and activity log. This is Wilfredo's role." },
          { term: "MANAGER", desc: "Requests, inbox, promotions and offices. No user management, no activity log." },
          { term: "FRONT_DESK", desc: "Requests and inbox for assigned offices only. No promotions, no users." },
          { term: "CONTENT_EDITOR", desc: "Creates promotions and content but does not publish them, and sees no patient data." },
          { term: "SUPER_ADMIN", desc: "Technical maintenance. Reserved for the developer." },
        ],
      },
      {
        kind: "warn",
        text: "Always give the smallest role that lets the work happen. An oversized role costs nothing until the day something goes wrong.",
      },
    ],
  },
  {
    id: "auditoria",
    title: "Activity log",
    blocks: [
      {
        kind: "text",
        text: "Audit log keeps who did what and when: status changes, staff added and removed, password resets and deletions. It is the answer to \"who changed this\". It cannot be edited, not even by you.",
      },
    ],
  },
  {
    id: "cambios-web",
    title: "Changing site text, photos or details",
    blocks: [
      {
        kind: "text",
        text: "The panel runs the day's work: requests, messages, promotions and staff. The public site's content — service pages, photos, addresses, phone numbers and hours — is changed by asking the developer.",
      },
      {
        kind: "text",
        text: "That is not an oversight. Those pages carry legal notices, hours that must match the Google listing, and wording written so search engines find the practice. An open editor would let any of the three break unnoticed, and the damage would only show up weeks later, when the phone stops ringing.",
      },
      {
        kind: "steps",
        items: [
          "Call or text the developer with the specific change: which page, what it says now, what it should say.",
          "For a photo, send the original file, uncropped and uncompressed.",
          "If an hour or a phone number changes, say so for the Google listing too: both have to say the same thing.",
        ],
      },
      {
        kind: "warn",
        text: "Hours and phone numbers on the site and on the Google Business Profile have to match character for character. When they disagree, Google trusts its own and the site slips in local search.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */

function withExtra(base: GuideDoc, extra: readonly GuideSection[], title: string, intro: string): GuideDoc {
  // Las secciones de dirección van primero: lo de recepción también le
  // sirve, pero no es por donde empieza su día.
  return { title, intro, sections: [...extra, ...base.sections] };
}

const LEADERSHIP_ES = withExtra(
  FRONT_DESK_ES,
  LEADERSHIP_EXTRA_ES,
  "Manual de dirección",
  "Lo que puedes hacer en el panel y lo que conviene que no se rompa. Incluye al final todo el manual de recepción, porque dirigirlo exige saber lo que ellos ven.",
);

const LEADERSHIP_EN = withExtra(
  FRONT_DESK_EN,
  LEADERSHIP_EXTRA_EN,
  "Leadership manual",
  "What you can do in the panel, and what is worth not breaking. The full front desk manual follows at the end, because running it means knowing what they see.",
);

export function getGuide(audience: GuideAudience, lang: GuideLang): GuideDoc {
  if (audience === "LEADERSHIP") return lang === "en" ? LEADERSHIP_EN : LEADERSHIP_ES;
  return lang === "en" ? FRONT_DESK_EN : FRONT_DESK_ES;
}

/** Contacto del desarrollador, en un solo sitio. */
export const DEVELOPER_SUPPORT = {
  name: "Jorge Hidalgo",
  phone: "+1 (267) 882-7995",
  phoneE164: "+12678827995",
} as const;
