# GasPrint

GasPrint es una aplicacion de escritorio para Windows que actua como puente local entre sistemas empresariales y las impresoras instaladas en el equipo. Trabaja inicialmente contra el sistema de impresion de Windows y su spooler, sin Firebase, servicios externos ni WebUSB directo.

## Arquitectura

- `src/main`: Electron main, IPC, impresion, API local, bandeja, persistencia y diagnostico.
- `src/preload`: API limitada expuesta al renderer con `contextBridge`.
- `src/renderer`: interfaz React, pantallas, componentes, hooks y estilos.
- `src/shared`: tipos, constantes y validaciones compartidas.
- `examples/web-client`: demo web externa para consumir la API local.

Seguridad:

- `contextIsolation` activado.
- `nodeIntegration` desactivado en el renderer.
- El renderer no recibe APIs completas de Node.
- API HTTP limitada a `127.0.0.1`.
- Token local bearer generado criptograficamente y persistido en `userData`.
- CORS por allowlist, sin comodines.
- Validacion estricta de payloads y limite de body.

## Requisitos de desarrollo

- Windows 10/11.
- Node.js 20.19 o superior. Validado con Node 24.13.1.
- npm 11 o superior.
- Driver oficial de impresora instalado en Windows.

Para usar el instalador generado, el usuario final no necesita Node.js.

## Instalacion en desarrollo

```powershell
npm install
```

## Comandos

```powershell
npm run dev
npm run typecheck
npm run lint
npm run build
npm run smoke
npm run smoke:api
npm run dist
```

`npm run dev` inicia Vite, compila main/preload en watch y abre Electron.

`npm run dist` genera el instalador en `release/GasPrint Setup.exe`.

## Funcionalidad incluida

- Enumeracion de impresoras instaladas en Windows.
- Seleccion de impresora predeterminada de GasPrint.
- Clasificacion conservadora entre fisicas probables, virtuales y no clasificadas.
- Impresion real con Electron y fallback fijo a `System.Drawing.Printing.PrintDocument`.
- Maquetacion termica previa al envio: ancho seguro, margenes, ajuste por palabras y separadores adaptados.
- Perfil conservador para `FTX TDR058U`.
- API local segura: `GET /api/v1/health`, `GET /api/v1/printers`, `POST /api/v1/print`.
- Token local regenerable desde Configuracion.
- Bandeja de Windows con abrir, iniciar/detener API y salir completamente.
- Historial con origen, motor, fallback, spooler, duracion y errores.
- Instalador NSIS para Windows.

## Validacion fisica documentada

Validacion informada y confirmada por el usuario:

- Impresora: `FTX TDR058U`.
- Papel: 58 mm.
- Conexion: USB.
- Puerto de Windows: `USB001`.
- Driver oficial instalado.
- Enumeracion correcta desde GasPrint.
- Impresion mediante fallback del spooler aceptada.
- Ticket fisico confirmado por el usuario.
- Texto normal y negrita verificados.

GasPrint diferencia tecnicamente:

- trabajo enviado al spooler;
- impresion fisica confirmada manualmente por el usuario.

La aplicacion no afirma automaticamente una confirmacion fisica si Windows o el hardware no la reportan.

## API local

La API escucha exclusivamente en:

```text
http://127.0.0.1:38472
```

El puerto puede cambiarse desde `Configuracion > API local`.

Endpoints:

```text
GET /api/v1/health
GET /api/v1/printers
POST /api/v1/print
```

Todos requieren:

```text
Authorization: Bearer <token>
```

Payload de impresion:

```json
{
  "printer": "FTX TDR058U",
  "type": "receipt",
  "paperWidth": 58,
  "source": "demo-web",
  "content": {
    "title": "GasPrint",
    "lines": [
      {
        "text": "Hola Mundo",
        "align": "center",
        "bold": true,
        "size": "normal"
      }
    ],
    "feedLines": 4
  }
}
```

## Como conseguir el token

1. Abrir GasPrint.
2. Ir a `Configuracion`.
3. En `API local`, presionar `Copiar token`.
4. Si fue expuesto, presionar `Regenerar token`.

El token se muestra parcialmente y no debe subirse al repositorio ni escribirse en logs.

## Demo web

La demo esta en `examples/web-client`.

```powershell
npx http-server examples/web-client -a 127.0.0.1 -p 8080
```

Luego abrir:

```text
http://127.0.0.1:8080
```

Agregar `http://127.0.0.1:8080` a los origenes permitidos en GasPrint, pegar el token, consultar health, listar impresoras y enviar la impresion.

## Instalador Windows

Generar:

```powershell
npm run dist
```

Salida esperada:

```text
release/GasPrint Setup.exe
```

El instalador crea acceso en Menu Inicio, permite acceso directo en escritorio, instala la app sin requerir Node.js y conserva datos locales entre actualizaciones.

## Fallback PowerShell

El fallback existe porque algunos drivers termicos rechazan configuraciones silenciosas de Chromium/Electron con `Invalid printer settings`. GasPrint primero intenta Electron y, si falla, usa un script fijo de `System.Drawing.Printing.PrintDocument`.

Restricciones:

- no ejecuta texto del renderer como comando;
- no interpola scripts desde clientes;
- usa JSON temporal validado;
- elimina archivos temporales;
- no acepta rutas, PowerShell, HTML ni JavaScript desde la API;
- registra errores tecnicos sin token completo.

## Solucion de problemas

- Si no aparecen impresoras, revisar Windows en `Impresoras y escaneres`.
- Si la FTX no imprime, probar primero la pagina de prueba de Windows.
- Si hay corte lateral, bajar caracteres por linea o aumentar margenes del perfil.
- Si una web recibe 403, agregar su origen exacto a la allowlist.
- Si recibe 401, copiar/regenerar el token desde Configuracion.
- Si el puerto esta ocupado, cambiarlo en Configuracion y reiniciar la API local.

## Limitaciones actuales

- ESC/POS directo no esta implementado.
- La API acepta recibos estructurados, no HTML arbitrario.
- La confirmacion fisica automatica depende del driver/hardware y no se asume.
- Los perfiles por impresora son iniciales y conservadores.

## Proximo hito sugerido

Agregar plantillas de recibos versionadas y una prueba end-to-end desde un sistema web real usando la API local con token rotado y perfil afinado para FTX TDR058U.