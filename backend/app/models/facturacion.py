from pydantic import BaseModel


class ProductoEncontrado(BaseModel):
    codigo: int
    nombre: str
    precio: float
    rubro: str


class ItemFactura(BaseModel):
    codigo: int
    cantidad: int


class ConfirmarFacturaRequest(BaseModel):
    caja: str
    cliente: str = "Usuario Final"
    medio_pago: str
    items: list[ItemFactura]
    multipago_efectivo: float | None = None
    multipago_transferencia: float | None = None
    sesion_pool_id: int | None = None


class ConfirmarFacturaResponse(BaseModel):
    numero_factura: str
    fecha: str
    total: float
    texto_recibo: str
