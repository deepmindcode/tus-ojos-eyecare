$ErrorActionPreference = "Stop"

# fix-service-inlanguage.ps1
# Quita `inLanguage` de serviceSchema. Schema.org no define esa propiedad
# en Service (si en Article), y es el unico WARNING que reporta el validador.
# Solo toca el bloque de serviceSchema: articleSchema conserva su inLanguage.

$p = "src/lib/schema.ts"
if (-not (Test-Path $p)) { Write-Host "NO ENCONTRADO: $p  (ejecuta desde la raiz del proyecto)" -ForegroundColor Red; exit 1 }

$s = [System.IO.File]::ReadAllText((Resolve-Path $p))

$start = $s.IndexOf("export function serviceSchema")
if ($start -lt 0) { Write-Host "No existe serviceSchema en schema.ts" -ForegroundColor Red; exit 1 }

# Fin del bloque: el siguiente `export ` despues de serviceSchema, o el final.
$end = $s.IndexOf("`nexport ", $start + 10)
if ($end -lt 0) { $end = $s.Length }

$block = $s.Substring($start, $end - $start)

$needle = "inLanguage: opts.locale"
$i = $block.IndexOf($needle)
if ($i -lt 0) {
  Write-Host "Ya aplicado: serviceSchema no tiene inLanguage." -ForegroundColor Yellow
  exit 0
}

# Recorta la linea completa, incluido su salto de linea.
$lineStart = $block.LastIndexOf("`n", $i)
$lineEnd   = $block.IndexOf("`n", $i)
if ($lineEnd -lt 0) { $lineEnd = $block.Length } 
$newBlock = $block.Remove($lineStart, $lineEnd - $lineStart)

$s = $s.Remove($start, $end - $start).Insert($start, $newBlock)

[System.IO.File]::WriteAllText((Resolve-Path $p), $s, (New-Object System.Text.UTF8Encoding $false))
Write-Host "OK  inLanguage eliminado de serviceSchema" -ForegroundColor Green
Write-Host ""
Write-Host "Linea quitada:" -ForegroundColor Cyan
Write-Host ("  " + $block.Substring($lineStart, $lineEnd - $lineStart).Trim())
