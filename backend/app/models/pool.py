from pydantic import BaseModel


class SesionPoolResponse(BaseModel):
    id: int
    cliente: str
    inicio_tiempo: str
    fin_tiempo: str | None
    estado: str
    usuario_inicia: str
    usuario_termina: str | None
    facturado: int
    COMENTARIOS: str | None = None


class IniciarSesionRequest(BaseModel):
    cliente: str


class ActualizarFacturadoRequest(BaseModel):
    facturado: bool
    comentario: str | None = None


class DetenerSesionResponse(BaseModel):
    id: int
    cliente: str
    inicio_tiempo: str
    fin_tiempo: str
    duracion_segundos: int


class ConsumoItem(BaseModel):
    codigo: int
    detalle: str
    cantidad: int
    precio_unitario: float


class GuardarConsumoRequest(BaseModel):
    items: list[ConsumoItem]
