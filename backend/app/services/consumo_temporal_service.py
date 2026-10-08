import sqlite3
from datetime import datetime


def obtener(conn: sqlite3.Connection, cliente: str) -> list[dict]:
    filas = conn.execute(
        "SELECT codigo, detalle, cantidad, precio_unitario, total FROM CONSUMO_TEMPORAL WHERE sesion_id = ?",
        (cliente,),
    ).fetchall()
    return [dict(fila) for fila in filas]


def guardar(conn: sqlite3.Connection, cliente: str, items: list[dict]) -> None:
    conn.execute("DELETE FROM CONSUMO_TEMPORAL WHERE sesion_id = ?", (cliente,))
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for item in items:
        total = item["cantidad"] * item["precio_unitario"]
        conn.execute(
            """INSERT INTO CONSUMO_TEMPORAL (sesion_id, codigo, detalle, cantidad, precio_unitario, total, fecha)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (cliente, item["codigo"], item["detalle"], item["cantidad"], item["precio_unitario"], total, ahora),
        )


def borrar(conn: sqlite3.Connection, cliente: str) -> None:
    conn.execute("DELETE FROM CONSUMO_TEMPORAL WHERE sesion_id = ?", (cliente,))
