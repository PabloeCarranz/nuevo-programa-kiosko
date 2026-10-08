import sqlite3

CAMPOS = (
    "nombre",
    "subtitulo",
    "direccion",
    "telefono",
    "pie_ticket",
    "rubro_golosinas",
    "rubro_bebidas",
    "rubro_cigarros",
    "rubro_mesa_pool",
)

POR_DEFECTO = {
    "nombre": "Mi Negocio",
    "subtitulo": "",
    "direccion": "",
    "telefono": "",
    "pie_ticket": "Lo esperamos pronto",
    "rubro_golosinas": "Kiosco",
    "rubro_bebidas": "Bebidas",
    "rubro_cigarros": "Cocina",
    "rubro_mesa_pool": "Tiempo y varios",
}


def asegurar_tabla(conn: sqlite3.Connection) -> None:
    """Crea la tabla NEGOCIO si la base es anterior a la version en blanco."""
    conn.execute(
        """CREATE TABLE IF NOT EXISTS NEGOCIO (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            nombre TEXT NOT NULL,
            subtitulo TEXT NOT NULL DEFAULT '',
            direccion TEXT NOT NULL DEFAULT '',
            telefono TEXT NOT NULL DEFAULT '',
            pie_ticket TEXT NOT NULL DEFAULT '',
            rubro_golosinas TEXT NOT NULL DEFAULT 'Kiosco',
            rubro_bebidas TEXT NOT NULL DEFAULT 'Bebidas',
            rubro_cigarros TEXT NOT NULL DEFAULT 'Cocina',
            rubro_mesa_pool TEXT NOT NULL DEFAULT 'Tiempo y varios'
        )"""
    )


def obtener(conn: sqlite3.Connection) -> dict:
    asegurar_tabla(conn)
    fila = conn.execute(f"SELECT {', '.join(CAMPOS)} FROM NEGOCIO WHERE id = 1").fetchone()
    return dict(fila) if fila else dict(POR_DEFECTO)


def guardar(conn: sqlite3.Connection, datos: dict) -> dict:
    asegurar_tabla(conn)
    valores = [datos[c] for c in CAMPOS]
    conn.execute(
        f"""INSERT INTO NEGOCIO (id, {', '.join(CAMPOS)}) VALUES (1, {', '.join('?' for _ in CAMPOS)})
            ON CONFLICT(id) DO UPDATE SET {', '.join(f'{c} = excluded.{c}' for c in CAMPOS)}""",
        valores,
    )
    return obtener(conn)


def encabezado_ticket(negocio: dict) -> list[str]:
    lineas = [negocio["nombre"].upper()]
    for campo in ("subtitulo", "direccion", "telefono"):
        if negocio.get(campo):
            lineas.append(negocio[campo])
    return lineas
