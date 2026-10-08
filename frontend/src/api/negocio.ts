import { apiFetch } from './client'

export interface Negocio {
  nombre: string
  subtitulo: string
  direccion: string
  telefono: string
  pie_ticket: string
  rubro_golosinas: string
  rubro_bebidas: string
  rubro_cigarros: string
  rubro_mesa_pool: string
}

export function obtenerNegocio() {
  return apiFetch<Negocio>('/negocio')
}

export function guardarNegocio(datos: Negocio) {
  return apiFetch<Negocio>('/negocio', { method: 'PUT', body: JSON.stringify(datos) })
}
