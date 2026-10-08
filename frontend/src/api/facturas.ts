import { apiFetch } from './client'

export interface Factura {
  id: number
  caja: string
  numero_correlativo: number
  numero_factura: string
  fecha: string
  usuario: string
  cliente: string
  metodo_pago: string
  total: number
  activo: number
}

export interface DetalleFacturaLinea {
  id: number
  codigo_producto: string
  producto: string
  cantidad: number
  precio_unitario: number
  precio_total: number
}

export function listarFacturas(fecha?: string) {
  const qs = fecha ? `?fecha=${fecha}` : ''
  return apiFetch<Factura[]>(`/facturas${qs}`)
}

export function listarFacturasAnuladas() {
  return apiFetch<Factura[]>('/facturas/anuladas')
}

export function obtenerDetalleFactura(id: number) {
  return apiFetch<{ factura: Factura; lineas: DetalleFacturaLinea[] }>(`/facturas/${id}`)
}

export function anularFactura(id: number) {
  return apiFetch<{ ok: boolean }>(`/facturas/${id}/anular`, { method: 'POST' })
}
