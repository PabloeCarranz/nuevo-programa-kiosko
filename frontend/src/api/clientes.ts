import { apiFetch } from './client'

export interface Cliente {
  id: number
  nombre: string
  sesion_pool_activa: boolean
}

export function listarClientes() {
  return apiFetch<Cliente[]>('/clientes')
}

export function crearCliente(nombre: string) {
  return apiFetch<Cliente>('/clientes', {
    method: 'POST',
    body: JSON.stringify({ nombre }),
  })
}

export function borrarCliente(id: number) {
  return apiFetch<void>(`/clientes/${id}`, { method: 'DELETE' })
}
