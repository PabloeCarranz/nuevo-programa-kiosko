import { apiFetch } from './client'

export interface DiferenciaInventario {
  codigo: number
  nombre: string
  fisico: number
  sistema: number
  diferencia: number
  precio: number
  valorizado: number
}

export interface Ajuste {
  ID: number
  FECHA_CARGA: string
  TIPO_AJUSTE: 'MAS' | 'MENOS'
  CODIGO: number
  NOMBRE_PRODUCTO: string
  CANTIDAD: number
  COMENTARIO: string
  detalle: string
}

export function guardarInventario(fecha: string, items: { codigo: number; nombre: string; cantidad: number }[]) {
  return apiFetch<{ ok: boolean }>('/inventario', { method: 'POST', body: JSON.stringify({ fecha, items }) })
}

export function obtenerDiferenciasInventario(fecha: string) {
  return apiFetch<DiferenciaInventario[]>(`/inventario/diferencias?fecha=${fecha}`)
}

export function registrarAjuste(tipo: 'MAS' | 'MENOS', codigo: number, cantidad: number, comentario: string, fecha: string) {
  return apiFetch<{ detalle: string; nombre: string }>('/ajustes', {
    method: 'POST',
    body: JSON.stringify({ tipo, codigo, cantidad, comentario, fecha }),
  })
}

export function listarAjustesRecientes() {
  return apiFetch<Ajuste[]>('/ajustes/recientes')
}

export function anularAjuste(detalle: string) {
  return apiFetch<{ ok: boolean }>(`/ajustes/${detalle}/anular`, { method: 'POST' })
}
