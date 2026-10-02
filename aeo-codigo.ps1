$ErrorActionPreference = "Stop"

# aeo-codigo.ps1
# 1) `answer` en el frontmatter -> ContentPage
# 2) La pagina saca el H1 del cuerpo y pone la respuesta directa justo
#    debajo, antes del contexto. Ese orden es el que lee un motor de
#    respuestas cuando decide a quien citar.

function Save-Utf8 {
  param([string]$Path, [string]$Text)
  [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding $false))
}

# ---------------------------------------------------------------- content.ts
$p1 = "src/lib/content.ts"
if (-not (Test-Path $p1)) { Write-Host "NO ENCONTRADO: $p1" -ForegroundColor Red; exit 1 }
$f1 = (Resolve-Path $p1).Path
$s1 = [System.IO.File]::ReadAllText($f1)

if ($s1 -match "readonly answer") {
  Write-Host "content.ts ya tiene answer" -ForegroundColor Yellow
} else {
  $a = "  readonly description: string;"
  if ($s1.IndexOf($a) -lt 0) { Write-Host "Ancla 1 no encontrada en content.ts" -ForegroundColor Red; exit 1 }
  $add1 = @'

  /** Respuesta directa de 2-3 frases. Es lo que cita un motor de respuestas. */
  readonly answer: string;
'@
  $s1 = $s1.Insert($s1.IndexOf($a) + $a.Length, $add1)

  $b = '          description: typeof data.description === "string" ? data.description : "",'
  if ($s1.IndexOf($b) -lt 0) { Write-Host "Ancla 2 no encontrada en content.ts" -ForegroundColor Red; exit 1 }
  $add2 = "`n" + '          answer: typeof data.answer === "string" ? data.answer : "",'
  $s1 = $s1.Insert($s1.IndexOf($b) + $b.Length, $add2)

  Save-Utf8 -Path $f1 -Text $s1
  Write-Host "OK  content.ts" -ForegroundColor Green
}

# ------------------------------------------------------- content-page.tsx
$p2 = "src/components/content/content-page.tsx"
if (-not (Test-Path $p2)) { Write-Host "NO ENCONTRADO: $p2" -ForegroundColor Red; exit 1 }
$f2 = (Resolve-Path $p2).Path
$s2 = [System.IO.File]::ReadAllText($f2)

if ($s2 -match "content\.answer") {
  Write-Host "content-page.tsx ya aplicado" -ForegroundColor Yellow
} else {
  $c = '  const isES = locale === "es";'
  if ($s2.IndexOf($c) -lt 0) { Write-Host "Ancla 3 no encontrada" -ForegroundColor Red; exit 1 }
  $add3 = @'


  // El H1 sale del cuerpo para poder colocar la respuesta directa justo
  // debajo. Titulo -> respuesta -> contexto: ese es el orden que extrae
  // un motor de respuestas, y el que lee comodo una persona con prisa.
  const h1 = /^#[ \t]+(.+)$/m.exec(content.body);
  const heading = h1?.[1]?.trim() ?? "";
  const rest = h1 ? content.body.slice(h1.index + h1[0].length) : content.body;
'@
  $s2 = $s2.Insert($s2.IndexOf($c) + $c.Length, $add3)

  $d = '      <div className="[&>*:first-child]:mt-0">'
  if ($s2.IndexOf($d) -lt 0) { Write-Host "Ancla 4 no encontrada" -ForegroundColor Red; exit 1 }
  $repl = @'
      {heading && (
        <h1 className="mt-0 font-display text-3xl font-extrabold leading-tight tracking-tight text-brand-primary sm:text-4xl">
          {heading}
        </h1>
      )}

      {content.answer && (
        <p className="mt-5 border-l-4 border-brand-secondary bg-brand-primary-tint px-5 py-4 text-[1.125rem] font-medium leading-relaxed text-text-primary">
          {content.answer}
        </p>
      )}

      <div className={heading ? "" : "[&>*:first-child]:mt-0"}>
'@
  $s2 = $s2.Replace($d, $repl)

  $e = "          {content.body}"
  if ($s2.IndexOf($e) -lt 0) { Write-Host "Ancla 5 no encontrada" -ForegroundColor Red; exit 1 }
  $s2 = $s2.Replace($e, "          {rest}")

  Save-Utf8 -Path $f2 -Text $s2
  Write-Host "OK  content-page.tsx" -ForegroundColor Green
}

Write-Host ""
Write-Host "Listo. Ahora falta el texto de las respuestas." -ForegroundColor Cyan
