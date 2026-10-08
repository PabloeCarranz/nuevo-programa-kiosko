import sqlite3
from contextlib import contextmanager

from app.config import settings


def _connect() -> sqlite3.Connection:
    # isolation_level=None => autocommit real: cada sentencia se confirma sola.
    # Las operaciones que necesitan atomicidad (p.ej. generar un correlativo)
    # abren su propia transaccion explicita con "BEGIN IMMEDIATE" (ver
    # services/facturacion_service.py), lo que sirve de lock real a nivel
    # SQLite incluso si el dia de manana corren varios workers/procesos.
    # check_same_thread=False: FastAPI ejecuta cada endpoint sync en un thread
    # del pool, y el cierre de la conexion (al final del generator de get_db)
    # puede caer en un thread distinto al que la abrio. No hay uso concurrente
    # real de la misma conexion entre threads, asi que relajar el chequeo es seguro.
    conn = sqlite3.connect(settings.db_path_resolved, timeout=5, isolation_level=None, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    # foreign_keys se deja OFF a proposito: el Tkinter original nunca lo activo,
    # y CONSUMO_TEMPORAL.sesion_id guarda el NOMBRE del cliente pese a estar
    # declarada como FK a SESION_POOL(id) (ver [[project_react_migration]] /
    # gap conocido, no confirmado para corregir todavia). Activar foreign_keys
    # rompe ese flujo real sin que el usuario haya decidido migrar ese modelo.
    return conn


def get_db():
    conn = _connect()
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def db_session():
    conn = _connect()
    try:
        yield conn
    finally:
        conn.close()
