import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, get_current_user, require_master
from app.models.ingresos import ProductoCatalogoRequest
from app.models.productos import ProductoConRubroResponse, ProductoResponse
from app.services import productos_service
from app.services.rangos import TABLAS_POR_RUBRO

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("/buscar", response_model=ProductoConRubroResponse)
def buscar(
    codigo: str,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    producto = productos_service.buscar_producto(conn, codigo)
    if producto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return producto


@router.get("", response_model=list[ProductoConRubroResponse])
def listar_todos(
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    return productos_service.listar_todos(conn)


@router.get("/{rubro}", response_model=list[ProductoResponse])
def listar(
    rubro: str,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    tabla = TABLAS_POR_RUBRO.get(rubro)
    if tabla is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rubro invalido")
    return productos_service.listar_por_rubro(conn, tabla)


def _tabla_o_404(rubro: str) -> str:
    tabla = TABLAS_POR_RUBRO.get(rubro)
    if tabla is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rubro invalido")
    return tabla


@router.post("/{rubro}", status_code=status.HTTP_201_CREATED)
def crear(
    rubro: str,
    body: ProductoCatalogoRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    tabla = _tabla_o_404(rubro)
    codigo = productos_service.crear_producto(conn, tabla, body.nombre, body.cantidad, body.precio, body.barras_codigo)
    return {"codigo": codigo}


@router.put("/{rubro}/{codigo}")
def actualizar(
    rubro: str,
    codigo: int,
    body: ProductoCatalogoRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    tabla = _tabla_o_404(rubro)
    productos_service.actualizar_producto(conn, tabla, codigo, body.nombre, body.precio, body.barras_codigo)
    return {"ok": True}


@router.delete("/{rubro}/{codigo}", status_code=status.HTTP_204_NO_CONTENT)
def baja(
    rubro: str,
    codigo: int,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(require_master),
):
    tabla = _tabla_o_404(rubro)
    productos_service.baja_producto(conn, tabla, codigo)
