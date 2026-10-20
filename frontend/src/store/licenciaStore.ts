import { create } from 'zustand'
import * as licenciaApi from '../api/licencia'
import type { Licencia } from '../api/licencia'

interface LicenciaState {
  licencia: Licencia | null
  cargada: boolean
  cargar: () => Promise<void>
  activar: (codigo: string) => Promise<void>
}

export const useLicenciaStore = create<LicenciaState>((set) => ({
  licencia: null,
  cargada: false,

  cargar: async () => {
    try {
      set({ licencia: await licenciaApi.obtenerLicencia(), cargada: true })
    } catch {
      // sin backend se deja pasar a la pantalla de ingreso, que ya muestra el error de red
      set({ cargada: true })
    }
  },

  activar: async (codigo) => {
    set({ licencia: await licenciaApi.activarLicencia(codigo) })
  },
}))
