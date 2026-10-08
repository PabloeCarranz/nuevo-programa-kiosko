import { apiFetch } from './client'

export interface Ingreso {
  ID: number
  FECHA: string
  DETALLE: string
  RUBRO: string
  CODIGO: number
  NOMBRE_PRODUCTO: string
  CANTIDAD_INGRESADA: number
  COMENTARIOS: string
}

export function listarIngresosRecientes() {
  return apiFetch<Ingreso[]>('/ingresos/recientes')
}

export function registrarIngreso(rubro: string, codigo: number, cantidad: number, comentario: string) {
  return apiFetch<{ id: number; detalle: string; nombre: string }>('/ingresos', {
    method: 'POST',
    body: JSON.stringify({ rubro, codigo, cantidad, comentario }),
  })
}

export function anularIngreso(id: number) {
  return apiFetch<void>(`/ingresos/${id}`, { method: 'DELETE' })
}
