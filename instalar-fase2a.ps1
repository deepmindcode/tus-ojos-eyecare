# =====================================================================
#  TUS OJOS EYECARE - Instalador FASE 2A (armazon del sitio)
#
#  Navbar, footer, panel de accesibilidad, CTA movil y selector de idioma.
#
#  Uso desde la carpeta "PROYECTO TUS OJOS":
#     .\instalar-fase2a.ps1
# =====================================================================

param(
  [string]$Origen   = ".",
  [string]$Proyecto = ".\tus-ojos-eyecare"
)

$ErrorActionPreference = "Stop"

function Write-Paso { param($m) Write-Host "`n== $m" -ForegroundColor Cyan }
function Write-Ok   { param($m) Write-Host "   OK    $m" -ForegroundColor Green }
function Write-Falta{ param($m) Write-Host "   FALTA $m" -ForegroundColor Yellow }

Write-Paso "Comprobando rutas"
if (-not (Test-Path (Join-Path $Proyecto "package.json"))) {
  Write-Host "No encuentro el proyecto en $Proyecto" -ForegroundColor Red
  exit 1
}
$Origen   = (Resolve-Path $Origen).Path
$Proyecto = (Resolve-Path $Proyecto).Path
Write-Ok "Origen:   $Origen"
Write-Ok "Proyecto: $Proyecto"

Write-Paso "Creando carpetas"
$carpetas = @(
  "src\components\brand",
  "src\components\layout",
  "src\components\accessibility",
  "src\components\locations"
)
foreach ($c in $carpetas) {
  $r = Join-Path $Proyecto $c
  if (-not (Test-Path $r)) { New-Item -ItemType Directory -Path $r -Force | Out-Null }
}
Write-Ok "$($carpetas.Count) carpetas listas"

Write-Paso "Copiando archivos"
$mapa = [ordered]@{
  "navigation-config.ts"     = "src\config\navigation.ts"
  "logo.tsx"                 = "src\components\brand\logo.tsx"
  "language-switcher.tsx"    = "src\components\layout\language-switcher.tsx"
  "utility-bar.tsx"          = "src\components\layout\utility-bar.tsx"
  "navbar.tsx"               = "src\components\layout\navbar.tsx"
  "footer.tsx"               = "src\components\layout\footer.tsx"
  "mobile-cta.tsx"           = "src\components\layout\mobile-cta.tsx"
  "accessibility-panel.tsx"  = "src\components\accessibility\accessibility-panel.tsx"
  "globals.css"              = "src\app\globals.css"
  "routing.ts"               = "src\i18n\routing.ts"
  "messages-en.json"         = "messages\en.json"
  "messages-es.json"         = "messages\es.json"
  "layout-site.tsx"          = "src\app\(site)\[locale]\layout.tsx"
  "page-site.tsx"            = "src\app\(site)\[locale]\page.tsx"
}

$copiados = 0
$faltantes = @()
foreach ($a in $mapa.Keys) {
  $src = Join-Path $Origen $a
  if (Test-Path $src) {
    $dst = Join-Path $Proyecto $mapa[$a]
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item -Path $src -Destination $dst -Force
    Write-Ok $mapa[$a]
    $copiados++
  } else {
    Write-Falta $a
    $faltantes += $a
  }
}

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host " $copiados archivos instalados" -ForegroundColor Cyan
if ($faltantes.Count -gt 0) {
  Write-Host " $($faltantes.Count) sin encontrar:" -ForegroundColor Yellow
  $faltantes | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
}

Write-Host @"

 SIGUIENTE PASO:

   cd "$Proyecto"
   Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
   npm run dev

"@ -ForegroundColor White
