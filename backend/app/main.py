from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import db_session
from app.services import negocio_service
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
    negocio,
    pool,
    productos,
)

app = FastAPI(title="Caja Neon API")

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


@app.on_event("startup")
def preparar_base() -> None:
    # Bases creadas antes de la version en blanco no tienen la tabla NEGOCIO.
    with db_session() as conn:
        negocio_service.asegurar_tabla(conn)
