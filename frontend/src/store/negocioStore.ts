import { create } from 'zustand'
import * as negocioApi from '../api/negocio'
import type { Negocio } from '../api/negocio'

// Claves internas de rubro (coinciden con las tablas de la base). Lo que ve el
// cajero es el nombre que eligio cada negocio en "Datos del negocio".
export const RUBROS = ['golosinas', 'bebidas', 'cigarros', 'mesa_pool'] as const
export type Rubro = (typeof RUBROS)[number]

const POR_DEFECTO: Negocio = {
  nombre: 'Mi Negocio',
  subtitulo: '',
  direccion: '',
  telefono: '',
  pie_ticket: 'Lo esperamos pronto',
  rubro_golosinas: 'Kiosco',
  rubro_bebidas: 'Bebidas',
  rubro_cigarros: 'Cocina',
  rubro_mesa_pool: 'Tiempo y varios',
}

interface NegocioState {
  negocio: Negocio
  cargar: () => Promise<void>
  guardar: (datos: Negocio) => Promise<void>
  nombreRubro: (rubro: string) => string
}

export const useNegocioStore = create<NegocioState>((set, get) => ({
  negocio: POR_DEFECTO,

  cargar: async () => {
    try {
      const negocio = await negocioApi.obtenerNegocio()
      set({ negocio })
      document.title = negocio.nombre
    } catch {
      // sin backend se muestran los valores por defecto
    }
  },

  guardar: async (datos) => {
    const negocio = await negocioApi.guardarNegocio(datos)
    set({ negocio })
    document.title = negocio.nombre
  },

  nombreRubro: (rubro) => {
    const clave = `rubro_${rubro}` as keyof Negocio
    return get().negocio[clave] ?? rubro
  },
}))
