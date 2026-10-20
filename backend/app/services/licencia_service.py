"""Licencia: 7 dias de prueba gratis y despues activacion con un codigo atado a la PC.

- La prueba arranca la primera vez que el programa mira su estado. La fecha de
  inicio se guarda en la base (tabla LICENCIA) y en un archivo aparte
  (settings.licencia_dir_resolved). Si falta una de las dos copias se usa la otra,
  y si difieren manda la mas antigua: borrar la base no reinicia la prueba.
- Se recuerda la ultima fecha vista; si el reloj de la PC se atrasa, se sigue
  contando desde esa fecha, asi que atrasarlo no devuelve dias.
- El codigo lo firma el vendedor (scripts/emitir_codigo.py) para el ID de una PC
  concreta. Aca solo se verifica con la clave publica (licencia_codigo.py).
"""

import hashlib
import json
import math
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

from app.config import settings
from app.db import db_session
from app.licencia_codigo import codigo_valido, formatear_codigo, leer_codigo

DIAS_PRUEBA = 7
_VIGENCIA_CACHE_SEG = 30  # cuanto se reutiliza el estado calculado entre pedidos
_GUARDAR_CADA_SEG = 60  # cada cuanto se anota "ultima fecha vista"

_cache: tuple[float, dict] | None = None


def _huella_equipo() -> str:
    if sys.platform == "win32":
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Cryptography",
                0,
                winreg.KEY_READ | winreg.KEY_WOW64_64KEY,
            ) as clave:
                return winreg.QueryValueEx(clave, "MachineGuid")[0]
        except OSError:
            pass
    else:
        for ruta in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
            try:
                return Path(ruta).read_text().strip()
            except OSError:
                continue
    return str(uuid.getnode())


@lru_cache(maxsize=1)
def id_equipo() -> str:
    """ID corto de esta PC (12 caracteres), derivado del identificador de Windows."""
    h = hashlib.sha256(f"caja-neon|{_huella_equipo()}".encode()).hexdigest()[:12].upper()
    return f"{h[:4]}-{h[4:8]}-{h[8:]}"


def _ruta_archivo() -> Path:
    return settings.licencia_dir_resolved / "licencia.json"


def _leer_db(conn: sqlite3.Connection) -> dict:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS LICENCIA (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            inicio TEXT,
            ultimo_uso TEXT,
            codigo TEXT NOT NULL DEFAULT ''
        )"""
    )
    fila = conn.execute("SELECT inicio, ultimo_uso, codigo FROM LICENCIA WHERE id = 1").fetchone()
    return dict(fila) if fila else {}


def _leer_archivo() -> dict:
    try:
        datos = json.loads(_ruta_archivo().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return datos if isinstance(datos, dict) else {}


def _guardar(conn: sqlite3.Connection, datos: dict) -> None:
    conn.execute(
        """INSERT INTO LICENCIA (id, inicio, ultimo_uso, codigo) VALUES (1, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET inicio = excluded.inicio, ultimo_uso = excluded.ultimo_uso,
                                         codigo = excluded.codigo""",
        (datos["inicio"], datos["ultimo_uso"], datos["codigo"]),
    )
    try:
        ruta = _ruta_archivo()
        ruta.parent.mkdir(parents=True, exist_ok=True)
        ruta.write_text(json.dumps(datos), encoding="utf-8")
    except OSError:
        pass  # la base ya tiene los datos; el archivo es solo una segunda copia


def _fecha(texto: object) -> datetime | None:
    try:
        fecha = datetime.fromisoformat(str(texto))
    except ValueError:
        return None
    return fecha if fecha.tzinfo else fecha.replace(tzinfo=timezone.utc)


def _codigo_canonico(candidato: object, ident: str) -> str:
    """El codigo en formato normal si es valido para esta PC; si no, ''."""
    if isinstance(candidato, str) and candidato and codigo_valido(candidato, ident):
        return formatear_codigo(leer_codigo(candidato))
    return ""


def calcular_estado(conn: sqlite3.Connection, codigo_nuevo: str | None = None) -> dict:
    ahora = datetime.now(timezone.utc)
    ident = id_equipo()
    db, archivo = _leer_db(conn), _leer_archivo()

    codigo = next(
        (c for c in (_codigo_canonico(x, ident) for x in (codigo_nuevo, db.get("codigo"), archivo.get("codigo"))) if c),
        "",
    )
    inicios = [f for f in (_fecha(d.get("inicio")) for d in (db, archivo)) if f]
    usos = [f for f in (_fecha(d.get("ultimo_uso")) for d in (db, archivo)) if f]

    # Un reloj atrasado no devuelve dias de prueba: se cuenta desde la ultima fecha vista.
    ahora_efectivo = max([ahora, *usos])
    inicio = min(inicios, default=ahora_efectivo)

    nuevo = {
        "inicio": inicio.isoformat(timespec="seconds"),
        "ultimo_uso": ahora_efectivo.isoformat(timespec="seconds"),
        "codigo": codigo,
    }
    ultimo_guardado = max(usos, default=None)
    if (
        ultimo_guardado is None
        or (ahora_efectivo - ultimo_guardado).total_seconds() >= _GUARDAR_CADA_SEG
        or any(d.get("inicio") != nuevo["inicio"] or (d.get("codigo") or "") != codigo for d in (db, archivo))
    ):
        _guardar(conn, nuevo)

    if codigo:
        estado, dias_restantes = "activada", 0
    else:
        restante = timedelta(days=DIAS_PRUEBA) - (ahora_efectivo - inicio)
        dias_restantes = max(0, math.ceil(restante.total_seconds() / 86400))
        estado = "prueba" if restante.total_seconds() > 0 else "vencida"
    return {"estado": estado, "dias_restantes": dias_restantes, "dias_prueba": DIAS_PRUEBA, "id_equipo": ident}


def estado_actual() -> dict:
    global _cache
    if _cache and time.monotonic() - _cache[0] < _VIGENCIA_CACHE_SEG:
        return _cache[1]
    with db_session() as conn:
        estado = calcular_estado(conn)
    _cache = (time.monotonic(), estado)
    return estado


def activar(codigo: str) -> dict:
    """Guarda el codigo si es valido para esta PC. ValueError si no lo es."""
    global _cache
    if not codigo_valido(codigo, id_equipo()):
        raise ValueError("El codigo no es valido para este equipo")
    with db_session() as conn:
        estado = calcular_estado(conn, codigo)
    _cache = (time.monotonic(), estado)
    return estado
