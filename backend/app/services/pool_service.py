import sqlite3
from datetime import datetime


def obtener_sesion_activa(conn: sqlite3.Connection, cliente: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM SESION_POOL WHERE cliente = ? AND estado = 'ABIERTA' ORDER BY id DESC LIMIT 1",
        (cliente,),
    ).fetchone()


def iniciar_sesion(conn: sqlite3.Connection, cliente: str, usuario: str) -> sqlite3.Row:
    existente = obtener_sesion_activa(conn, cliente)
    if existente is not None:
        return existente
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor = conn.execute(
        "INSERT INTO SESION_POOL (cliente, inicio_tiempo, estado, usuario_inicia, facturado) VALUES (?, ?, 'ABIERTA', ?, 0)",
        (cliente, ahora, usuario),
    )
    return conn.execute("SELECT * FROM SESION_POOL WHERE id = ?", (cursor.lastrowid,)).fetchone()


def detener_sesion(conn: sqlite3.Connection, sesion_id: int, usuario: str) -> dict:
    sesion = conn.execute("SELECT * FROM SESION_POOL WHERE id = ?", (sesion_id,)).fetchone()
    if sesion is None:
        raise ValueError("Sesion no encontrada")
    ahora = datetime.now()
    conn.execute(
        "UPDATE SESION_POOL SET fin_tiempo = ?, estado = 'CERRADA', usuario_termina = ? WHERE id = ?",
        (ahora.strftime("%Y-%m-%d %H:%M:%S"), usuario, sesion_id),
    )
    inicio = datetime.strptime(sesion["inicio_tiempo"], "%Y-%m-%d %H:%M:%S")
    duracion = ahora - inicio
    return {
        "id": sesion_id,
        "cliente": sesion["cliente"],
        "inicio_tiempo": sesion["inicio_tiempo"],
        "fin_tiempo": ahora.strftime("%Y-%m-%d %H:%M:%S"),
        "duracion_segundos": int(duracion.total_seconds()),
    }


def listar_sesiones(conn: sqlite3.Connection, estado: str | None = None) -> list[sqlite3.Row]:
    if estado:
        return conn.execute("SELECT * FROM SESION_POOL WHERE estado = ? ORDER BY id DESC", (estado,)).fetchall()
    return conn.execute("SELECT * FROM SESION_POOL ORDER BY id DESC").fetchall()


def actualizar_facturado(conn: sqlite3.Connection, sesion_id: int, facturado: bool, comentario: str | None) -> None:
    if comentario is not None:
        conn.execute(
            "UPDATE SESION_POOL SET facturado = ?, COMENTARIOS = ? WHERE id = ?",
            (1 if facturado else 0, comentario, sesion_id),
        )
    else:
        conn.execute("UPDATE SESION_POOL SET facturado = ? WHERE id = ?", (1 if facturado else 0, sesion_id))


def borrar_sesion(conn: sqlite3.Connection, sesion_id: int) -> None:
    conn.execute("DELETE FROM SESION_POOL WHERE id = ?", (sesion_id,))
