import { apiFetch } from './client'

export interface Rubro {
  clave: string
  nombre: string
  emoji: string
  desde: number
  hasta: number
  orden: number
  activo: boolean
  // El rubro de alquiler por tiempo (mesas, canchas): tiene cronometro
  es_tiempo: boolean
}

// Lo que se manda al guardar: sin clave = rubro nuevo. El orden de la lista
// es el orden en pantalla.
export interface RubroEditado {
  clave: string | null
  nombre: string
  emoji: string
  activo: boolean
}

export function listarRubros() {
  return apiFetch<Rubro[]>('/rubros')
}

export function guardarRubros(rubros: RubroEditado[], passwordMaster: string) {
  return apiFetch<Rubro[]>('/rubros', {
    method: 'PUT',
    body: JSON.stringify({ rubros, password_master: passwordMaster }),
  })
}
