/* public/sw.js
 *
 * Service worker del PANEL. Hace dos cosas y nada más:
 *
 *   1. Recibe los avisos push y los muestra.
 *   2. Al tocar el aviso, abre el panel — y si ya está abierto, trae esa
 *      ventana al frente en vez de abrir otra.
 *
 * Lo que NO hace, a propósito: guardar páginas en caché. Esto es un panel
 * con datos de pacientes que cambian cada minuto; una copia guardada en el
 * teléfono sería a la vez información clínica en reposo y una lista de
 * citas desactualizada que alguien podría leer como si fuera la de hoy.
 * Sin conexión, el panel no funciona. Es la respuesta correcta.
 *
 * Por la misma razón el aviso NO lleva el nombre del paciente ni el motivo
 * de consulta: un aviso se lee en la pantalla bloqueada, a veces con
 * alguien al lado. Dice que hay algo que atender y en qué oficina.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Tus Ojos";
  const options = {
    body: data.body || "There is something new in the panel.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Mismo tag: si entran tres citas seguidas no se apilan tres avisos,
    // se actualiza el mismo. renotify hace que el último vibre igual.
    tag: data.tag || "tusojos-admin",
    renotify: true,
    data: { url: data.url || "/admin" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
