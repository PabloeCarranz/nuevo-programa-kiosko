import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, require_master
from app.models.control_stock import GuardarInventarioRequest, RegistrarAjusteRequest
from app.services import ajustes_service, inventario_service

router = APIRouter(tags=["control-stock"])


@router.post("/inventario")
def guardar_inventario(
    body: GuardarInventarioRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    inventario_service.guardar_conteo(conn, body.fecha, [item.model_dump() for item in body.items])
    return {"ok": True}


@router.get("/inventario/diferencias")
def diferencias_inventario(
    fecha: str,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    return inventario_service.obtener_diferencias(conn, fecha)


@router.post("/ajustes")
def registrar_ajuste(
    body: RegistrarAjusteRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    try:
        return ajustes_service.registrar_ajuste(conn, body.tipo, body.codigo, body.cantidad, body.comentario, body.fecha)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.get("/ajustes/recientes")
def ajustes_recientes(
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    return ajustes_service.listar_recientes(conn)


@router.post("/ajustes/{detalle}/anular")
def anular_ajuste(
    detalle: str,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    try:
        ajustes_service.anular_ajuste(conn, detalle)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    return {"ok": True}
