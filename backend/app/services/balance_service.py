import sqlite3


def obtener_balance(
    conn: sqlite3.Connection,
    desde: str | None,
    hasta: str | None,
    metodo_pago: str | None,
    caja: str | None,
) -> dict:
    query = "SELECT * FROM FACTURAS WHERE activo = 1"
    params: list = []
    if desde:
        query += " AND fecha >= ?"
        params.append(desde)
    if hasta:
        query += " AND fecha <= ?"
        params.append(hasta + " 23:59:59")
    if metodo_pago and metodo_pago != "Todos":
        query += " AND metodo_pago = ?"
        params.append(metodo_pago)
    if caja and caja != "Todas":
        query += " AND caja = ?"
        params.append(caja)
    query += " ORDER BY fecha DESC"
    facturas = [dict(f) for f in conn.execute(query, params).fetchall()]

    totales = {"Efectivo": 0.0, "Transferencia": 0.0, "Cuenta": 0.0, "Multipago": 0.0}
    for f in facturas:
        metodo = f["metodo_pago"]
        if metodo in totales:
            totales[metodo] += f["total"]
    total_general = sum(totales.values())

    return {"facturas": facturas, "totales": totales, "total_general": total_general}


def opciones_filtro(conn: sqlite3.Connection) -> dict:
    metodos = [f["metodo_pago"] for f in conn.execute("SELECT DISTINCT metodo_pago FROM FACTURAS").fetchall()]
    cajas = [f["caja"] for f in conn.execute("SELECT DISTINCT caja FROM FACTURAS").fetchall()]
    return {"metodos_pago": metodos, "cajas": cajas}
