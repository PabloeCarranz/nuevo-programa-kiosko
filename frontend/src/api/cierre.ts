import { apiFetch } from './client'

export interface LineaCierre {
  producto: string
  cantidad: number
  total: number
}

export interface GrupoCierre {
  metodo_pago: string
  lineas: LineaCierre[]
  total: number
  efectivo?: number | null
  transferencia?: number | null
}

export interface ResumenCierre {
  desde: string
  grupos: GrupoCierre[]
  total_general: number
}

export interface ConfirmarCierreResultado {
  archivo: string
  email_enviado: boolean
  texto: string
  total_general: number
}

export function obtenerResumenCierre() {
  return apiFetch<ResumenCierre>('/cierre/resumen')
}

export function confirmarCierre() {
  return apiFetch<ConfirmarCierreResultado>('/cierre/confirmar', { method: 'POST' })
}
