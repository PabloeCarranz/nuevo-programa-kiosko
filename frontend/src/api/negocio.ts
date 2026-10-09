import { apiFetch } from './client'

export interface Negocio {
  nombre: string
  subtitulo: string
  direccion: string
  telefono: string
  pie_ticket: string
}

// Lo que devuelve el backend: los datos + si el sistema ya tiene nombre puesto
// (false solo en una instalacion nueva).
export interface NegocioConEstado extends Negocio {
  configurado: boolean
}

export function obtenerNegocio() {
  return apiFetch<NegocioConEstado>('/negocio')
}

// El nombre se ignora aca: tiene candado y solo cambia con cambiarNombre().
export function guardarNegocio(datos: Negocio) {
  return apiFetch<NegocioConEstado>('/negocio', { method: 'PUT', body: JSON.stringify(datos) })
}

export function cambiarNombre(nombre: string, passwordMaster: string) {
  return apiFetch<NegocioConEstado>('/negocio/nombre', {
    method: 'POST',
    body: JSON.stringify({ nombre, password_master: passwordMaster }),
  })
}
