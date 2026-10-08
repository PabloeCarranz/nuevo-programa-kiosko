import smtplib
import sqlite3
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

from app.config import settings

FECHA_SIN_CIERRE_PREVIO = "2000-01-01 00:00:00"


def _asegurar_tabla_cierres2(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS cierres2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            fecha TEXT,
            fecha_hora TEXT
        )"""
    )


def obtener_fecha_ultimo_cierre(conn: sqlite3.Connection, usuario: str) -> str:
    _asegurar_tabla_cierres2(conn)
    fila = conn.execute(
        "SELECT fecha_hora FROM cierres2 WHERE usuario = ? ORDER BY id DESC LIMIT 1", (usuario,)
    ).fetchone()
    return fila["fecha_hora"] if fila else FECHA_SIN_CIERRE_PREVIO


def obtener_resumen(conn: sqlite3.Connection, usuario: str) -> dict:
    desde = obtener_fecha_ultimo_cierre(conn, usuario)

    totales_por_metodo = conn.execute(
        """SELECT metodo_pago,
                  SUM(total) AS total,
                  SUM(multipago_efectivo) AS efectivo,
                  SUM(multipago_transferencia) AS transferencia
           FROM FACTURAS
           WHERE caja = ? AND activo = 1 AND fecha > ?
           GROUP BY metodo_pago
           ORDER BY metodo_pago""",
        (usuario, desde),
    ).fetchall()

    lineas_por_metodo = conn.execute(
        """SELECT f.metodo_pago, d.producto, SUM(d.cantidad) AS cantidad, SUM(d.precio_total) AS total
           FROM FACTURAS f JOIN DETALLE_FACTURA d ON d.factura_id = f.id
           WHERE f.caja = ? AND f.activo = 1 AND d.activo = 1 AND f.fecha > ?
           GROUP BY f.metodo_pago, d.producto
           ORDER BY f.metodo_pago, d.producto""",
        (usuario, desde),
    ).fetchall()

    grupos = []
    for fila in totales_por_metodo:
        metodo = fila["metodo_pago"]
        lineas = [
            {"producto": linea["producto"], "cantidad": linea["cantidad"], "total": linea["total"]}
            for linea in lineas_por_metodo
            if linea["metodo_pago"] == metodo
        ]
        grupo = {"metodo_pago": metodo, "lineas": lineas, "total": fila["total"] or 0}
        if metodo == "Multipago":
            grupo["efectivo"] = fila["efectivo"] or 0
            grupo["transferencia"] = fila["transferencia"] or 0
        grupos.append(grupo)

    total_general = sum(g["total"] for g in grupos)
    return {"desde": desde, "grupos": grupos, "total_general": total_general}


def _armar_texto_reporte(usuario: str, resumen: dict) -> str:
    ahora = datetime.now()
    partes = [
        f"Cierre de Caja — {usuario}",
        f"Fecha: {ahora.strftime('%Y-%m-%d %H:%M:%S')}",
        f"Periodo desde: {resumen['desde']}",
        "=" * 56,
    ]
    for grupo in resumen["grupos"]:
        partes.append(f"\nMedio de pago: {grupo['metodo_pago']}")
        partes.append("-" * 56)
        for linea in grupo["lineas"]:
            partes.append(f"{linea['producto']}\t\t{linea['cantidad']}\t${linea['total']:,.0f}")
        if grupo["metodo_pago"] == "Multipago":
            partes.append(f"  Efectivo: ${grupo['efectivo']:,.0f}")
            partes.append(f"  Transferencia: ${grupo['transferencia']:,.0f}")
        partes.append(f"Subtotal {grupo['metodo_pago']}: ${grupo['total']:,.0f}")
    partes.append("=" * 56)
    partes.append("RESUMEN DE CIERRE")
    for grupo in resumen["grupos"]:
        partes.append(f"  {grupo['metodo_pago']}: ${grupo['total']:,.0f}")
    partes.append(f"TOTAL GENERAL: ${resumen['total_general']:,.0f}")
    return "\n".join(partes)


def _enviar_por_email(asunto: str, cuerpo: str, nombre_archivo: str) -> bool:
    if not settings.smtp_user or not settings.smtp_password or not settings.smtp_destinatario:
        return False  # SMTP no configurado: se omite el envio sin romper el cierre
    msg = EmailMessage()
    msg["Subject"] = asunto
    msg["From"] = settings.smtp_user
    msg["To"] = settings.smtp_destinatario
    msg.set_content(cuerpo)
    msg.add_attachment(cuerpo.encode("utf-8"), maintype="text", subtype="plain", filename=nombre_archivo)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
    return True


def confirmar_cierre(conn: sqlite3.Connection, usuario: str) -> dict:
    _asegurar_tabla_cierres2(conn)
    resumen = obtener_resumen(conn, usuario)
    texto = _armar_texto_reporte(usuario, resumen)

    ahora = datetime.now()
    nombre_archivo = f"reporte_cierre_{usuario}_{ahora.strftime('%Y-%m-%d_%H-%M-%S')}.txt"
    carpeta = Path(settings.cierres_dir_resolved)
    carpeta.mkdir(parents=True, exist_ok=True)
    (carpeta / nombre_archivo).write_text(texto, encoding="utf-8")

    try:
        email_enviado = _enviar_por_email(f"Cierre de caja {usuario} {ahora.strftime('%Y-%m-%d')}", texto, nombre_archivo)
    except Exception:
        email_enviado = False  # no se rompe el cierre si el mail falla

    conn.execute(
        "INSERT INTO cierres2 (usuario, fecha, fecha_hora) VALUES (?, ?, ?)",
        (usuario, ahora.strftime("%Y-%m-%d"), ahora.strftime("%Y-%m-%d %H:%M:%S")),
    )

    return {"archivo": nombre_archivo, "email_enviado": email_enviado, "texto": texto, "total_general": resumen["total_general"]}
