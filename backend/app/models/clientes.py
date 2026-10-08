from pydantic import BaseModel


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    sesion_pool_activa: bool


class CrearClienteRequest(BaseModel):
    nombre: str
