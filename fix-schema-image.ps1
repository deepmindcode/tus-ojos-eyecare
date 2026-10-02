$ErrorActionPreference = "Stop"

# fix-schema-image.ps1
# Google pide `image` (opcional) en el nodo LocalBusiness/Organization.
# Lo apuntamos al logo que ya esta publicado. No inventa archivos nuevos.

$p = "src/lib/schema.ts"
if (-not (Test-Path $p)) { Write-Host "NO ENCONTRADO: $p  (ejecuta desde la raiz del proyecto)" -ForegroundColor Red; exit 1 }

$full = (Resolve-Path $p).Path
$s = [System.IO.File]::ReadAllText($full)
$changed = $false

function Patch-Block {
  param([string]$text, [string]$fnName)

  $start = $text.IndexOf("export function $fnName")
  if ($start -lt 0) { Write-Host "  - $fnName no existe, se omite" -ForegroundColor DarkGray; return $text }

  $end = $text.IndexOf("`nexport ", $start + 10)
  if ($end -lt 0) { $end = $text.Length }
  $block = $text.Substring($start, $end - $start)

  if ($block -match "(?m)^\s*image\s*:") {
    Write-Host "  - $fnName ya tiene image" -ForegroundColor Yellow
    return $text
  }

  # Ancla: la primera linea `logo:`, y si no hay, la primera `name:`.
  $m = [regex]::Match($block, "(?m)^([ \t]*)logo\s*:.*$")
  if (-not $m.Success) { $m = [regex]::Match($block, "(?m)^([ \t]*)name\s*:.*$") }
  if (-not $m.Success) { Write-Host "  - $fnName sin ancla, se omite" -ForegroundColor Red; return $text }

  $indent = $m.Groups[1].Value
  $insertAt = $m.Index + $m.Length
  $line = "`n" + $indent + 'image: absolute("/brand/logo-lockup.png"),'

  $newBlock = $block.Insert($insertAt, $line)
  $script:changed = $true
  Write-Host "  - $fnName  image anadido" -ForegroundColor Green
  return $text.Remove($start, $end - $start).Insert($start, $newBlock)
}

Write-Host "Parcheando schema.ts" -ForegroundColor Cyan
$s = Patch-Block -text $s -fnName "organizationSchema"
$s = Patch-Block -text $s -fnName "opticianSchema"

if (-not $changed) { Write-Host "Nada que cambiar." -ForegroundColor Yellow; exit 0 }

[System.IO.File]::WriteAllText($full, $s, (New-Object System.Text.UTF8Encoding $false))
Write-Host ""
Write-Host "OK  schema.ts actualizado" -ForegroundColor Green
