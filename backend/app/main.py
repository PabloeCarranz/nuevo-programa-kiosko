from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import db_session
from app.services import licencia_service, negocio_service, rubros_service
from app.routers import (
    auth,
    balance,
    cierre,
    clientes,
    config,
    consumo_temporal,
    control_stock,
    facturacion,
    facturas,
    health,
    ingresos,
    kardex,
    licencia,
    negocio,
    pool,
    productos,
    rubros,
)

app = FastAPI(title="Caja Neon API")

# Con la prueba vencida y sin activar, la API solo responde lo necesario para
# activar. Va ANTES de CORSMiddleware para que CORS quede como capa exterior y
# la respuesta 402 tambien lleve sus cabeceras.
_RUTAS_LIBRES = ("/api/licencia", "/api/health")


@app.middleware("http")
async def exigir_licencia(request: Request, call_next):
    ruta = request.url.path
    if request.method != "OPTIONS" and ruta.startswith("/api") and not ruta.startswith(_RUTAS_LIBRES):
        if (await run_in_threadpool(licencia_service.estado_actual))["estado"] == "vencida":
            return JSONResponse({"detail": "licencia_vencida"}, status_code=402)
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(clientes.router, prefix="/api")
app.include_router(productos.router, prefix="/api")
app.include_router(config.router, prefix="/api")
app.include_router(facturacion.router, prefix="/api")
app.include_router(pool.router, prefix="/api")
app.include_router(consumo_temporal.router, prefix="/api")
app.include_router(cierre.router, prefix="/api")
app.include_router(ingresos.router, prefix="/api")
app.include_router(kardex.router, prefix="/api")
app.include_router(facturas.router, prefix="/api")
app.include_router(control_stock.router, prefix="/api")
app.include_router(balance.router, prefix="/api")
app.include_router(negocio.router, prefix="/api")
app.include_router(rubros.router, prefix="/api")
app.include_router(licencia.router, prefix="/api")


@app.on_event("startup")
def preparar_base() -> None:
    # Bases creadas antes de la version en blanco no tienen la tabla NEGOCIO.
    with db_session() as conn:
        negocio_service.asegurar_tabla(conn)
        # Registra los 4 rubros de siempre la primera vez y carga los rangos en memoria
        rubros_service.asegurar_tabla(conn)
    # La prueba de 7 dias arranca con el primer inicio del programa.
    licencia_service.estado_actual()
