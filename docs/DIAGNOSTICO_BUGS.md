# Diagnóstico y corrección de los tres bugs físicos

Rama: `restore/thermal-calibration`. Base: commit de paridad (`port: restore thermal calibration source parity`).
Diagnóstico derivado del código portado (idéntico en comportamiento a la app instalada) más logging técnico
(`GASPRINT_DEBUG=1`) agregado en `printCoordinator`.

## Bug 1 — Los separadores exceden el ancho útil y el sobrante pasa al renglón siguiente

**Causa raíz (confirmada por código):**
- `jobFactory` construía cada separador como texto: `'='.repeat(width)` / `'-'.repeat(width)` y la "line factory"
  `separator(char)` = `char.repeat(width)`. `width` proviene de `charactersPerLine`, no del ancho físico imprimible.
- En el motor HTML/Electron (`receiptHtml`), `.line { white-space: pre-wrap; overflow-wrap: anywhere; }`: si la
  cadena de `=` supera el ancho de `.receipt` (`printableWidthMm`), **se envuelve** a una segunda línea.
- En el motor PowerShell/.NET, `DrawString` recibe un `RectangleF` de ancho `usableWidth` con
  `StringFormatFlags::LineLimit`: la cadena de `=` más ancha que `usableWidth` **se parte** en dos líneas.

**Corrección (Fase 5):** un separador es ahora un bloque (`separator: true`) sin texto, y cada motor dibuja
**una sola línea física**:
- HTML: `<div class="sep">` con `border-top` y `width:100%` (sin caracteres → no puede envolverse).
- PowerShell: `Graphics.DrawLine` a lo ancho de `usableWidth` (una sola línea).
- `thermalLayout` ya no expande separadores a `=`; los deja como bloque.
- Cualquier texto crudo se recorta a un máximo seguro (`fitText`) y el spooler mide con `MeasureString` antes de dibujar.

**Criterio:** un separador solicitado ⇒ exactamente una línea física.

## Bug 2 — "Texto normal" y "Texto en negrita" se superponen

**Causa raíz:** en el spooler PS el avance vertical era `lineHeight = Ceil(font.GetHeight(g) * 1.25)`, un valor
fijo que no mide el texto real. Si una línea se envolvía (bug 1) o la métrica de la fuente (p. ej. negrita) no
coincidía, `$y` avanzaba menos que la altura real dibujada y el bloque siguiente se **pisaba**.

**Corrección (Fase 6):** cada bloque calcula su altura real con `Graphics.MeasureString(text, font, usableWidth, format)`
y el cursor avanza `nextTop = previousBottom + spacing`. Los bloques de tipo separador avanzan una altura fija
pequeña. Nunca se reutiliza una coordenada ni se usa un salto arbitrario.

**Criterio:** dos bloques consecutivos nunca comparten coordenada vertical.

## Bug 3 — `feedAfterPrintMm` no produce avance físico confiable

**Causa raíz:** el `PaperSize` se creaba con alto fijo (`1400` centésimas) y el avance final era solo
`$y += feedPx` (mueve el cursor, no alarga el papel). El largo físico de la página no dependía de
`feedAfterPrintMm`, por eso cambiar el valor en la interfaz no cambiaba el avance real.

**Corrección (Fase 7):** el spooler hace una **pasada de medición** que suma la altura de todos los bloques
(`contentHeightMm`) y crea el `PaperSize` con alto = `contentHeightMm + feedAfterPrintMm` (convertido con
`hundredths = mm / 25.4 * 100`). Así `pageHeightMm` varía exactamente con el feed aunque el contenido sea idéntico.
El botón "Imprimir calibración" **valida → guarda → relee el perfil efectivo → imprime** con ese perfil.

**Criterio:** con contenido idéntico, `pageHeightMm(40) − pageHeightMm(10) = 30 mm`. Físicamente, 40 mm deja
más papel que 10 mm.

## Bug 4 (Fase 8) — Offset horizontal aplicado una sola vez

`leftOffsetMm` se aplica **una vez** por motor: en HTML como `margin-left` de `.receipt`; en PS como origen `$x`
(con `OriginAtMargins=$false` para respetar el signo: negativo=izquierda, positivo=derecha), sin duplicación por
padding/margin/transform/HardMargin. No se altera automáticamente el valor del usuario.
