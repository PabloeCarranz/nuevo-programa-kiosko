import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.services import auth_service, rubros_service

router = APIRouter(prefix="/rubros", tags=["rubros"])


class RubroResponse(BaseModel):
    clave: str
    nombre: str
    emoji: str
    desde: int
    hasta: int
    orden: int
    activo: bool
    es_tiempo: bool


class RubroEditado(BaseModel):
    clave: str | None = None  # None = rubro nuevo
    nombre: str = Field(max_length=rubros_service.MAX_NOMBRE)
    emoji: str = Field(default="", max_length=16)
    activo: bool = True


class GuardarRubrosRequest(BaseModel):
    rubros: list[RubroEditado]
    password_master: str


@router.get("", response_model=list[RubroResponse])
def listar(conn: sqlite3.Connection = Depends(get_db), _: CurrentUser = Depends(get_current_user)):
    return rubros_service.listar(conn)


# Agregar, renombrar, ordenar u ocultar rubros: solo el Master, y siempre
# volviendo a escribir su contrasena (aunque ya este logueado).
@router.put("", response_model=list[RubroResponse])
def guardar(
    body: GuardarRubrosRequest,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    if not auth_service.verificar_credenciales(conn, auth_service.USUARIOS_MASTER, body.password_master):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "La contraseña de Master no es correcta")
    try:
        return rubros_service.guardar_todos(conn, [r.model_dump() for r in body.rubros])
    except rubros_service.RubroError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
