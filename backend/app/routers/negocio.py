import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_db
from app.deps import CurrentUser, require_master
from app.services import auth_service, negocio_service

router = APIRouter(prefix="/negocio", tags=["negocio"])


class Negocio(BaseModel):
    nombre: str = Field(max_length=60)
    subtitulo: str = Field(default="", max_length=80)
    direccion: str = Field(default="", max_length=80)
    telefono: str = Field(default="", max_length=40)
    pie_ticket: str = Field(default="", max_length=80)
    # Ya no se usan: los rubros viven en la tabla RUBROS (ver /rubros). Quedan
    # solo para que la base y la API sigan siendo compatibles hacia atras.
    rubro_golosinas: str = Field(default="", max_length=24)
    rubro_bebidas: str = Field(default="", max_length=24)
    rubro_cigarros: str = Field(default="", max_length=24)
    rubro_mesa_pool: str = Field(default="", max_length=24)


class NegocioResponse(Negocio):
    # False en una instalacion nueva: el frontend muestra la bienvenida para
    # ponerle nombre al sistema.
    configurado: bool


class CambiarNombreRequest(BaseModel):
    nombre: str = Field(max_length=60)
    password_master: str


def _respuesta(conn: sqlite3.Connection) -> dict:
    return {**negocio_service.obtener(conn), "configurado": negocio_service.esta_configurado(conn)}


# Sin login: la pantalla de ingreso necesita mostrar el nombre del negocio.
@router.get("", response_model=NegocioResponse)
def obtener(conn: sqlite3.Connection = Depends(get_db)):
    return _respuesta(conn)


@router.put("", response_model=NegocioResponse)
def guardar(body: Negocio, conn: sqlite3.Connection = Depends(get_db), _: CurrentUser = Depends(require_master)):
    datos = {k: v.strip() for k, v in body.model_dump().items()}
    # El nombre tiene candado: solo cambia por /negocio/nombre con la contrasena
    # de Master. Aca se conserva el que ya estaba, venga lo que venga.
    # Lo mismo con los rubros, que ahora se editan en /rubros con contrasena.
    actual = negocio_service.obtener(conn)
    for campo in ("nombre", "rubro_golosinas", "rubro_bebidas", "rubro_cigarros", "rubro_mesa_pool"):
        datos[campo] = actual[campo]
    negocio_service.guardar(conn, datos)
    return _respuesta(conn)


# Sin sesion a proposito: sirve tanto para la bienvenida de una instalacion
# nueva (antes de que nadie entre) como para que el Master cambie el nombre
# desde la caja de otro usuario. La autorizacion es la contrasena de Master.
@router.post("/nombre", response_model=NegocioResponse)
def cambiar_nombre(body: CambiarNombreRequest, conn: sqlite3.Connection = Depends(get_db)):
    if not auth_service.verificar_credenciales(conn, auth_service.USUARIOS_MASTER, body.password_master):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "La contraseña de Master no es correcta")
    nombre = body.nombre.strip()
    if not nombre:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El nombre no puede quedar vacio")
    datos = {**negocio_service.obtener(conn), "nombre": nombre}
    negocio_service.guardar(conn, datos)
    return _respuesta(conn)
