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
cd backend   →  .venv\Scripts\python -m uvicorn app.main:app --port 8100 --reload
cd frontend  →  npm run dev
```

Abrir http://localhost:5180 (o la IP de la PC desde otro equipo de la red).

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
