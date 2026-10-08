import sqlite3
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.services import negocio_service
from app.services.productos_service import TABLAS_CAMPOS, ajustar_saldo
from app.services.rangos import tabla_de_codigo


class FacturacionError(Exception):
    pass


def _prefijo_de_caja(conn: sqlite3.Connection, caja: str) -> str:
    fila = conn.execute("SELECT prefijo FROM CAJAS WHERE nombre = ?", (caja,)).fetchone()
    if fila is None:
        raise FacturacionError(f"No se encontro caja para el usuario {caja}")
    return fila["prefijo"]


def _proximo_correlativo(conn: sqlite3.Connection, caja: str) -> int:
    fila = conn.execute("SELECT MAX(numero_correlativo) AS ultimo FROM FACTURAS WHERE caja = ?", (caja,)).fetchone()
    ultimo = fila["ultimo"] if fila["ultimo"] is not None else 0
    return ultimo + 1


def proximo_numero_tentativo(conn: sqlite3.Connection, caja: str) -> str:
    prefijo = _prefijo_de_caja(conn, caja)
    correlativo = _proximo_correlativo(conn, caja)
    return f"{prefijo}-{correlativo:07d}"


def _armar_texto_recibo(
    numero_factura: str,
    fecha: datetime,
    usuario: str,
    cliente: str,
    medio_pago: str,
    multipago_efectivo: float | None,
    multipago_transferencia: float | None,
    lineas: list[dict],
    total: float,
    negocio: dict,
) -> str:
    fecha_txt = f"{fecha.day}/{fecha.month}/{fecha.year} - {fecha.hour}:{fecha.minute}"
    partes = [
        *negocio_service.encabezado_ticket(negocio),
        "=" * 56,
        f"Fact:\t\t{numero_factura}\t\t\t{fecha_txt}",
        "=" * 56,
        f"Atendido por:\t\t\t{usuario}",
        f"Cliente:\t\t\t{cliente}",
    ]
    if medio_pago == "Multipago":
        partes.append("Medio de Pago:\t\t\tMultipago")
        partes.append(f"  Efectivo:\t\t\t${multipago_efectivo:,.0f}")
        partes.append(f"  Transferencia:\t\t${multipago_transferencia:,.0f}")
    else:
        partes.append(f"Medio de Pago:\t\t\t{medio_pago}")
    partes.append("=" * 56)
    partes.append("Items\t\t\t\tCant.\tCosto Items")
    partes.append("-" * 56)
    for linea in lineas:
        partes.append(f"{linea['nombre']}\t\t\t{linea['cantidad']}\t${linea['precio_total']:,.0f}")
    partes.append("-" * 56)
    partes.append(f" Total:\t\t\t\t\t$ {total:,.2f}")
    partes.append("*" * 56)
    partes.append(negocio.get("pie_ticket") or "Lo esperamos pronto")
    return "\n".join(partes)


def confirmar_factura(
    conn: sqlite3.Connection,
    caja: str,
    usuario: str,
    cliente: str,
    medio_pago: str,
    items: list[dict],
    multipago_efectivo: float | None = None,
    multipago_transferencia: float | None = None,
    sesion_pool_id: int | None = None,
) -> dict:
    if not items:
        raise FacturacionError("No hay productos para facturar")

    conn.execute("BEGIN IMMEDIATE")
    try:
        prefijo = _prefijo_de_caja(conn, caja)
        correlativo = _proximo_correlativo(conn, caja)
        numero_factura = f"{prefijo}-{correlativo:07d}"
        fecha = datetime.now()

        lineas = []
        total = 0.0
        for item in items:
            tabla = tabla_de_codigo(item["codigo"])
            if tabla is None:
                raise FacturacionError(f"Codigo de producto invalido: {item['codigo']}")
            campos = TABLAS_CAMPOS[tabla]
            fila = conn.execute(
                f"SELECT {campos['nombre']} AS nombre, CAST({campos['precio']} AS REAL) AS precio FROM {tabla} WHERE {campos['codigo']} = ?",
                (item["codigo"],),
            ).fetchone()
            if fila is None:
                raise FacturacionError(f"Producto no encontrado: {item['codigo']}")
            precio_total = item["cantidad"] * fila["precio"]
            total += precio_total
            lineas.append(
                {
                    "codigo": item["codigo"],
                    "nombre": fila["nombre"],
                    "cantidad": item["cantidad"],
                    "precio_unitario": fila["precio"],
                    "precio_total": precio_total,
                    "tabla": tabla,
                }
            )

        cursor = conn.execute(
            """INSERT INTO FACTURAS (
                caja, numero_correlativo, numero_factura, fecha,
                usuario, cliente, metodo_pago, total,
                multipago_efectivo, multipago_transferencia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                caja,
                correlativo,
                numero_factura,
                fecha.strftime("%Y-%m-%d %H:%M:%S"),
                usuario,
                cliente,
                medio_pago,
                total,
                multipago_efectivo if medio_pago == "Multipago" else None,
                multipago_transferencia if medio_pago == "Multipago" else None,
            ),
        )
        factura_id = cursor.lastrowid

        for linea in lineas:
            conn.execute(
                """INSERT INTO DETALLE_FACTURA (
                    factura_id, codigo_producto, producto, cantidad, precio_unitario, precio_total
                ) VALUES (?, ?, ?, ?, ?, ?)""",
                (factura_id, linea["codigo"], linea["nombre"], linea["cantidad"], linea["precio_unitario"], linea["precio_total"]),
            )
            # Se descuenta stock de todos los rubros, incluido Mesa Pool: en el
            # Tkinter original ese descuento faltaba para Mesa Pool (bug conocido,
            # corregido aca por decision por defecto tomada con el usuario).
            ajustar_saldo(conn, linea["tabla"], linea["codigo"], -linea["cantidad"])

        if sesion_pool_id is not None:
            conn.execute("UPDATE SESION_POOL SET facturado = 1 WHERE id = ?", (sesion_pool_id,))

        texto_recibo = _armar_texto_recibo(
            numero_factura, fecha, usuario, cliente, medio_pago,
            multipago_efectivo, multipago_transferencia, lineas, total,
            negocio_service.obtener(conn),
        )
        _guardar_recibo_archivo(caja, numero_factura, texto_recibo)

        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise

    return {
        "numero_factura": numero_factura,
        "fecha": fecha.strftime("%Y-%m-%d %H:%M:%S"),
        "total": total,
        "texto_recibo": texto_recibo,
    }


def _guardar_recibo_archivo(caja: str, numero_factura: str, texto: str) -> None:
    carpeta = Path(settings.receipts_dir_resolved) / caja
    carpeta.mkdir(parents=True, exist_ok=True)
    (carpeta / f"{numero_factura}.txt").write_text(texto, encoding="utf-8")
