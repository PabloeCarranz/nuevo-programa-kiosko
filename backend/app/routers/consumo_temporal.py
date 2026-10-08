import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.pool import GuardarConsumoRequest
from app.services import consumo_temporal_service, ventana_cliente_lock

router = APIRouter(prefix="/clientes", tags=["consumo-temporal"])


@router.get("/{nombre}/consumo-temporal")
def obtener(
    nombre: str,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    return consumo_temporal_service.obtener(conn, nombre)


@router.put("/{nombre}/consumo-temporal")
def guardar(
    nombre: str,
    body: GuardarConsumoRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    consumo_temporal_service.guardar(conn, nombre, [item.model_dump() for item in body.items])
    return {"ok": True}


@router.post("/{nombre}/abrir-ventana")
def abrir_ventana(
    nombre: str,
    user: CurrentUser = Depends(get_current_user),
):
    otra = ventana_cliente_lock.intentar_abrir(nombre, user.usuario)
    if otra is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Ya hay una ventana de cliente abierta para '{otra['cliente']}' (usuario {otra['usuario']})",
        )
    return {"ok": True}


@router.post("/{nombre}/cerrar-ventana")
def cerrar_ventana(nombre: str, _: CurrentUser = Depends(get_current_user)):
    ventana_cliente_lock.cerrar(nombre)
    return {"ok": True}
