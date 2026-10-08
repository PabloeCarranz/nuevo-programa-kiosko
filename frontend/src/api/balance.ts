import { apiFetch } from './client'
import type { Factura } from './facturas'

export interface BalanceResultado {
  facturas: Factura[]
  totales: Record<string, number>
  total_general: number
}

export function obtenerBalance(params: { desde?: string; hasta?: string; metodo_pago?: string; caja?: string }) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()
  return apiFetch<BalanceResultado>(`/balance?${qs}`)
}

export function obtenerOpcionesFiltro() {
  return apiFetch<{ metodos_pago: string[]; cajas: string[] }>('/balance/opciones-filtro')
}
