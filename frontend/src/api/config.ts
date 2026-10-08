import { apiFetch } from './client'

export interface RangoRubro {
  tabla: string
  desde: number
  hasta: number
}

export type RangosProducto = Record<string, RangoRubro>

export function obtenerRangosProducto() {
  return apiFetch<RangosProducto>('/config/rangos-producto')
}
