import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, require_master
from app.services import facturas_service

router = APIRouter(prefix="/facturas", tags=["facturas"])


@router.get("")
def listar(
    fecha: str | None = None,
    caja: str | None = None,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    return facturas_service.listar(conn, fecha, caja)


@router.get("/anuladas")
def anuladas(
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    return facturas_service.listar_anuladas(conn)


@router.get("/{factura_id}")
def detalle(
    factura_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    try:
        return facturas_service.obtener_detalle(conn, factura_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.post("/{factura_id}/anular")
def anular(
    factura_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    try:
        facturas_service.anular(conn, factura_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return {"ok": True}
