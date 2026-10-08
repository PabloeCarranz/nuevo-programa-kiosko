import sqlite3

from fastapi import APIRouter, Depends

from app.db import get_db
from app.deps import CurrentUser, require_master
from app.services import balance_service

router = APIRouter(prefix="/balance", tags=["balance"])


@router.get("")
def obtener(
    desde: str | None = None,
    hasta: str | None = None,
    metodo_pago: str | None = None,
    caja: str | None = None,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    return balance_service.obtener_balance(conn, desde, hasta, metodo_pago, caja)


@router.get("/opciones-filtro")
def opciones_filtro(
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    return balance_service.opciones_filtro(conn)
