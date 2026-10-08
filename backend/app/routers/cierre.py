import sqlite3

from fastapi import APIRouter, Depends

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.cierre import ConfirmarCierreResponse, ResumenCierreResponse
from app.services import cierre_service

router = APIRouter(prefix="/cierre", tags=["cierre"])


@router.get("/resumen", response_model=ResumenCierreResponse)
def resumen(
    conn: sqlite3.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    return cierre_service.obtener_resumen(conn, user.usuario)


@router.post("/confirmar", response_model=ConfirmarCierreResponse)
def confirmar(
    conn: sqlite3.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    return cierre_service.confirmar_cierre(conn, user.usuario)
