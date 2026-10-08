from pydantic import BaseModel


class ProductoResponse(BaseModel):
    codigo: int
    nombre: str
    precio: float


class ProductoConRubroResponse(ProductoResponse):
    rubro: str
