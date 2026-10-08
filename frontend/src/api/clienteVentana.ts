import { apiFetch } from './client'

export interface ConsumoTemporalItem {
  codigo: number
  detalle: string
  cantidad: number
  precio_unitario: number
  total: number
}

export function obtenerConsumoTemporal(cliente: string) {
  return apiFetch<ConsumoTemporalItem[]>(`/clientes/${encodeURIComponent(cliente)}/consumo-temporal`)
}

export function guardarConsumoTemporal(cliente: string, items: { codigo: number; detalle: string; cantidad: number; precio_unitario: number }[]) {
  return apiFetch<{ ok: boolean }>(`/clientes/${encodeURIComponent(cliente)}/consumo-temporal`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}

export function abrirVentanaCliente(cliente: string) {
  return apiFetch<{ ok: boolean }>(`/clientes/${encodeURIComponent(cliente)}/abrir-ventana`, { method: 'POST' })
}

export function cerrarVentanaCliente(cliente: string) {
  return apiFetch<{ ok: boolean }>(`/clientes/${encodeURIComponent(cliente)}/cerrar-ventana`, { method: 'POST' })
}
