from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services import licencia_service

router = APIRouter(prefix="/licencia", tags=["licencia"])


class Licencia(BaseModel):
    estado: Literal["prueba", "activada", "vencida"]
    dias_restantes: int
    dias_prueba: int
    id_equipo: str


class Activacion(BaseModel):
    codigo: str = Field(max_length=400)


# Sin login: con la prueba vencida nadie puede entrar, y justamente ahi hay que activar.
@router.get("", response_model=Licencia)
def obtener():
    return licencia_service.estado_actual()


@router.post("/activar", response_model=Licencia)
def activar(body: Activacion):
    try:
        return licencia_service.activar(body.codigo)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
