import { apiFetch } from './client'

export interface ItemFactura {
  codigo: number
  cantidad: number
}

export interface ConfirmarFacturaParams {
  caja: string
  cliente: string
  medio_pago: string
  items: ItemFactura[]
  multipago_efectivo?: number
  multipago_transferencia?: number
  sesion_pool_id?: number
}

export interface ConfirmarFacturaResponse {
  numero_factura: string
  fecha: string
  total: number
  texto_recibo: string
}

export function proximoNumero(caja: string) {
  return apiFetch<{ numero_factura: string }>(`/facturacion/proximo-numero?caja=${encodeURIComponent(caja)}`)
}

export function confirmarFactura(params: ConfirmarFacturaParams) {
  return apiFetch<ConfirmarFacturaResponse>('/facturacion/confirmar', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
