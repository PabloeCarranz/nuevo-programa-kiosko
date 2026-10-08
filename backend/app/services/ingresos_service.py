import sqlite3
from datetime import datetime

from app.services.productos_service import TABLAS_CAMPOS, ajustar_saldo
from app.services.rangos import TABLAS_POR_RUBRO


def _proximo_detalle(conn: sqlite3.Connection) -> str:
    total = conn.execute("SELECT COUNT(*) AS n FROM INGRESOS").fetchone()["n"]
    return f"IR0001-{total + 1:06d}"


def listar_recientes(conn: sqlite3.Connection, limite: int = 20) -> list[dict]:
    filas = conn.execute("SELECT * FROM INGRESOS ORDER BY ID DESC LIMIT ?", (limite,)).fetchall()
    return [dict(fila) for fila in filas]


def registrar_ingreso(conn: sqlite3.Connection, rubro: str, codigo: int, cantidad: int, comentario: str) -> dict:
    tabla = TABLAS_POR_RUBRO.get(rubro)
    if tabla is None:
        raise ValueError("Rubro invalido")
    campos = TABLAS_CAMPOS[tabla]
    fila = conn.execute(
        f"SELECT {campos['nombre']} AS nombre FROM {tabla} WHERE {campos['codigo']} = ?", (codigo,)
    ).fetchone()
    if fila is None:
        raise ValueError("Producto no encontrado")
    nombre = fila["nombre"]

    ajustar_saldo(conn, tabla, codigo, cantidad)
    detalle = _proximo_detalle(conn)
    fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor = conn.execute(
        """INSERT INTO INGRESOS (FECHA, DETALLE, RUBRO, CODIGO, NOMBRE_PRODUCTO, CANTIDAD_INGRESADA, COMENTARIOS)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (fecha, detalle, rubro, codigo, nombre, cantidad, comentario),
    )
    return {"id": cursor.lastrowid, "detalle": detalle, "nombre": nombre}


def anular_ingreso(conn: sqlite3.Connection, ingreso_id: int) -> None:
    fila = conn.execute("SELECT * FROM INGRESOS WHERE ID = ?", (ingreso_id,)).fetchone()
    if fila is None:
        raise ValueError("Ingreso no encontrado")
    tabla = TABLAS_POR_RUBRO.get(fila["RUBRO"])
    if tabla:
        ajustar_saldo(conn, tabla, fila["CODIGO"], -fila["CANTIDAD_INGRESADA"])
    conn.execute("DELETE FROM INGRESOS WHERE ID = ?", (ingreso_id,))
