import sqlite3

MAX_CLIENTES = 54


def listar_clientes(conn: sqlite3.Connection) -> list[dict]:
    filas = conn.execute("SELECT id, nombre FROM CLIENTES ORDER BY id").fetchall()
    activos = {
        fila["cliente"]
        for fila in conn.execute("SELECT cliente FROM SESION_POOL WHERE estado = 'ABIERTA'").fetchall()
    }
    return [
        {"id": fila["id"], "nombre": fila["nombre"], "sesion_pool_activa": fila["nombre"] in activos}
        for fila in filas
    ]


def contar_clientes(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) AS n FROM CLIENTES").fetchone()["n"]


def crear_cliente(conn: sqlite3.Connection, nombre: str) -> int:
    cursor = conn.execute("INSERT INTO CLIENTES (nombre) VALUES (?)", (nombre,))
    return cursor.lastrowid


def borrar_cliente(conn: sqlite3.Connection, cliente_id: int) -> bool:
    cursor = conn.execute("DELETE FROM CLIENTES WHERE id = ?", (cliente_id,))
    return cursor.rowcount > 0
