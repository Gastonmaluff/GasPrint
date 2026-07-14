# API local de GasPrint

La API local corre dentro del proceso principal de Electron y escucha solo en `127.0.0.1`.

## Seguridad

- Requiere `Authorization: Bearer <token>`.
- El token se genera criptograficamente y se guarda en `app.getPath("userData")`.
- CORS usa allowlist configurable.
- No se aceptan comodines.
- Limite de body: 32 KB.
- Rate limiting simple por origen/IP.
- IDs de solicitud en `X-Request-Id`.
- No acepta HTML, JavaScript, rutas locales ni comandos.

## Endpoints

```text
GET /api/v1/health
GET /api/v1/printers
POST /api/v1/print
```

## Payload de impresion

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

## Codigos esperados

- `200`: health/listado correctos.
- `202`: trabajo aceptado por el sistema de impresion.
- `400`: payload invalido o impresora inexistente.
- `401`: token ausente o invalido.
- `403`: origen no permitido.
- `405`: metodo no permitido.
- `413`: body demasiado grande.
- `429`: rate limit.