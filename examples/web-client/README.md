# GasPrint Web Client Demo

Esta demo no forma parte de la aplicacion principal. Sirve para probar la API local desde una pagina web simple.

## Uso

1. Iniciar GasPrint.
2. En `Configuracion > API local`, copiar el token.
3. Agregar el origen donde se sirve esta demo a la allowlist, por ejemplo `http://127.0.0.1:8080`.
4. Servir esta carpeta con cualquier servidor estatico.

Ejemplo:

```powershell
npx http-server examples/web-client -a 127.0.0.1 -p 8080
```

5. Abrir `http://127.0.0.1:8080`.
6. Pegar el token.
7. Consultar health, listar impresoras y enviar una impresion.

## Fetch reutilizable

```js
const response = await fetch("http://127.0.0.1:38472/api/v1/print", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer TOKEN"
  },
  body: JSON.stringify(payload)
});
```