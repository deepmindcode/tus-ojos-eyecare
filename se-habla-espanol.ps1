$ErrorActionPreference = "Stop"

# se-habla-espanol.ps1
# 1) Distintivo visible en el cierre de cada pagina de contenido.
# 2) knowsLanguage en el schema: es lo que lee un asistente de IA cuando
#    alguien pregunta por una optica donde lo atiendan en espanol.

# ------------------------------------------------------------ schema.ts
$p1 = "src/lib/schema.ts"
if (-not (Test-Path $p1)) { Write-Host "NO ENCONTRADO: $p1" -ForegroundColor Red; exit 1 }
$f1 = (Resolve-Path $p1).Path
$s1 = [System.IO.File]::ReadAllText($f1)
$ch1 = $false

function Add-Prop {
  param([string]$text, [string]$fnName, [string]$line)

  $start = $text.IndexOf("export function $fnName")
  if ($start -lt 0) { Write-Host "  - $fnName no existe" -ForegroundColor DarkGray; return $text }

  $end = $text.IndexOf("`nexport ", $start + 10)
  if ($end -lt 0) { $end = $text.Length }
  $block = $text.Substring($start, $end - $start)

  if ($block -match "(?m)^\s*knowsLanguage\s*:") { Write-Host "  - $fnName ya lo tiene" -ForegroundColor Yellow; return $text }

  $m = [regex]::Match($block, "(?m)^([ \t]*)name\s*:.*$")
  if (-not $m.Success) { Write-Host "  - $fnName sin ancla" -ForegroundColor Red; return $text }

  $indent = $m.Groups[1].Value
  $newBlock = $block.Insert($m.Index + $m.Length, "`n" + $indent + $line)
  $script:ch1 = $true
  Write-Host "  - $fnName  knowsLanguage anadido" -ForegroundColor Green
  return $text.Remove($start, $end - $start).Insert($start, $newBlock)
}

Write-Host "schema.ts" -ForegroundColor Cyan
$prop = 'knowsLanguage: ["es-US", "en-US"],'
$s1 = Add-Prop -text $s1 -fnName "organizationSchema" -line $prop
$s1 = Add-Prop -text $s1 -fnName "opticianSchema" -line $prop

if ($ch1) {
  [System.IO.File]::WriteAllText($f1, $s1, (New-Object System.Text.UTF8Encoding $false))
}

# -------------------------------------------------- content-page.tsx
$p2 = "src/components/content/content-page.tsx"
if (-not (Test-Path $p2)) { Write-Host "NO ENCONTRADO: $p2" -ForegroundColor Red; exit 1 }
$f2 = (Resolve-Path $p2).Path
$s2 = [System.IO.File]::ReadAllText($f2)

Write-Host ""
Write-Host "content-page.tsx" -ForegroundColor Cyan

if ($s2 -match "Se habla") {
  Write-Host "  - ya aplicado" -ForegroundColor Yellow
} else {
  $anchor = "        <Link" + [char]10 + '          href="/appointment"'
  if ($s2.IndexOf($anchor) -lt 0) { Write-Host "  - ancla no encontrada" -ForegroundColor Red; exit 1 }

  $badge = @'
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-[0.85rem] font-bold text-brand-secondary-deep">
          {isES
            ? "Se habla español · atención en español e inglés"
            : "Se habla español · we serve patients in Spanish and English"}
        </p>

'@
  $s2 = $s2.Insert($s2.IndexOf($anchor), $badge)
  [System.IO.File]::WriteAllText($f2, $s2, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "  - distintivo anadido" -ForegroundColor Green
}

Write-Host ""
Write-Host "Listo." -ForegroundColor Cyan
