from pydantic import BaseModel


class LineaCierre(BaseModel):
    producto: str
    cantidad: float
    total: float


class GrupoCierre(BaseModel):
    metodo_pago: str
    lineas: list[LineaCierre]
    total: float
    efectivo: float | None = None
    transferencia: float | None = None


class ResumenCierreResponse(BaseModel):
    desde: str
    grupos: list[GrupoCierre]
    total_general: float


class ConfirmarCierreResponse(BaseModel):
    archivo: str
    email_enviado: bool
    texto: str
    total_general: float
