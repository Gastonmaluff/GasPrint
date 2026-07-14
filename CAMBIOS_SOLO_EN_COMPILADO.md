# CAMBIOS_SOLO_EN_COMPILADO.md

**Proyecto:** GasPrint
**Generado:** 2026-07-14
**Fuente forense:** `C:\Users\gafa9\.codex\sessions\2026\07\13\rollout-2026-07-13T12-06-27-019f5c03-e628-7723-9911-feac01e9ca6a.jsonl`
**Carpeta recuperada:** `C:\Dev\GasPrint-recuperado`

> ⚠️ Este documento lista cambios que existen **únicamente en los archivos JavaScript compilados
> (`dist/…`)** y que **NO están** en el código TypeScript recuperado en `src/`.
> No se inventó ni se "des-compiló" TypeScript. Cada caso cita la evidencia (archivo `dist` + timestamp)
> del log de la sesión de Codex. Portar estos cambios a TypeScript es una tarea **manual y deliberada**.

---

## Contexto: cuándo se dejó de usar `src`

Reproduciendo cronológicamente las 130 operaciones `apply_patch` del log:

- **Op #107** — última edición a un archivo de `src/…` (13/07/2026, tarde).
- **Op #109–#110** (13/07 19:50–19:51) — dos parches que intentaron **reescribir `package.json`** a la
  versión "simplificada / correr desde compilado". (En la recuperación se conservó a propósito el
  `package.json` original, no el simplificado.)
- **Op #111 → #130** (13/07 19:51:47 → **14/07 03:08:30**) — **todas** las ediciones se hicieron
  directamente sobre `dist/**/*.js`. **Ninguna** tocó `src/`.

Es decir: a partir de ~las 19:51 del 13/07, el trabajo se hizo **solo sobre compilado**. Todo lo de esta
lista quedó fuera del código fuente.

---

## Tema general de los cambios compilados

Los 20 parches sobre `dist` implementan, casi en su totalidad, **un subsistema de calibración física de
impresión térmica en milímetros** y un **rediseño de los tickets de prueba/calibración**, más dos
correcciones de robustez. El `src/` recuperado corresponde al estado **anterior** a todo esto.

---

## Detalle por archivo (con evidencia)

### 1. Modelo de datos de perfil en milímetros — NUEVO
- **`dist/shared/constants/app.js`** (19:51:47): `DEFAULT_PRINTER_PROFILE` pasa a incluir
  `printerName, paperWidthMm, printableWidthMm, leftOffsetMm, rightMarginMm, feedAfterPrintMm, updatedAt`.
  Cambios de defaults: `charactersPerLine 32 → 30`, `marginLeftChars 1 → 0`.
- **`dist/shared/validation/printing.js`** (19:51:47 y 19:53:02): nueva función **`clampDecimal()`**;
  `sanitizePrinterProfile()` valida y recorta los campos mm; `validatePrintJob()` propaga los campos mm al job.
- **`dist/main/storage/dataStore.js`** (19:51:47, 19:59:00, 19:59:27): siembra/normaliza el perfil
  `FTX TDR058U` con valores mm; agrega `await this.persist()` tras normalizar al leer.

**Equivalente en fuente:** `src/shared/constants/app.ts`, `src/shared/validation/printing.ts`,
`src/main/storage/dataStore.ts` — **no** tienen estos campos ni `clampDecimal`.

### 2. Propagación de mm en el layout — NUEVO
- **`dist/main/printing/thermalLayout.js`** (19:52:00): arrastra `paperWidthMm, printableWidthMm,
  leftOffsetMm, rightMarginMm, feedAfterPrintMm` a través del layout.
**Fuente:** `src/main/printing/thermalLayout.ts` — sin estos campos.

### 3. Render del recibo por milímetros — NUEVO
- **`dist/main/printing/receiptHtml.js`** (19:52:12): usa `printableWidthMm`, `leftOffsetMm`,
  `rightMarginMm`, `feedAfterPrintMm` para el ancho/márgenes CSS y la altura del `feed`; reset `box-sizing`.
**Fuente:** `src/main/printing/receiptHtml.ts` — usa el modelo antiguo (`paperWidth`, `feedLines`).

### 4. Motor de impresión PowerShell — NUEVO + robustez
- **`dist/main/printing/windowsPowerShellSpooler.js`** (19:52:27): lee los campos mm del JSON y calcula
  posición/ancho en centésimas de pulgada (`mmToHundredths = 100/25.4`): `x` desde `leftOffsetMm`,
  `usableWidth` desde `printableWidthMm - rightMarginMm`, avance desde `feedAfterPrintMm`.
- **`dist/main/printing/windowsPowerShellSpooler.js`** (19:53:57): **timeout de 20 s** que mata el proceso
  `powershell.exe` y rechaza la promesa (corrección de robustez ante cuelgues).
**Fuente:** `src/main/printing/windowsPowerShellSpooler.ts` — posiciones fijas (`x=4,y=4`), **sin timeout**.

### 5. Coordinador de impresión — NUEVO
- **`dist/main/printing/printCoordinator.js`** (19:52:37): adjunta `profile` + campos mm al job pendiente
  buscándolos en `data.printerProfiles`.
**Fuente:** `src/main/printing/printCoordinator.ts` — sin esto.

### 6. Fábrica de jobs (`jobFactory`) — el de mayor cambio (4 parches)
- **`dist/main/printing/jobFactory.js`** (19:52:52): **nueva `createCalibrationJob(printerName, profile)`**
  (ticket de calibración) + `summarizeLines`/`makeJobId` existentes.
- (20:16:35): rediseño del ticket de calibración con regla graduada y "cruz" de centrado; nuevos helpers
  **`buildCalibrationRule, buildCenterCross, formatValueLine, formatMm, formatDate, formatTime`**.
- (**14/07 03:07:24**): **rediseño de `createTestJob`** con "line factory" (`separator/center/left/columns`),
  `compactPrinterName, fitText, centerText`; `width = min(30, max(20, cpl))`.
- (**14/07 03:08:30**): refinamiento — `width = min(29, max(20, cpl-1))`, alineación por `options.align`,
  columnas con relleno de puntos (`.`), se elimina `centerText`. **← el cambio más reciente del proyecto.**
**Fuente:** `src/main/printing/jobFactory.ts` — tiene `createTestJob`/`createLabJob` en su forma **antigua**;
**no** tiene `createCalibrationJob` ni ninguno de los helpers nuevos.

### 7. Canal IPC de calibración — NUEVO
- **`dist/shared/types/ipc.js`** (19:53:13): `printCalibration: 'print:calibration'`.
- **`dist/preload/index.js`** (19:53:13): expone `printCalibration(printerName)`.
- **`dist/main/ipc/registerHandlers.js`** (19:53:13): importa `createCalibrationJob` y registra el handler
  `ipcMain.handle('print:calibration', …)`.
**Fuente:** `src/shared/types/ipc.ts`, `src/preload/index.ts`, `src/main/ipc/registerHandlers.ts` — sin el canal.

### 8. Panel de UI de calibración inyectado — NUEVO (¡solo en preload compilado!)
- **`dist/preload/index.js`** (19:53:36, ajuste 19:53:45): inyecta en tiempo de ejecución, vía
  `DOMContentLoaded` + `MutationObserver`, un panel completo `#gasprint-calibration-panel` dentro de la
  pantalla **Configuración**, con inputs (ancho papel, ancho útil, offset, margen derecho, avance,
  caracteres/línea) y botones **Guardar / Imprimir calibración / Restablecer** que llaman
  `api.updatePrinterProfile` y `api.printCalibration`.

  > ⚠️ Esto **no** es un componente React. Es HTML inyectado por manipulación del DOM desde el `preload`.
  > Portarlo "bien" al código fuente implica **reimplementarlo como UI de React** (p. ej. en
  > `src/renderer/pages/SettingsPage.tsx` o un componente nuevo), no copiar el JS.

**Fuente:** no existe ninguna UI de calibración en `src/renderer/`.

---

## Qué faltaría portar al código fuente recuperado

Para que `src/` iguale funcionalmente a la app instalada, habría que reimplementar en TypeScript:

1. Campos mm en el modelo de perfil (`app.ts`, `validation/printing.ts`, `types/printing.ts`, `dataStore.ts`) + `clampDecimal`.
2. Propagación mm en `thermalLayout.ts`.
3. Render por mm en `receiptHtml.ts`.
4. Posicionamiento por mm **y el timeout de 20 s** en `windowsPowerShellSpooler.ts`.
5. Enriquecimiento del job en `printCoordinator.ts`.
6. `createCalibrationJob` + helpers y el **rediseño de `createTestJob`** en `jobFactory.ts` (incluye los cambios del 14/07 03:07–03:08).
7. Canal IPC `print:calibration` (`ipc.ts`, `preload/index.ts`, `registerHandlers.ts`).
8. **UI de calibración** en la pantalla Configuración, reimplementada en React (el original es DOM inyectado).
9. Seed/normalización del perfil `FTX TDR058U` y `persist()` al leer, en `dataStore.ts`.

---

## Fuente confiable vs. cambios solo-compilado (resumen)

| | Estado |
|---|---|
| **`src/` recuperado** | Confiable. Compila (`typecheck`, `lint`, `build` = OK). Corresponde al estado **hasta op #107** (antes de la calibración mm). El renderer reconstruido reproduce el mismo bundle `index-30x1Yb0o.js` (221.200 bytes) que la carpeta compilada original. |
| **Cambios solo en `dist`** | Ops #111–#130 (13/07 19:51 → 14/07 03:08). Subsistema de calibración térmica en mm + rediseño de tickets + timeout PS + UI inyectada. **No** están en `src/` y deben portarse manualmente. |

---

## Nota metodológica

- No se ejecutó ningún comando extraído del log contra el sistema operativo.
- La reconstrucción se hizo replayando `apply_patch` (Add/Update/Delete) sobre un sistema de archivos
  virtual y materializando solo el código fuente (se ignoraron `dist/`, `node_modules/`, `release/`).
- Este documento se basa en el contenido literal de los parches `dist` del log; no interpreta binarios
  ni el `app.asar`.
