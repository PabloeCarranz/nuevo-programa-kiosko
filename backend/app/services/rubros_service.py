"""Rubros configurables (tabla RUBROS).

Cada rubro tiene su propia tabla de productos y un rango de codigos de 5
cifras; el rango es lo que permite saber de que rubro es un codigo escaneado.
Los 4 rubros originales (GOLOSINAS, BEBIDAS, CIGARROS, MESA_POOL) se registran
solos la primera vez; los nuevos crean una tabla RUBRO_<n>.

Al final de cada cambio se llama a rangos.recargar(), que actualiza los
diccionarios en memoria que usa el resto del backend.
"""

import sqlite3

from app.services import rangos

# Los 4 de siempre. La columna de nombre en NEGOCIO es la que usaba la version
# anterior para que el negocio los renombre: se respeta al migrar.
ORIGINALES = [
    # clave, tabla, desde, hasta, emoji, columna NEGOCIO, nombre por defecto, es_tiempo
    ("golosinas", "GOLOSINAS", 20000, 29999, "🍬", "rubro_golosinas", "Kiosco", 0),
    ("bebidas", "BEBIDAS", 30000, 39999, "🥤", "rubro_bebidas", "Bebidas", 0),
    ("cigarros", "CIGARROS", 40000, 49999, "🍔", "rubro_cigarros", "Cocina", 0),
    ("mesa_pool", "MESA_POOL", 90000, 100000, "⏱️", "rubro_mesa_pool", "Tiempo y varios", 1),
]

# Bloques de codigos libres para rubros nuevos (codigos de 5 cifras: los de
# 6 o mas se toman como codigo de barras en la busqueda).
TAMANIO_BLOQUE = 5000
BLOQUES_LIBRES = [(d, d + TAMANIO_BLOQUE - 1) for d in (10000, 15000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000)]

MAX_NOMBRE = 24


class RubroError(ValueError):
    pass


def asegurar_tabla(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS RUBROS (
            clave TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '',
            tabla TEXT NOT NULL UNIQUE,
            desde INTEGER NOT NULL,
            hasta INTEGER NOT NULL,
            orden INTEGER NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1,
            es_tiempo INTEGER NOT NULL DEFAULT 0
        )"""
    )
    if conn.execute("SELECT COUNT(*) FROM RUBROS").fetchone()[0] == 0:
        _sembrar_originales(conn)
    rangos.recargar(conn)


def _sembrar_originales(conn: sqlite3.Connection) -> None:
    negocio = conn.execute("SELECT * FROM NEGOCIO WHERE id = 1").fetchone()
    for orden, (clave, tabla, desde, hasta, emoji, col_negocio, por_defecto, es_tiempo) in enumerate(ORIGINALES):
        nombre = (negocio[col_negocio] if negocio and negocio[col_negocio] else por_defecto).strip()
        conn.execute(
            "INSERT INTO RUBROS (clave, nombre, emoji, tabla, desde, hasta, orden, activo, es_tiempo) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
            (clave, nombre, emoji, tabla, desde, hasta, orden, es_tiempo),
        )


def listar(conn: sqlite3.Connection) -> list[dict]:
    filas = conn.execute(
        "SELECT clave, nombre, emoji, desde, hasta, orden, activo, es_tiempo FROM RUBROS ORDER BY orden"
    ).fetchall()
    return [{**dict(f), "activo": bool(f["activo"]), "es_tiempo": bool(f["es_tiempo"])} for f in filas]


def _validar_nombres(rubros: list[dict]) -> None:
    vistos = set()
    for r in rubros:
        nombre = r["nombre"].strip()
        if not nombre:
            raise RubroError("Ningun rubro puede quedar sin nombre")
        if len(nombre) > MAX_NOMBRE:
            raise RubroError(f"El nombre '{nombre}' es muy largo (maximo {MAX_NOMBRE})")
        clave_nombre = nombre.casefold()
        if clave_nombre in vistos:
            raise RubroError(f"Hay dos rubros que se llaman '{nombre}'")
        vistos.add(clave_nombre)


def _bloque_libre(conn: sqlite3.Connection) -> tuple[int, int]:
    usados = {f["desde"] for f in conn.execute("SELECT desde FROM RUBROS").fetchall()}
    for desde, hasta in BLOQUES_LIBRES:
        if desde not in usados:
            return desde, hasta
    raise RubroError("No se pueden agregar mas rubros (se usaron todos los rangos de codigos)")


def _crear_tabla_productos(conn: sqlite3.Connection, tabla: str) -> None:
    # Mismo esquema que GOLOSINAS/BEBIDAS/CIGARROS, asi el resto del sistema
    # (venta, stock, kardex, ingresos) la trata igual que a esas.
    conn.execute(
        f"""CREATE TABLE IF NOT EXISTS {tabla} (ID INTEGER PRIMARY KEY AUTOINCREMENT, CODIGO INTEGER, NOMBRE_PRODUCTO TEXT,
            CANTIDAD INTEGER, PRECIO REAL, activo INTEGER DEFAULT 1, barras_codigo TEXT, SALDO_FINAL INTEGER DEFAULT 0)"""
    )
    conn.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{tabla.lower()}_codigo ON {tabla}(CODIGO)")


def guardar_todos(conn: sqlite3.Connection, rubros: list[dict]) -> list[dict]:
    """Aplica la lista completa que edito el Master: el orden de la lista es el
    orden en pantalla; los que vienen sin clave son rubros nuevos. Todo o nada."""
    _validar_nombres(rubros)
    existentes = {f["clave"] for f in conn.execute("SELECT clave FROM RUBROS").fetchall()}
    claves_recibidas = {r["clave"] for r in rubros if r.get("clave")}
    if claves_recibidas - existentes:
        raise RubroError("Uno de los rubros ya no existe; cerra y volve a abrir la ventana")
    if existentes - claves_recibidas:
        raise RubroError("Los rubros no se pueden borrar, solo ocultar")

    conn.execute("BEGIN IMMEDIATE")
    try:
        for orden, r in enumerate(rubros):
            nombre, emoji, activo = r["nombre"].strip(), r.get("emoji", "").strip(), 1 if r.get("activo", True) else 0
            if r.get("clave"):
                conn.execute(
                    "UPDATE RUBROS SET nombre = ?, emoji = ?, activo = ?, orden = ? WHERE clave = ?",
                    (nombre, emoji, activo, orden, r["clave"]),
                )
            else:
                desde, hasta = _bloque_libre(conn)
                numero = conn.execute("SELECT COUNT(*) FROM RUBROS").fetchone()[0] + 1
                while conn.execute("SELECT 1 FROM RUBROS WHERE clave = ?", (f"rubro{numero}",)).fetchone():
                    numero += 1
                clave, tabla = f"rubro{numero}", f"RUBRO_{numero}"
                _crear_tabla_productos(conn, tabla)
                conn.execute(
                    "INSERT INTO RUBROS (clave, nombre, emoji, tabla, desde, hasta, orden, activo, es_tiempo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
                    (clave, nombre, emoji, tabla, desde, hasta, orden, activo),
                )
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    rangos.recargar(conn)
    return listar(conn)
