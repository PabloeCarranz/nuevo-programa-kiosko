import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models.facturacion import ConfirmarFacturaRequest, ConfirmarFacturaResponse
from app.services import facturacion_service

router = APIRouter(prefix="/facturacion", tags=["facturacion"])


@router.get("/proximo-numero")
def proximo_numero(
    caja: str,
    conn: sqlite3.Connection = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    try:
        return {"numero_factura": facturacion_service.proximo_numero_tentativo(conn, caja)}
    except facturacion_service.FacturacionError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))


@router.post("/confirmar", response_model=ConfirmarFacturaResponse)
def confirmar(
    body: ConfirmarFacturaRequest,
    conn: sqlite3.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    try:
        resultado = facturacion_service.confirmar_factura(
            conn,
            caja=body.caja,
            usuario=user.usuario,
            cliente=body.cliente,
            medio_pago=body.medio_pago,
            items=[item.model_dump() for item in body.items],
            multipago_efectivo=body.multipago_efectivo,
            multipago_transferencia=body.multipago_transferencia,
            sesion_pool_id=body.sesion_pool_id,
        )
    except facturacion_service.FacturacionError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return resultado
