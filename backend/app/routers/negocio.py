import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_db
from app.deps import CurrentUser, require_master
from app.services import negocio_service

router = APIRouter(prefix="/negocio", tags=["negocio"])


class Negocio(BaseModel):
    nombre: str = Field(max_length=60)
    subtitulo: str = Field(default="", max_length=80)
    direccion: str = Field(default="", max_length=80)
    telefono: str = Field(default="", max_length=40)
    pie_ticket: str = Field(default="", max_length=80)
    rubro_golosinas: str = Field(max_length=24)
    rubro_bebidas: str = Field(max_length=24)
    rubro_cigarros: str = Field(max_length=24)
    rubro_mesa_pool: str = Field(max_length=24)


# Sin login: la pantalla de ingreso necesita mostrar el nombre del negocio.
@router.get("", response_model=Negocio)
def obtener(conn: sqlite3.Connection = Depends(get_db)):
    return negocio_service.obtener(conn)


@router.put("", response_model=Negocio)
def guardar(body: Negocio, conn: sqlite3.Connection = Depends(get_db), _: CurrentUser = Depends(require_master)):
    datos = {k: v.strip() for k, v in body.model_dump().items()}
    obligatorios = ("nombre", "rubro_golosinas", "rubro_bebidas", "rubro_cigarros", "rubro_mesa_pool")
    if any(not datos[c] for c in obligatorios):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El nombre del negocio y los cuatro rubros no pueden quedar vacios")
    return negocio_service.guardar(conn, datos)
