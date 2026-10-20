# Caja Neón (nombre provisorio)

Sistema de caja para bares, canchas, pool y kioscos. Versión "en blanco" del
sistema del bar: el nombre del negocio, el ticket y los rubros se configuran
desde el propio programa (botón ⚙️, solo usuario Master).

## Primera vez

```
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env        (y cambiar SESSION_SECRET por un valor largo al azar)
.venv\Scripts\python scripts\crear_base_demo.py

cd ..\frontend
npm install
```

La base de demo queda en `datos/negocio.db` con usuarios Master, Caja1, Caja2
y Caja3, todos con contraseña `1234`.

## Para usarlo

```
cd backend   →  .venv\Scripts\python -m uvicorn app.main:app --port 8100 --reload --reload-dir app
cd frontend  →  npm run dev
```

Abrir http://localhost:5180 (o la IP de la PC desde otro equipo de la red).

## Licencia: prueba de 7 días y código para siempre

El programa arranca con 7 días de prueba gratis (el contador empieza con el primer
inicio). Al terminar, la API se bloquea y el programa muestra la pantalla
"Terminó tu prueba gratuita" con el **ID de la PC** y un campo para pegar el código.
Los datos del cliente se conservan y vuelven al activar. Con un código válido el
programa queda activado para siempre **en esa PC**.

Para vender (hacerlo en tu PC, nunca en la del cliente):

```
cd backend
.venv\Scripts\python scripts\generar_claves_licencia.py     (una sola vez, ya hecho en esta PC)
.venv\Scripts\python scripts\emitir_codigo.py ID-DE-LA-PC --cliente "Bar Don Pepe"
```

- El cliente te pasa el ID que ve en pantalla (ej. `4022-C75E-A697`); el script imprime
  el código para pegarle. Cada emisión queda anotada en `%USERPROFILE%\.caja-licencias\emitidos.csv`.
- La **clave privada** vive en `%USERPROFILE%\.caja-licencias\clave_privada.pem`, fuera del
  proyecto. Hacé copia en un lugar seguro y no la entregues con el programa. Si se pierde no
  se pueden emitir más códigos; si se filtra, cualquiera los puede fabricar. No regeneres las
  claves: invalidaría todos los códigos ya entregados.
- Un código solo sirve para la PC cuyo ID se usó. Si el cliente cambia de PC hay que emitirle otro.
- Esta PC (la de desarrollo) también tiene su prueba de 7 días: activala igual, con
  `emitir_codigo.py` y el ID que muestra el aviso "Prueba gratuita" del programa.
- Límites: la fecha de inicio se guarda en la base y en `%PROGRAMDATA%\CajaNeon\licencia.json`
  (rige la más antigua) y atrasar el reloj no devuelve días. Aun así, quien entregue el programa
  como código fuente no puede impedir que alguien con conocimientos quite la verificación.

## Qué cambió respecto del sistema del bar

- Datos del negocio configurables (nombre, subtítulo, dirección, teléfono,
  pie del ticket y nombres de los 4 rubros), guardados en la tabla `NEGOCIO`.
  Una base vieja la crea sola al arrancar.
- Pantalla de venta (F5) rediseñada: total grande, botones por rubro, búsqueda
  F2, cronómetros de las mesas/canchas en uso y opción de quitar renglones.
- El ticket lleva el encabezado y el pie del negocio.
- Los datos (base, comprobantes, cierres) viven en `datos/`, fuera del código.
- El frontend habla con el backend por `/api` a través de Vite: no hace falta
  configurar IPs ni CORS para usarlo desde otra PC o un celular.
