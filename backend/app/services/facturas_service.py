import sqlite3
from datetime import datetime

from app.services.productos_service import ajustar_saldo
from app.services.rangos import tabla_de_codigo


def listar(conn: sqlite3.Connection, fecha: str | None = None, caja: str | None = None) -> list[dict]:
    query = "SELECT * FROM FACTURAS WHERE activo = 1"
    params: list = []
    if fecha:
        query += " AND fecha LIKE ?"
        params.append(f"{fecha}%")
    if caja:
        query += " AND caja = ?"
        params.append(caja)
    query += " ORDER BY fecha DESC"
    return [dict(fila) for fila in conn.execute(query, params).fetchall()]


def listar_anuladas(conn: sqlite3.Connection) -> list[dict]:
    return [dict(fila) for fila in conn.execute("SELECT * FROM FACTURAS WHERE activo = 0 ORDER BY fecha DESC").fetchall()]


def obtener_detalle(conn: sqlite3.Connection, factura_id: int) -> dict:
    factura = conn.execute("SELECT * FROM FACTURAS WHERE id = ?", (factura_id,)).fetchone()
    if factura is None:
        raise ValueError("Factura no encontrada")
    lineas = conn.execute(
        "SELECT * FROM DETALLE_FACTURA WHERE factura_id = ? AND activo = 1", (factura_id,)
    ).fetchall()
    return {"factura": dict(factura), "lineas": [dict(l) for l in lineas]}


def anular(conn: sqlite3.Connection, factura_id: int) -> None:
    factura = conn.execute("SELECT * FROM FACTURAS WHERE id = ? AND activo = 1", (factura_id,)).fetchone()
    if factura is None:
        raise ValueError("Factura no encontrada o ya anulada")

    hoy = datetime.now().strftime("%Y-%m-%d")
    if not factura["fecha"].startswith(hoy):
        raise ValueError("Solo se pueden anular facturas del dia de hoy")

    lineas = conn.execute(
        "SELECT * FROM DETALLE_FACTURA WHERE factura_id = ? AND activo = 1", (factura_id,)
    ).fetchall()
    for linea in lineas:
        # codigo_producto es TEXT por afinidad de columna aunque se inserte un int.
        codigo = int(linea["codigo_producto"])
        tabla = tabla_de_codigo(codigo)
        if tabla:
            ajustar_saldo(conn, tabla, codigo, linea["cantidad"])

    conn.execute("UPDATE DETALLE_FACTURA SET activo = 0 WHERE factura_id = ?", (factura_id,))
    conn.execute("UPDATE FACTURAS SET activo = 0 WHERE id = ?", (factura_id,))
