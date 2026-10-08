import { apiFetch } from './client'

export interface Producto {
  codigo: number
  nombre: string
  precio: number
}

export interface ProductoConRubro extends Producto {
  rubro: string
}

export function buscarProducto(codigo: string) {
  return apiFetch<ProductoConRubro>(`/productos/buscar?codigo=${encodeURIComponent(codigo)}`)
}

export function listarPorRubro(rubro: string) {
  return apiFetch<Producto[]>(`/productos/${rubro}`)
}

export function listarTodosLosProductos() {
  return apiFetch<ProductoConRubro[]>('/productos')
}
