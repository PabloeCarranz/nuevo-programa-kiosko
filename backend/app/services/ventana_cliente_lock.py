"""Bloqueo global (todo el local, no por caja) para que solo pueda haber una
ventana de cliente abierta a la vez, igual que el comportamiento actual del
Tkinter (variable global de proceso). Es en memoria: alcanza para un unico
proceso backend; si el dia de manana se corre con varios workers/procesos
habria que pasar esto a una tabla en la base."""

_abierta: dict | None = None


def intentar_abrir(cliente: str, usuario: str) -> dict | None:
    global _abierta
    if _abierta is not None and _abierta["cliente"] != cliente:
        return _abierta
    _abierta = {"cliente": cliente, "usuario": usuario}
    return None


def cerrar(cliente: str) -> None:
    global _abierta
    if _abierta is not None and _abierta["cliente"] == cliente:
        _abierta = None


def estado() -> dict | None:
    return _abierta
