import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, require_master
from app.models.ingresos import RegistrarIngresoRequest
from app.services import ingresos_service

router = APIRouter(prefix="/ingresos", tags=["ingresos"])


@router.get("/recientes")
def recientes(
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    return ingresos_service.listar_recientes(conn)


@router.post("")
def registrar(
    body: RegistrarIngresoRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    try:
        return ingresos_service.registrar_ingreso(conn, body.rubro, body.codigo, body.cantidad, body.comentario)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.delete("/{ingreso_id}", status_code=status.HTTP_204_NO_CONTENT)
def anular(
    ingreso_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    try:
        ingresos_service.anular_ingreso(conn, ingreso_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
