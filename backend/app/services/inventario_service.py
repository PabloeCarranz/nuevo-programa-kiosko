import sqlite3

from app.services.productos_service import TABLAS_CAMPOS
from app.services.rangos import RANGOS


def guardar_conteo(conn: sqlite3.Connection, fecha: str, items: list[dict]) -> None:
    for item in items:
        conn.execute(
            """INSERT INTO INVENTARIO (CODIGO, NOMBRE_PRODUCTO, CANTIDAD, FECHA_CARGA)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(CODIGO, FECHA_CARGA) DO UPDATE SET CANTIDAD = excluded.CANTIDAD, NOMBRE_PRODUCTO = excluded.NOMBRE_PRODUCTO""",
            (item["codigo"], item["nombre"], item["cantidad"], fecha),
        )


def obtener_diferencias(conn: sqlite3.Connection, fecha: str) -> list[dict]:
    filas = conn.execute("SELECT * FROM INVENTARIO WHERE FECHA_CARGA = ?", (fecha,)).fetchall()
    resultado = []
    for fila in filas:
        codigo = fila["CODIGO"]
        producto = _buscar_producto_con_saldo(conn, codigo)
        sistema = producto["saldo"] if producto else 0
        precio = producto["precio"] if producto else 0
        fisico = fila["CANTIDAD"]
        diferencia = fisico - sistema
        resultado.append(
            {
                "codigo": codigo,
                "nombre": fila["NOMBRE_PRODUCTO"],
                "fisico": fisico,
                "sistema": sistema,
                "diferencia": diferencia,
                "precio": precio,
                "valorizado": diferencia * precio,
            }
        )
    return resultado


def _buscar_producto_con_saldo(conn: sqlite3.Connection, codigo: int) -> dict | None:
    for rubro, info in RANGOS.items():
        if info["desde"] <= codigo <= info["hasta"]:
            campos = TABLAS_CAMPOS[info["tabla"]]
            fila = conn.execute(
                f"SELECT {campos['nombre']} AS nombre, CAST({campos['precio']} AS REAL) AS precio, {campos['saldo']} AS saldo FROM {info['tabla']} WHERE {campos['codigo']} = ?",
                (codigo,),
            ).fetchone()
            if fila:
                return dict(fila)
    return None
