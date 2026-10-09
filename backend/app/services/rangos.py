"""Unica fuente de verdad de los rangos de codigo por rubro.

Los valores de abajo son los 4 rubros originales, tal como clasifica
programa_restaurante_respaldo.py (enviar_totales_y_cerrar). Al arrancar, y
cada vez que el Master edita los rubros, recargar() los reemplaza por lo que
dice la tabla RUBROS (ver rubros_service). Los diccionarios se modifican en el
lugar, asi quien los importo con `from ... import RANGOS` ve siempre lo ultimo.
"""

import sqlite3

RANGOS = {
    "golosinas": {"tabla": "GOLOSINAS", "desde": 20000, "hasta": 29999},
    "bebidas": {"tabla": "BEBIDAS", "desde": 30000, "hasta": 39999},
    "cigarros": {"tabla": "CIGARROS", "desde": 40000, "hasta": 49999},
    "mesa_pool": {"tabla": "MESA_POOL", "desde": 90000, "hasta": 100000},
}

TABLAS_POR_RUBRO = {rubro: info["tabla"] for rubro, info in RANGOS.items()}


def recargar(conn: sqlite3.Connection) -> None:
    from app.services import productos_service  # import aca para evitar el ciclo

    filas = conn.execute("SELECT clave, tabla, desde, hasta FROM RUBROS ORDER BY orden").fetchall()
    RANGOS.clear()
    TABLAS_POR_RUBRO.clear()
    for f in filas:
        RANGOS[f["clave"]] = {"tabla": f["tabla"], "desde": f["desde"], "hasta": f["hasta"]}
        TABLAS_POR_RUBRO[f["clave"]] = f["tabla"]
        productos_service.registrar_tabla(f["tabla"], f["clave"], f["desde"])


def rubro_de_codigo(codigo: int) -> str | None:
    for rubro, info in RANGOS.items():
        if info["desde"] <= codigo <= info["hasta"]:
            return rubro
    return None


def tabla_de_codigo(codigo: int) -> str | None:
    rubro = rubro_de_codigo(codigo)
    return TABLAS_POR_RUBRO.get(rubro) if rubro else None
