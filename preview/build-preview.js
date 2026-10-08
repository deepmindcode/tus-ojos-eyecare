// preview/build-preview.js
//
// Genera preview/manzanito.html A PARTIR del componente real, para que
// la vista previa no se desvie de lo que se publica. Se ejecuta a mano:
//
//   node preview/build-preview.js
//
// No forma parte del sitio: vive fuera de src/ y de public/, asi que
// Next no lo compila ni lo sirve.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const R = path.join(ROOT, "src/components/mascot") + "/";

const css = fs.readFileSync(R + "manzanito.tsx", "utf8").match(/const CSS = `([\s\S]*?)`;/)[1];

let fig = fs.readFileSync(R + "manzanito-figure.tsx", "utf8");
fig = fig.slice(fig.indexOf("<svg"), fig.lastIndexOf("</svg>") + 6)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/aria-label=\{title\}/, 'aria-label="Manzanito, la mascota de Tus Ojos Eyecare"')
  .replace(/className=/g, "class=")
  // JSX usa camelCase para los atributos SVG y el HTML no. Sin esta
  // conversion los degradados se quedan sin color y la figura sale
  // negra: paso exactamente eso la primera vez.
  .replace(/\b(strokeWidth|strokeLinecap|strokeLinejoin|stopColor|strokeOpacity|fillOpacity|strokeDasharray|clipPath|transformOrigin|gradientUnits)=/g,
    (m) => m.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()))
  .replace(/\n\s*\n/g, "\n");

const page = `<title>Manzanito</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Source+Sans+3:wght@400;600;700&display=swap">
<style>
:root{
  --purple:#800080;--purple-deep:#6b006b;--purple-tint:#f6e8f6;
  --teal:#008080;--teal-deep:#005f5f;--teal-tint:#e3f0f0;
  --bg:#eef1f0;--surface:#fff;--ink:#1d2422;--ink-soft:#55605d;--line:#dde4e2;--stage:#f7f9f8;
  --display:"Bricolage Grotesque","Trebuchet MS",sans-serif;
  --body:"Source Sans 3",system-ui,-apple-system,sans-serif;
  /* los nombres que usa el CSS real del componente */
  --color-surface:#fff;--color-text-primary:#1d2422;--color-text-secondary:#55605d;
  --color-brand-primary:#800080;--color-brand-primary-deep:#6b006b;--color-brand-primary-tint:#f6e8f6;
  --color-brand-secondary-deep:#005f5f;--color-brand-secondary-tint:#e3f0f0;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --purple:#d98ad9;--purple-deep:#eab4ea;--purple-tint:#2e1a2e;
  --teal:#5fc2c2;--teal-deep:#8ad8d8;--teal-tint:#142a2a;
  --bg:#141a19;--surface:#1e2726;--ink:#eef3f1;--ink-soft:#a3b0ad;--line:#2c3837;--stage:#192120;
  --color-surface:#1e2726;--color-text-primary:#eef3f1;--color-text-secondary:#a3b0ad;
  --color-brand-primary:#d98ad9;--color-brand-primary-deep:#eab4ea;--color-brand-primary-tint:#2e1a2e;
  --color-brand-secondary-deep:#8ad8d8;--color-brand-secondary-tint:#142a2a;
  color-scheme:dark}}
:root[data-theme="dark"]{
  --purple:#d98ad9;--purple-deep:#eab4ea;--purple-tint:#2e1a2e;
  --teal:#5fc2c2;--teal-deep:#8ad8d8;--teal-tint:#142a2a;
  --bg:#141a19;--surface:#1e2726;--ink:#eef3f1;--ink-soft:#a3b0ad;--line:#2c3837;--stage:#192120;
  --color-surface:#1e2726;--color-text-primary:#eef3f1;--color-text-secondary:#a3b0ad;
  --color-brand-primary:#d98ad9;--color-brand-primary-deep:#eab4ea;--color-brand-primary-tint:#2e1a2e;
  --color-brand-secondary-deep:#8ad8d8;--color-brand-secondary-tint:#142a2a;
  color-scheme:dark}

body{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:16px;line-height:1.55;
 padding-inline:16px;padding-block:28px 56px}
.wrap{max-width:760px;margin-inline:auto;display:grid;gap:22px}
h1{font-family:var(--display);font-weight:800;font-size:clamp(1.7rem,5vw,2.4rem);letter-spacing:-.02em;
 line-height:1.1;margin:0;color:var(--purple);text-wrap:balance}
.lede{margin:0;color:var(--ink-soft);max-width:62ch}
.stage{position:relative;height:330px;border:1px solid var(--line);border-radius:18px;
 background:var(--stage);overflow:hidden}
.stage::after{content:"";position:absolute;inset-inline:0;bottom:14px;border-bottom:2px dashed var(--line)}
.stage-tag{position:absolute;top:12px;left:14px;font-size:.72rem;font-weight:700;letter-spacing:.08em;
 text-transform:uppercase;color:var(--ink-soft)}

/* ---- CSS REAL del componente, copiado tal cual al generar ---- */
${css}
/* ---- sólo para la vista previa: dentro del escenario, no en la ventana ---- */
.stage .mz{position:absolute;bottom:14px;z-index:1}
@media (max-width:640px){.stage .mz{bottom:14px}}

.panel{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:14px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.row>.label{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
 color:var(--ink-soft);min-width:74px}
button.ctl{min-height:40px;padding-inline:15px;background:var(--surface);color:var(--ink);
 border:2px solid var(--line);border-radius:999px;font:700 .85rem/1 var(--body);cursor:pointer}
button.ctl:hover{border-color:var(--teal)}
button.ctl[aria-pressed="true"]{background:var(--teal);border-color:var(--teal);color:#fff}
button.ctl.go{background:var(--purple);border-color:var(--purple);color:#fff}
:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
.notes{display:grid;gap:14px}
.note{border-left:3px solid var(--teal);background:var(--teal-tint);border-radius:0 12px 12px 0;padding:12px 14px}
.note h2{font-family:var(--display);font-weight:800;font-size:.95rem;margin:0 0 6px;color:var(--teal-deep)}
.note ul{margin:0;padding-left:18px}
.note li{margin-block:3px;font-size:.92rem}
</style>

<div class="wrap">
  <header>
    <h1>Manzanito</h1>
    <p class="lede">Un ojo con bata de óptico. Sale caminando por un lado al azar, saluda
    y propone pedir cita; si hay una oferta activa, la anuncia él. Dibujado con código:
    no descarga nada y no frena la página.</p>
  </header>

  <div class="stage">
    <span class="stage-tag">Vista previa</span>
    <div id="mz" class="mz mz-left">
      <div class="mz-bubble">
        <button class="mz-x" type="button" data-shut aria-label="Cerrar">&#10005;</button>
        <p class="mz-say" data-say></p>
        <p class="mz-deal" data-deal hidden></p>
        <a class="mz-cta" href="#" data-cta></a>
      </div>
      ${fig}
    </div>
  </div>

  <div class="panel">
    <div class="row"><span class="label">Probar</span>
      <button class="ctl go" type="button" data-run>Que salga</button>
      <button class="ctl" type="button" data-side="left" aria-pressed="false">Por la izquierda</button>
      <button class="ctl" type="button" data-side="right" aria-pressed="false">Por la derecha</button>
      <button class="ctl" type="button" data-side="random" aria-pressed="true">Al azar</button>
    </div>
    <div class="row"><span class="label">Idioma</span>
      <button class="ctl" type="button" data-lang="es" aria-pressed="true">Español</button>
      <button class="ctl" type="button" data-lang="en" aria-pressed="false">English</button>
    </div>
    <div class="row"><span class="label">Oferta</span>
      <button class="ctl" type="button" data-deal="0" aria-pressed="true">Sin oferta activa</button>
      <button class="ctl" type="button" data-deal="1" aria-pressed="false">Con oferta activa</button>
    </div>
  </div>

  <div class="notes">
    <div class="note">
      <h2>Quién lo enciende</h2>
      <ul>
        <li>En el panel, en <b>Offers</b>, hay un interruptor. Sólo Wilfredo y el super admin lo ven.</li>
        <li>Llega <b>apagado</b>. Hasta que se encienda, en la web no cambia nada.</li>
        <li>Encendido, es Manzanito quien anuncia las ofertas y la ventana emergente de promoción no sale: dos tarjetas a la vez no caben en un teléfono.</li>
        <li>Apagado, la ventana de promoción vuelve a funcionar como hasta ahora.</li>
      </ul>
    </div>
    <div class="note">
      <h2>Cómo se comporta</h2>
      <ul>
        <li>Habla en el <b>idioma de la página</b>: español en /es, inglés en el resto.</li>
        <li>Sale <b>una vez al día</b> por visitante. Si lo cierra, ese día no vuelve.</li>
        <li><b>Nunca</b> en las páginas legales, en el formulario de cita ni en el panel.</li>
        <li>Espera si el aviso de cookies está en pantalla.</li>
        <li>Con «reducir movimiento» activado, aparece sin caminar.</li>
        <li><b>~3 KB</b>, cero descargas nuevas, y se mueve con la tarjeta gráfica.</li>
      </ul>
    </div>
  </div>
</div>

<script>
(function(){
  var el=document.getElementById("mz");
  var say=el.querySelector("[data-say]"), deal=el.querySelector("[data-deal]"), cta=el.querySelector("[data-cta]");
  var mode="random", lang="es", withDeal=false, timers=[];
  var COPY={
    es:{hello:"¡Hola! Soy Manzanito. ¿Hace cuánto que no te revisas la vista?",
        offer:"¡Hola! Soy Manzanito y traigo una oferta para ti:",
        deal:"20% de descuento en examen de la vista",cta:"Pedir cita"},
    en:{hello:"Hi! I'm Manzanito. When did you last get your eyes checked?",
        offer:"Hi! I'm Manzanito, and I have an offer for you:",
        deal:"20% off your eye exam",cta:"Book an appointment"}
  };
  var calm=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function clear(){timers.forEach(clearTimeout);timers=[]}
  function paint(){
    var c=COPY[lang];
    say.textContent=withDeal?c.offer:c.hello;
    deal.textContent=c.deal; deal.hidden=!withDeal;
    cta.textContent=c.cta;
  }
  function run(){
    clear(); el.className="mz"; void el.offsetWidth;
    var side=mode==="random"?(Math.random()<0.5?"left":"right"):mode;
    el.classList.add("mz-"+side); void el.offsetWidth;
    if(calm){el.classList.add("mz-talking");return}
    el.classList.add("mz-walking");
    timers.push(setTimeout(function(){el.classList.remove("mz-walking");el.classList.add("mz-talking")},2100));
  }
  function group(attr,fn){
    document.querySelectorAll("["+attr+"]").forEach(function(b){
      b.addEventListener("click",function(){
        document.querySelectorAll("["+attr+"]").forEach(function(o){o.setAttribute("aria-pressed",String(o===b))});
        fn(b.getAttribute(attr));
      });
    });
  }
  document.querySelector("[data-run]").addEventListener("click",run);
  el.querySelector("[data-shut]").addEventListener("click",function(){
    clear(); el.classList.remove("mz-talking");
  });
  cta.addEventListener("click",function(e){e.preventDefault()});
  group("data-side",function(v){mode=v;run()});
  group("data-lang",function(v){lang=v;paint()});
  group("data-deal",function(v){withDeal=v==="1";paint();run()});
  paint(); timers.push(setTimeout(run,400));
})();
</script>
`;

fs.writeFileSync(path.join(ROOT, "preview/manzanito.html"), page);
console.log("preview regenerada,", page.length, "bytes");
