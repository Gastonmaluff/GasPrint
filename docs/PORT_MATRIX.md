# Matriz de portado: compilado (`dist`) → TypeScript (`src`)

Referencias de lectura (no modificadas):
- `CAMBIOS_SOLO_EN_COMPILADO.md`
- `C:\Users\gafa9\OneDrive\Escritorio\GasPrint\dist` (compilado conservado)
- `C:\Program Files\GasPrint\resources\app.asar` (app instalada, solo lectura)
- Log Codex `rollout-2026-07-13T12-06-27-…jsonl`

| # | Archivo compilado (dist) | Destino TypeScript (src) | Funcionalidad a portar | Evidencia (ts del log) | Riesgo | Prueba |
|---|---|---|---|---|---|---|
| 1 | `dist/shared/constants/app.js` | `src/shared/constants/app.ts` | `DEFAULT_PRINTER_PROFILE` con campos mm + defaults nuevos | 19:51:47 | Bajo | typecheck |
| 2 | `dist/shared/validation/printing.js` | `src/shared/validation/printing.ts` | `clampDecimal`, sanitizar perfil mm, `validatePrintJob` mm | 19:51:47 / 19:53:02 | Medio | unit `clampDecimal` |
| 3 | `dist/main/storage/dataStore.js` | `src/main/storage/dataStore.ts` | Seed/normalización `FTX TDR058U` mm + `persist()` al leer | 19:51:47 / 19:59 | Medio | unit normalizeProfiles |
| 4 | `dist/main/printing/thermalLayout.js` | `src/main/printing/thermalLayout.ts` | Propagación de campos mm al job | 19:52:00 | Medio | unit layout |
| 5 | `dist/main/printing/receiptHtml.js` | `src/main/printing/receiptHtml.ts` | Render HTML/Electron por mm | 19:52:12 | Medio | unit html contiene mm |
| 6 | `dist/main/printing/windowsPowerShellSpooler.js` | `src/main/printing/windowsPowerShellSpooler.ts` | Posición/ancho por mm + **timeout 20 s** | 19:52:27 / 19:53:57 | Alto | unit payload + revisión script |
| 7 | `dist/main/printing/printCoordinator.js` | `src/main/printing/printCoordinator.ts` | Enriquecer job con perfil efectivo | 19:52:37 | Bajo | unit |
| 8 | `dist/main/printing/jobFactory.js` | `src/main/printing/jobFactory.ts` | `createCalibrationJob` + helpers + rediseño `createTestJob` | 19:52:52 / 20:16 / 14/07 03:07 / 03:08 | Alto | unit ticket |
| 9 | `dist/shared/types/ipc.js` | `src/shared/types/ipc.ts` | Canal `print:calibration` + método API | 19:53:13 | Bajo | typecheck |
| 10 | `dist/preload/index.js` (API) | `src/preload/index.ts` | `printCalibration` en contextBridge (**sin inyección DOM**) | 19:53:13 | Bajo | typecheck |
| 11 | `dist/preload/index.js` (panel DOM) | `src/renderer/pages/SettingsPage.tsx` (+App) | UI de calibración **reimplementada en React** | 19:53:36 | Alto | build + smoke |
| 12 | (IPC) | `src/shared/validation/ipc.ts` | `parsePrinterProfile` seguro | — | Bajo | unit |
| 13 | (persistencia/historial) | `dataStore.ts` / `printCoordinator.ts` | Perfil persistente por impresora + historial con perfil solicitado/efectivo | 19:52:37 | Medio | unit |

Los tres bugs físicos (separadores que se envuelven, superposición vertical, `feedAfterPrintMm` sin efecto)
se documentan en `docs/DIAGNOSTICO_BUGS.md` y se corrigen en Fases 5–8. La convención de `leftOffsetMm`:
negativo = izquierda, positivo = derecha (Fase 8).
