import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.clientes import ClienteResponse, CrearClienteRequest
from app.services import clientes_service

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("", response_model=list[ClienteResponse])
def listar(conn: sqlite3.Connection = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    return clientes_service.listar_clientes(conn)


@router.post("", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def crear(
    body: CrearClienteRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    nombre = body.nombre.strip()
    if not nombre:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El nombre no puede estar vacio")
    if clientes_service.contar_clientes(conn) >= clientes_service.MAX_CLIENTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Limite de clientes alcanzado (54)")
    cliente_id = clientes_service.crear_cliente(conn, nombre)
    return {"id": cliente_id, "nombre": nombre, "sesion_pool_activa": False}


@router.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar(
    cliente_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    if not clientes_service.borrar_cliente(conn, cliente_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
