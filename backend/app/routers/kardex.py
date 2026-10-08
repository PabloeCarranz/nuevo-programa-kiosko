import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.services import kardex_service

router = APIRouter(prefix="/kardex", tags=["kardex"])


@router.get("/{codigo}")
def obtener(
    codigo: int,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    try:
        return kardex_service.obtener_movimientos(conn, codigo)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
