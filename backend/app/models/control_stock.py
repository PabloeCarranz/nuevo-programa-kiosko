from pydantic import BaseModel


class ItemInventario(BaseModel):
    codigo: int
    nombre: str
    cantidad: float


class GuardarInventarioRequest(BaseModel):
    fecha: str
    items: list[ItemInventario]


class RegistrarAjusteRequest(BaseModel):
    tipo: str  # "MAS" | "MENOS"
    codigo: int
    cantidad: int
    comentario: str = ""
    fecha: str
