import { apiFetch } from './client'
import type { Producto } from './productos'

export function listarCatalogo(rubro: string) {
  return apiFetch<Producto[]>(`/productos/${rubro}`)
}

export function crearProducto(rubro: string, data: { nombre: string; cantidad: number; precio: number; barras_codigo: string }) {
  return apiFetch<{ codigo: number }>(`/productos/${rubro}`, { method: 'POST', body: JSON.stringify(data) })
}

export function actualizarProducto(
  rubro: string,
  codigo: number,
  data: { nombre: string; precio: number; barras_codigo: string },
) {
  return apiFetch<{ ok: boolean }>(`/productos/${rubro}/${codigo}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function bajaProducto(rubro: string, codigo: number) {
  return apiFetch<void>(`/productos/${rubro}/${codigo}`, { method: 'DELETE' })
}
