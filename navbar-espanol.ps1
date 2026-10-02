$ErrorActionPreference = "Stop"

# navbar-espanol.ps1
# Franja fija arriba de la cabecera. Sale en todas las paginas, en los dos
# idiomas, y es lo primero que busca mucha gente de la zona.

$p = "src/components/layout/navbar.tsx"
if (-not (Test-Path $p)) { Write-Host "NO ENCONTRADO: $p" -ForegroundColor Red; exit 1 }
$f = (Resolve-Path $p).Path
$s = [System.IO.File]::ReadAllText($f)

if ($s -match "Se habla") { Write-Host "Ya aplicado." -ForegroundColor Yellow; exit 0 }

# 1. useLocale
$a1 = 'import { useTranslations } from "next-intl";'
if ($s.IndexOf($a1) -lt 0) { Write-Host "Ancla 1 no encontrada" -ForegroundColor Red; exit 1 }
$s = $s.Replace($a1, 'import { useLocale, useTranslations } from "next-intl";')

# 2. isES
$a2 = '  const tc = useTranslations("common");'
if ($s.IndexOf($a2) -lt 0) { Write-Host "Ancla 2 no encontrada" -ForegroundColor Red; exit 1 }
$s = $s.Insert($s.IndexOf($a2) + $a2.Length, "`n" + '  const isES = useLocale() === "es";')

# 3. la franja
$a3 = '        <div className="mx-auto flex w-[92%] max-w-[1200px] items-center justify-between gap-5 py-3">'
if ($s.IndexOf($a3) -lt 0) { Write-Host "Ancla 3 no encontrada" -ForegroundColor Red; exit 1 }

$bar = @'
        {/* El idioma es el primer filtro de mucha gente de la zona.
            En la cabecera sale en todas las paginas sin tener que buscarlo. */}
        <div className="bg-brand-secondary-deep text-white">
          <p className="mx-auto w-[92%] max-w-[1200px] py-1.5 text-center text-[0.8rem] font-semibold">
            {isES
              ? "Se habla español · atención en español e inglés"
              : "Se habla español · we serve patients in Spanish and English"}
          </p>
        </div>

'@
$s = $s.Insert($s.IndexOf($a3), $bar)

[System.IO.File]::WriteAllText($f, $s, (New-Object System.Text.UTF8Encoding $false))
Write-Host "OK  franja anadida a navbar.tsx" -ForegroundColor Green
