from pydantic import BaseModel


class RegistrarIngresoRequest(BaseModel):
    rubro: str
    codigo: int
    cantidad: int
    comentario: str = ""


class ProductoCatalogoRequest(BaseModel):
    nombre: str
    cantidad: float = 0
    precio: float
    barras_codigo: str = ""
