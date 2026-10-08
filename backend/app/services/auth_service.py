import sqlite3

from app.security import hash_password, verify_password

USUARIOS_MASTER = "Master"


def rol_de(usuario: str) -> str:
    return "master" if usuario == USUARIOS_MASTER else "caja"


def listar_usuarios(conn: sqlite3.Connection) -> list[str]:
    filas = conn.execute("SELECT nombre FROM usuarios ORDER BY nombre").fetchall()
    return [fila["nombre"] for fila in filas]


def verificar_credenciales(conn: sqlite3.Connection, usuario: str, password: str) -> bool:
    fila = conn.execute("SELECT password FROM usuarios WHERE nombre = ?", (usuario,)).fetchone()
    if fila is None:
        return False
    return verify_password(password, fila["password"])


def cambiar_password(conn: sqlite3.Connection, usuario_objetivo: str, actual: str, nueva: str) -> bool:
    if not verificar_credenciales(conn, usuario_objetivo, actual):
        return False
    conn.execute(
        "UPDATE usuarios SET password = ? WHERE nombre = ?",
        (hash_password(nueva), usuario_objetivo),
    )
    return True
