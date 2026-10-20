import { apiFetch } from './client'

export interface Licencia {
  estado: 'prueba' | 'activada' | 'vencida'
  dias_restantes: number
  dias_prueba: number
  id_equipo: string
}

export function obtenerLicencia() {
  return apiFetch<Licencia>('/licencia')
}

export function activarLicencia(codigo: string) {
  return apiFetch<Licencia>('/licencia/activar', { method: 'POST', body: JSON.stringify({ codigo }) })
}
