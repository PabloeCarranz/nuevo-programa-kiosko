import sqlite3

from app.services.productos_service import TABLAS_CAMPOS
from app.services.rangos import tabla_de_codigo


def obtener_movimientos(conn: sqlite3.Connection, codigo: int) -> dict:
    tabla = tabla_de_codigo(codigo)
    if tabla is None:
        raise ValueError("Codigo invalido")
    campos = TABLAS_CAMPOS[tabla]
    producto = conn.execute(
        f"SELECT {campos['nombre']} AS nombre, CANTIDAD AS base FROM {tabla} WHERE {campos['codigo']} = ?", (codigo,)
    ).fetchone()
    if producto is None:
        raise ValueError("Producto no encontrado")

    ingresos = conn.execute(
        "SELECT FECHA AS fecha, DETALLE AS detalle, CANTIDAD_INGRESADA AS cantidad, COMENTARIOS AS comentarios FROM INGRESOS WHERE CODIGO = ?",
        (codigo,),
    ).fetchall()
    facturas = conn.execute(
        """SELECT f.fecha AS fecha, f.numero_factura AS detalle, d.cantidad AS cantidad, f.id AS factura_id
           FROM DETALLE_FACTURA d JOIN FACTURAS f ON f.id = d.factura_id
           WHERE d.codigo_producto = ? AND d.activo = 1 AND f.activo = 1""",
        (codigo,),
    ).fetchall()
    # Ajustes manuales de stock: en el Tkinter original la UI ya tenia el hook
    # para mostrarlos pero la consulta nunca los incluia (gap corregido aca).
    ajustes = conn.execute(
        "SELECT FECHA_CARGA AS fecha, detalle, CANTIDAD AS cantidad, TIPO_AJUSTE AS tipo_ajuste, COMENTARIO AS comentarios FROM AJUSTES WHERE CODIGO = ? AND ACTIVO = 1",
        (codigo,),
    ).fetchall()

    movimientos = (
        [
            {"fecha": f["fecha"], "tipo": "IREC", "detalle": f["detalle"], "cantidad": f["cantidad"], "comentarios": f["comentarios"]}
            for f in ingresos
        ]
        + [
            {"fecha": f["fecha"], "tipo": "FACT", "detalle": f["detalle"], "cantidad": -f["cantidad"], "factura_id": f["factura_id"]}
            for f in facturas
        ]
        + [
            {
                "fecha": a["fecha"],
                "tipo": "AJ++" if a["tipo_ajuste"] == "MAS" else "AJ--",
                "detalle": a["detalle"],
                "cantidad": a["cantidad"] if a["tipo_ajuste"] == "MAS" else -a["cantidad"],
                "comentarios": a["comentarios"],
            }
            for a in ajustes
        ]
    )
    movimientos.sort(key=lambda m: m["fecha"])

    saldo = producto["base"] or 0
    for m in movimientos:
        saldo += m["cantidad"]
        m["saldo"] = saldo

    return {"codigo": codigo, "nombre": producto["nombre"], "movimientos": movimientos}
