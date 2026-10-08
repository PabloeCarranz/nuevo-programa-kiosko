import sqlite3

# Los nombres de columna difieren entre GOLOSINAS/BEBIDAS/CIGARROS (mayusculas)
# y MESA_POOL (minusculas salvo BARRAS_CODIGO), tal como quedo en la base real.
TABLAS_CAMPOS = {
    "GOLOSINAS": {"codigo": "CODIGO", "nombre": "NOMBRE_PRODUCTO", "precio": "PRECIO", "barras": "barras_codigo", "activo": "activo", "saldo": "SALDO_FINAL"},
    "BEBIDAS": {"codigo": "CODIGO", "nombre": "NOMBRE_PRODUCTO", "precio": "PRECIO", "barras": "barras_codigo", "activo": "activo", "saldo": "SALDO_FINAL"},
    "CIGARROS": {"codigo": "CODIGO", "nombre": "NOMBRE_PRODUCTO", "precio": "PRECIO", "barras": "barras_codigo", "activo": "activo", "saldo": "SALDO_FINAL"},
    "MESA_POOL": {"codigo": "codigo", "nombre": "nombre_producto", "precio": "precio", "barras": "BARRAS_CODIGO", "activo": "activo", "saldo": "saldo_final"},
}

RUBRO_DE_TABLA = {
    "GOLOSINAS": "golosinas",
    "BEBIDAS": "bebidas",
    "CIGARROS": "cigarros",
    "MESA_POOL": "mesa_pool",
}


def buscar_producto(conn: sqlite3.Connection, codigo_str: str) -> dict | None:
    codigo_str = codigo_str.strip()
    if not codigo_str:
        return None
    por_barras = len(codigo_str) > 5

    for tabla, campos in TABLAS_CAMPOS.items():
        campo_busqueda = campos["barras"] if por_barras else campos["codigo"]
        fila = conn.execute(
            # CAST(...AS REAL): algunos productos viejos tienen PRECIO guardado
            # como texto vacio/invalido (nunca se validaba en el Tkinter original).
            # CAST lo convierte a 0.0 en vez de romper la respuesta tipada.
            f"""SELECT {campos['codigo']} AS codigo, {campos['nombre']} AS nombre, CAST({campos['precio']} AS REAL) AS precio
                FROM {tabla} WHERE {campo_busqueda} = ? AND {campos['activo']} = 1""",
            (codigo_str,),
        ).fetchone()
        if fila:
            return {
                "codigo": fila["codigo"],
                "nombre": fila["nombre"],
                "precio": fila["precio"],
                "rubro": RUBRO_DE_TABLA[tabla],
            }
    return None


def listar_por_rubro(conn: sqlite3.Connection, tabla: str) -> list[dict]:
    campos = TABLAS_CAMPOS[tabla]
    filas = conn.execute(
        f"""SELECT {campos['codigo']} AS codigo, {campos['nombre']} AS nombre, CAST({campos['precio']} AS REAL) AS precio
            FROM {tabla} WHERE {campos['activo']} = 1 ORDER BY {campos['codigo']}"""
    ).fetchall()
    return [dict(fila) for fila in filas]


def listar_todos(conn: sqlite3.Connection) -> list[dict]:
    """Todos los productos activos de todos los rubros, para el buscador alfabetico (F2)."""
    resultado = []
    for tabla, rubro in RUBRO_DE_TABLA.items():
        for producto in listar_por_rubro(conn, tabla):
            resultado.append({**producto, "rubro": rubro})
    resultado.sort(key=lambda p: p["nombre"].strip().lower())
    return resultado


def ajustar_saldo(conn: sqlite3.Connection, tabla: str, codigo: int, delta: int) -> None:
    """delta positivo repone stock, negativo lo descuenta (facturacion)."""
    campos = TABLAS_CAMPOS[tabla]
    conn.execute(
        f"UPDATE {tabla} SET {campos['saldo']} = {campos['saldo']} + ? WHERE {campos['codigo']} = ?",
        (delta, codigo),
    )


BASE_CODIGO_POR_TABLA = {"GOLOSINAS": 20000, "BEBIDAS": 30000, "CIGARROS": 40000, "MESA_POOL": 90001}


def crear_producto(conn: sqlite3.Connection, tabla: str, nombre: str, cantidad: float, precio: float, barras_codigo: str) -> int:
    campos = TABLAS_CAMPOS[tabla]
    maximo = conn.execute(f"SELECT MAX({campos['codigo']}) AS m FROM {tabla}").fetchone()["m"]
    codigo = (maximo + 1) if maximo is not None else BASE_CODIGO_POR_TABLA[tabla]
    conn.execute(
        f"""INSERT INTO {tabla} ({campos['codigo']}, {campos['nombre']}, CANTIDAD, {campos['precio']}, {campos['barras']}, {campos['activo']}, {campos['saldo']})
            VALUES (?, ?, ?, ?, ?, 1, ?)""",
        (codigo, nombre, cantidad, precio, barras_codigo, cantidad),
    )
    return codigo


def actualizar_producto(conn: sqlite3.Connection, tabla: str, codigo: int, nombre: str, precio: float, barras_codigo: str) -> None:
    campos = TABLAS_CAMPOS[tabla]
    conn.execute(
        f"UPDATE {tabla} SET {campos['nombre']} = ?, {campos['precio']} = ?, {campos['barras']} = ? WHERE {campos['codigo']} = ?",
        (nombre, precio, barras_codigo, codigo),
    )


def baja_producto(conn: sqlite3.Connection, tabla: str, codigo: int) -> None:
    campos = TABLAS_CAMPOS[tabla]
    conn.execute(f"UPDATE {tabla} SET {campos['activo']} = 0 WHERE {campos['codigo']} = ?", (codigo,))
