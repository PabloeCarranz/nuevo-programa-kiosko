import sqlite3
from datetime import datetime

from app.services.productos_service import TABLAS_CAMPOS, ajustar_saldo
from app.services.rangos import tabla_de_codigo

PREFIJO_POR_TIPO = {"MAS": "I", "MENOS": "E"}


def _proximo_detalle(conn: sqlite3.Connection, tipo: str) -> str:
    total = conn.execute("SELECT COUNT(*) AS n FROM AJUSTES WHERE TIPO_AJUSTE = ?", (tipo,)).fetchone()["n"]
    return f"{PREFIJO_POR_TIPO[tipo]}0001-{total + 1:05d}"


def registrar_ajuste(conn: sqlite3.Connection, tipo: str, codigo: int, cantidad: int, comentario: str, fecha: str) -> dict:
    if tipo not in PREFIJO_POR_TIPO:
        raise ValueError("Tipo de ajuste invalido")
    tabla = tabla_de_codigo(codigo)
    if tabla is None:
        raise ValueError("Codigo invalido")
    campos = TABLAS_CAMPOS[tabla]
    fila = conn.execute(f"SELECT {campos['nombre']} AS nombre FROM {tabla} WHERE {campos['codigo']} = ?", (codigo,)).fetchone()
    if fila is None:
        raise ValueError("Producto no encontrado")

    delta = cantidad if tipo == "MAS" else -cantidad
    ajustar_saldo(conn, tabla, codigo, delta)
    detalle = _proximo_detalle(conn, tipo)
    conn.execute(
        """INSERT INTO AJUSTES (FECHA_CARGA, TIPO_AJUSTE, CODIGO, NOMBRE_PRODUCTO, CANTIDAD, COMENTARIO, ACTIVO, detalle)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)""",
        (fecha, tipo, codigo, fila["nombre"], cantidad, comentario, detalle),
    )
    return {"detalle": detalle, "nombre": fila["nombre"]}


def listar_recientes(conn: sqlite3.Connection, limite: int = 20) -> list[dict]:
    return [dict(f) for f in conn.execute("SELECT * FROM AJUSTES WHERE ACTIVO = 1 ORDER BY ID DESC LIMIT ?", (limite,)).fetchall()]


def anular_ajuste(conn: sqlite3.Connection, detalle: str) -> None:
    fila = conn.execute("SELECT * FROM AJUSTES WHERE detalle = ? AND ACTIVO = 1", (detalle,)).fetchone()
    if fila is None:
        raise ValueError("Ajuste no encontrado")
    tabla = tabla_de_codigo(fila["CODIGO"])
    if tabla:
        delta = -fila["CANTIDAD"] if fila["TIPO_AJUSTE"] == "MAS" else fila["CANTIDAD"]
        ajustar_saldo(conn, tabla, fila["CODIGO"], delta)
    conn.execute("UPDATE AJUSTES SET ACTIVO = 0 WHERE detalle = ?", (detalle,))
