import { apiFetch } from './client'

export interface MovimientoKardex {
  fecha: string
  tipo: 'IREC' | 'FACT' | 'AJ++' | 'AJ--'
  detalle: string
  cantidad: number
  saldo: number
  comentarios?: string
  factura_id?: number
}

export interface Kardex {
  codigo: number
  nombre: string
  movimientos: MovimientoKardex[]
}

export function obtenerKardex(codigo: number) {
  return apiFetch<Kardex>(`/kardex/${codigo}`)
}
