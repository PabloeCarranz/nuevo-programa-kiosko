import { create } from 'zustand'
import * as negocioApi from '../api/negocio'
import type { Negocio, NegocioConEstado } from '../api/negocio'
import * as rubrosApi from '../api/rubros'
import type { Rubro, RubroEditado } from '../api/rubros'

const POR_DEFECTO: Negocio = {
  nombre: 'Mi Negocio',
  subtitulo: '',
  direccion: '',
  telefono: '',
  pie_ticket: 'Lo esperamos pronto',
}

// Atajos de teclado de los rubros visibles, en orden. F5, F9 y F10 ya estan
// tomados (nueva venta, confirmar, tiempos).
export const TECLAS_RUBRO = ['F1', 'F2', 'F3', 'F4', 'F6', 'F7', 'F8'] as const

// Primera letra o numero del nombre, salteando emojis y adornos
// ("⚽ La Canchita ⚽" -> "L"). Se usa en el cuadradito de la marca.
export function inicialDelNombre(nombre: string): string {
  return nombre.match(/[\p{L}\p{N}]/u)?.[0].toUpperCase() ?? '★'
}

interface NegocioState {
  negocio: Negocio
  // Arranca en true para no mostrar la bienvenida si el backend no responde
  configurado: boolean
  // Todos los rubros (tambien los ocultos), en el orden elegido por el Master
  rubros: Rubro[]
  cargar: () => Promise<void>
  guardar: (datos: Negocio) => Promise<void>
  cambiarNombre: (nombre: string, passwordMaster: string) => Promise<void>
  cargarRubros: () => Promise<void>
  guardarRubros: (rubros: RubroEditado[], passwordMaster: string) => Promise<void>
  rubrosVisibles: () => Rubro[]
  nombreRubro: (clave: string) => string
  teclaDeRubro: (clave: string) => string | undefined
}

export const useNegocioStore = create<NegocioState>((set, get) => {
  function aplicar({ configurado, ...negocio }: NegocioConEstado) {
    set({ negocio, configurado })
    document.title = negocio.nombre
  }

  return {
    negocio: POR_DEFECTO,
    configurado: true,
    rubros: [],

    cargar: async () => {
      try {
        aplicar(await negocioApi.obtenerNegocio())
      } catch {
        // sin backend se muestran los valores por defecto
      }
    },

    guardar: async (datos) => {
      aplicar(await negocioApi.guardarNegocio(datos))
    },

    cambiarNombre: async (nombre, passwordMaster) => {
      aplicar(await negocioApi.cambiarNombre(nombre, passwordMaster))
    },

    // Necesita sesion iniciada: se llama al entrar al panel
    cargarRubros: async () => {
      set({ rubros: await rubrosApi.listarRubros() })
    },

    guardarRubros: async (rubros, passwordMaster) => {
      set({ rubros: await rubrosApi.guardarRubros(rubros, passwordMaster) })
    },

    rubrosVisibles: () => get().rubros.filter((r) => r.activo),

    nombreRubro: (clave) => get().rubros.find((r) => r.clave === clave)?.nombre ?? clave,

    teclaDeRubro: (clave) => {
      const indice = get().rubrosVisibles().findIndex((r) => r.clave === clave)
      return indice >= 0 ? TECLAS_RUBRO[indice] : undefined
    },
  }
})
