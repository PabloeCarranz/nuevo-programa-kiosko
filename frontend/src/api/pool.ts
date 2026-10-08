import { apiFetch } from './client'

export interface SesionPool {
  id: number
  cliente: string
  inicio_tiempo: string
  fin_tiempo: string | null
  estado: 'ABIERTA' | 'CERRADA'
  usuario_inicia: string
  usuario_termina: string | null
  facturado: number
  COMENTARIOS: string | null
}

export interface DetenerSesionResultado {
  id: number
  cliente: string
  inicio_tiempo: string
  fin_tiempo: string
  duracion_segundos: number
}

export function obtenerSesionActiva(cliente: string) {
  return apiFetch<SesionPool | null>(`/pool/sesiones/activa/${encodeURIComponent(cliente)}`)
}

export function iniciarSesion(cliente: string) {
  return apiFetch<SesionPool>('/pool/sesiones/iniciar', {
    method: 'POST',
    body: JSON.stringify({ cliente }),
  })
}

export function detenerSesion(id: number) {
  return apiFetch<DetenerSesionResultado>(`/pool/sesiones/${id}/detener`, { method: 'POST' })
}

export function listarSesiones(estado?: string) {
  const qs = estado ? `?estado=${estado}` : ''
  return apiFetch<SesionPool[]>(`/pool/sesiones${qs}`)
}

export function actualizarFacturado(id: number, facturado: boolean, comentario?: string) {
  return apiFetch<{ ok: boolean }>(`/pool/sesiones/${id}/facturado`, {
    method: 'POST',
    body: JSON.stringify({ facturado, comentario }),
  })
}

export function borrarSesion(id: number) {
  return apiFetch<void>(`/pool/sesiones/${id}`, { method: 'DELETE' })
}
