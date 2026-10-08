import { apiFetch } from './client'

export interface Usuario {
  usuario: string
  rol: 'master' | 'caja'
}

export function listarUsuarios() {
  return apiFetch<string[]>('/auth/usuarios')
}

export function login(usuario: string, password: string) {
  return apiFetch<Usuario>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, password }),
  })
}

export function logout() {
  return apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' })
}

export function me() {
  return apiFetch<Usuario>('/auth/me')
}

export function cambiarPassword(params: {
  usuario_objetivo: string
  actual: string
  nueva: string
  repetir: string
}) {
  return apiFetch<{ ok: boolean }>('/auth/cambiar-password', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
