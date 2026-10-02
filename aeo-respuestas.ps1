$ErrorActionPreference = "Stop"

# aeo-respuestas.ps1
# Mete `answer:` en el frontmatter de cada pagina: 2-3 frases que responden
# la pregunta del titulo antes de dar contexto. Es el bloque que un motor
# de respuestas extrae y cita.

function Add-Answer {
  param([string]$rel, [string]$ans)

  if (-not (Test-Path $rel)) { Write-Host "  FALTA    $rel" -ForegroundColor Red; return }
  $f = (Resolve-Path $rel).Path
  $s = [System.IO.File]::ReadAllText($f)

  $end = $s.IndexOf("`n---", 3)
  if (-not $s.StartsWith("---") -or $end -lt 0) { Write-Host "  SIN FM   $rel" -ForegroundColor Red; return }

  $head = $s.Substring(0, $end)
  if ($head -match "(?m)^answer\s*:") { Write-Host "  ya tiene $rel" -ForegroundColor Yellow; return }

  $m = [regex]::Match($head, "(?m)^description\s*:.*$")
  if (-not $m.Success) { Write-Host "  SIN DESC $rel" -ForegroundColor Red; return }

  $s = $s.Insert($m.Index + $m.Length, "`nanswer: `"$ans`"")
  [System.IO.File]::WriteAllText($f, $s, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "  ok       $rel" -ForegroundColor Green
}

Write-Host "Respuestas directas (AEO)" -ForegroundColor Cyan
Write-Host ""

Add-Answer 'content/services/advanced-diagnostic-testing.es.md' 'Las pruebas diagnósticas avanzadas son estudios de imagen y de campo visual que muestran el interior del ojo con un detalle que un examen de rutina no alcanza. Sirven para detectar glaucoma, degeneración macular o daño por diabetes antes de que usted note síntomas. Se realizan en nuestras sedes con cita previa.'
Add-Answer 'content/services/childrens-eye-exams.es.md' 'El examen de la vista para niños evalúa si los dos ojos trabajan juntos, si enfocan bien de cerca y de lejos, y si hay ojo perezoso o estrabismo. No hace falta que el niño sepa leer. Se recomienda el primer examen completo antes de empezar la escuela y después una vez al año.'
Add-Answer 'content/services/comprehensive-eye-exams.es.md' 'El examen general de la vista mide cuánto ve usted y además revisa la salud del ojo por dentro: retina, nervio óptico y presión ocular. Dura entre 30 y 45 minutos y termina con su graduación actualizada si la necesita. Se atiende con cita previa en nuestras tres sedes.'
Add-Answer 'content/services/contact-lenses.es.md' 'Adaptar lentes de contacto no es lo mismo que graduar lentes de armazón: hay que medir la curvatura de la córnea y comprobar que el ojo los tolera. Por eso la receta de contacto es aparte y lleva su propia cita. Trabajamos lentes blandos, tóricos para astigmatismo y multifocales.'
Add-Answer 'content/services/diabetic-eye-care.es.md' 'La diabetes puede dañar los vasos de la retina durante años sin dar ningún síntoma, y cuando la vista falla el daño ya está hecho. Por eso toda persona con diabetes necesita un examen de retina dilatado cada año, aunque vea bien. Enviamos el resultado a su médico si usted lo autoriza.'
Add-Answer 'content/services/dry-eye.es.md' 'La evaluación de ojo seco mide cuánta lágrima produce el ojo y si esa lágrima se evapora demasiado rápido. No todos los casos se tratan igual: unos necesitan lubricación y otros tratar el borde del párpado. La evaluación se hace con cita previa y define cuál es su caso.'
Add-Answer 'content/services/keratoconus-and-specialty-lenses.es.md' 'El queratocono deforma la córnea y hace que los lentes comunes dejen de corregir bien la visión. Los lentes esclerales y tricurvos apoyan sobre la parte blanca del ojo y crean una superficie regular, lo que suele devolver nitidez. La adaptación requiere varias medidas y citas de control.'
Add-Answer 'content/services/ophthalmology-and-surgery.es.md' 'Sí, atendemos consultas de cataratas, retinopatía diabética, glaucoma y párpado caído, siempre con cita previa. La evaluación se hace en nuestras sedes y el procedimiento, si hace falta, lo realiza un médico con licencia. En la consulta se le explica qué se encontró y cuáles son las opciones.'
Add-Answer 'content/services/optical-and-frames.es.md' 'Somos distribuidores autorizados de Cartier y trabajamos además Ray-Ban, Oakley, Prada, Miu Miu, Yves Saint Laurent y Nike. Montamos su graduación en el armazón que elija, con lentes monofocales, progresivos o de alto índice. Puede traer su receta de otro lugar o hacerse el examen aquí.'
Add-Answer 'content/services/prescription-sunglasses.es.md' 'Los lentes de sol graduados llevan su receta montada en un lente que bloquea los rayos UVA y UVB. Los hacemos polarizados para manejar, en armazones Ray-Ban, Oakley, Prada, Cartier y otros. Si ya tiene una receta vigente puede traerla.'
Add-Answer 'content/services/red-eye-and-irritation.es.md' 'El ojo rojo casi nunca es grave, pero conviene saber de qué tipo es: alergia, infección, ojo seco o un cuerpo extraño se ven parecidos y se tratan distinto. Si hay dolor fuerte, pérdida de visión o sensibilidad a la luz, debe verse el mismo día. Atendemos irritación ocular con cita previa.'
Add-Answer 'content/services/advanced-diagnostic-testing.en.md' 'Advanced diagnostic testing uses imaging and visual field studies to see inside the eye in a detail a routine exam cannot reach. It finds glaucoma, macular degeneration and diabetic damage before you notice any symptom. Testing is done at our offices by appointment.'
Add-Answer 'content/services/childrens-eye-exams.en.md' 'An eye exam for children checks whether both eyes work together, focus well near and far, and whether there is lazy eye or crossed eyes. Your child does not need to know how to read. The first full exam should happen before school starts, and once a year after that.'
Add-Answer 'content/services/comprehensive-eye-exams.en.md' 'A comprehensive eye exam measures how well you see and also checks the health of the eye itself: retina, optic nerve and eye pressure. It takes 30 to 45 minutes and ends with an updated prescription if you need one. Available by appointment at all three offices.'
Add-Answer 'content/services/contact-lenses.en.md' 'Fitting contact lenses is not the same as prescribing glasses: the curvature of the cornea has to be measured and the eye checked for tolerance. That is why a contact lens prescription is separate and needs its own visit. We fit soft, toric for astigmatism and multifocal lenses.'
Add-Answer 'content/services/diabetic-eye-care.en.md' 'Diabetes can damage the blood vessels of the retina for years without any symptom, and by the time vision changes the damage is already done. That is why everyone with diabetes needs a dilated retinal exam every year, even with good vision. We send results to your physician if you authorize it.'
Add-Answer 'content/services/dry-eye.en.md' 'A dry eye evaluation measures how much tear the eye produces and whether that tear evaporates too quickly. Not every case is treated the same way: some need lubrication, others need the eyelid margin treated. The evaluation is by appointment and determines which kind you have.'
Add-Answer 'content/services/keratoconus-and-specialty-lenses.en.md' 'Keratoconus reshapes the cornea so ordinary lenses stop correcting vision well. Scleral and tricurve lenses rest on the white of the eye and create a regular surface, which usually restores sharpness. Fitting takes several measurements and follow-up visits.'
Add-Answer 'content/services/ophthalmology-and-surgery.en.md' 'Yes, we see cataract, diabetic retinopathy, glaucoma and droopy eyelid consultations, always by appointment. The evaluation happens at our offices and the procedure, if one is needed, is performed by a licensed physician. The visit explains what was found and what the options are.'
Add-Answer 'content/services/optical-and-frames.en.md' 'We are authorized Cartier dealers and also carry Ray-Ban, Oakley, Prada, Miu Miu, Yves Saint Laurent and Nike. We mount your prescription in the frame you choose, with single vision, progressive or high index lenses. Bring a prescription from elsewhere or have your exam here.'
Add-Answer 'content/services/prescription-sunglasses.en.md' 'Prescription sunglasses put your correction into a lens that blocks UVA and UVB rays. We make them polarized for driving, in Ray-Ban, Oakley, Prada, Cartier and other frames. If your prescription is current you can bring it in.'
Add-Answer 'content/services/red-eye-and-irritation.en.md' 'A red eye is rarely serious, but it matters which kind it is: allergy, infection, dry eye and a foreign body look alike and are treated differently. Severe pain, vision loss or light sensitivity should be seen the same day. We see eye irritation by appointment.'
Add-Answer 'content/eye-health/childrens-vision-signs.es.md' 'Un niño que no ve bien rara vez lo dice. Las señales son acercarse mucho al papel o a la pantalla, entrecerrar los ojos, taparse un ojo para ver, dolores de cabeza al final del día y bajar el rendimiento en la escuela. Cualquiera de ellas es motivo suficiente para un examen.'
Add-Answer 'content/eye-health/diabetes-and-vision.es.md' 'La diabetes afecta la vista dañando los vasos sanguíneos de la retina, y lo hace sin dolor y sin aviso. La visión borrosa que aparece y desaparece suele deberse a cambios de azúcar en sangre; la pérdida permanente llega cuando la retinopatía ya está avanzada. Un examen dilatado cada año es lo que la detecta a tiempo.'
Add-Answer 'content/eye-health/dry-eye.es.md' 'El ojo seco da ardor, sensación de arena, visión que se aclara al parpadear y, curiosamente, lagrimeo. Ocurre cuando el ojo no produce lágrima suficiente o cuando la que produce se evapora muy rápido por las glándulas del párpado. Las lágrimas artificiales alivian, pero no corrigen la causa.'
Add-Answer 'content/eye-health/eye-exam-frequency.es.md' 'Un adulto sano y sin síntomas debería examinarse la vista cada uno o dos años. Cada año si usa lentes, si tiene más de 60, si tiene diabetes o presión alta, o si en su familia hay glaucoma. Los niños, una vez al año desde antes de empezar la escuela.'
Add-Answer 'content/eye-health/screen-eye-strain.es.md' 'La fatiga visual por pantallas viene de parpadear menos y de enfocar a la misma distancia durante horas, no de la luz azul. Da ojos secos, visión borrosa al final del día y dolor de cabeza. La regla 20-20-20 ayuda: cada 20 minutos, mire algo a 20 pies durante 20 segundos.'
Add-Answer 'content/eye-health/uv-protection.es.md' 'Los rayos ultravioleta se acumulan en el ojo a lo largo de la vida y se asocian con cataratas, pterigio y daño en la mácula. Un lente que bloquee UVA y UVB protege más que uno simplemente oscuro: el color no indica protección. Los niños la necesitan tanto como los adultos o más.'
Add-Answer 'content/eye-health/childrens-vision-signs.en.md' 'A child who cannot see well almost never says so. The signs are sitting close to the page or screen, squinting, covering one eye to look, headaches late in the day, and schoolwork slipping. Any one of them is reason enough for an exam.'
Add-Answer 'content/eye-health/diabetes-and-vision.en.md' 'Diabetes affects sight by damaging the blood vessels of the retina, painlessly and without warning. Blurry vision that comes and goes usually tracks blood sugar; permanent loss arrives once retinopathy is advanced. A yearly dilated exam is what catches it in time.'
Add-Answer 'content/eye-health/dry-eye.en.md' 'Dry eye causes burning, a gritty feeling, vision that clears when you blink and, oddly, watering. It happens when the eye does not make enough tear or when the tear evaporates too fast because of the eyelid glands. Artificial tears relieve it but do not fix the cause.'
Add-Answer 'content/eye-health/eye-exam-frequency.en.md' 'A healthy adult with no symptoms should have an eye exam every one to two years. Every year if you wear glasses, are over 60, have diabetes or high blood pressure, or have glaucoma in the family. Children, once a year starting before school begins.'
Add-Answer 'content/eye-health/screen-eye-strain.en.md' 'Screen eye strain comes from blinking less and focusing at one distance for hours, not from blue light. It causes dry eyes, blurry vision late in the day and headaches. The 20-20-20 rule helps: every 20 minutes, look 20 feet away for 20 seconds.'
Add-Answer 'content/eye-health/uv-protection.en.md' 'Ultraviolet light builds up in the eye over a lifetime and is linked to cataracts, pterygium and macular damage. A lens that blocks UVA and UVB protects more than one that is merely dark: a dark tint is not protection. Children need it as much as adults, or more.'

Write-Host ""
Write-Host "Hecho." -ForegroundColor Cyan
