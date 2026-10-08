import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, get_current_user, require_master
from app.models.pool import ActualizarFacturadoRequest, DetenerSesionResponse, IniciarSesionRequest, SesionPoolResponse
from app.services import pool_service

router = APIRouter(prefix="/pool", tags=["pool"])


@router.get("/sesiones", response_model=list[SesionPoolResponse])
def listar(
    estado: str | None = None,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    return [dict(fila) for fila in pool_service.listar_sesiones(conn, estado)]


@router.get("/sesiones/activa/{cliente}", response_model=SesionPoolResponse | None)
def activa(
    cliente: str,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    fila = pool_service.obtener_sesion_activa(conn, cliente)
    return dict(fila) if fila else None


@router.post("/sesiones/iniciar", response_model=SesionPoolResponse)
def iniciar(
    body: IniciarSesionRequest,
    conn: sqlite3.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    fila = pool_service.iniciar_sesion(conn, body.cliente, user.usuario)
    return dict(fila)


@router.post("/sesiones/{sesion_id}/detener", response_model=DetenerSesionResponse)
def detener(
    sesion_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    try:
        return pool_service.detener_sesion(conn, sesion_id, user.usuario)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.post("/sesiones/{sesion_id}/facturado")
def actualizar_facturado(
    sesion_id: int,
    body: ActualizarFacturadoRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    pool_service.actualizar_facturado(conn, sesion_id, body.facturado, body.comentario)
    return {"ok": True}


@router.delete("/sesiones/{sesion_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar(
    sesion_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    pool_service.borrar_sesion(conn, sesion_id)
