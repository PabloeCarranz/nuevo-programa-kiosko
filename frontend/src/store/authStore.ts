import { create } from 'zustand'
import * as authApi from '../api/auth'
import type { Usuario } from '../api/auth'

// Botones de funcionalidades restringidos a Master, tal cual el sistema Tkinter actual
// (verificado en programa_restaurante_respaldo.py: botones_restringidos).
export const BOTONES_RESTRINGIDOS_A_MASTER = [
  'ingreso-mercaderia',
  'gestion-productos',
  'listado-facturas',
  'control-stock',
] as const

export type FuncionalidadKey =
  | (typeof BOTONES_RESTRINGIDOS_A_MASTER)[number]
  | 'movimientos-stock'
  | 'cierre-caja'

interface AuthState {
  usuario: Usuario | null
  loading: boolean
  error: string | null
  cargarSesion: () => Promise<void>
  login: (usuario: string, password: string) => Promise<void>
  logout: () => Promise<void>
  puedeUsar: (funcionalidad: FuncionalidadKey) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuario: null,
  loading: true,
  error: null,

  cargarSesion: async () => {
    try {
      const usuario = await authApi.me()
      set({ usuario, loading: false })
    } catch {
      set({ usuario: null, loading: false })
    }
  },

  login: async (usuario, password) => {
    set({ error: null })
    try {
      const data = await authApi.login(usuario, password)
      set({ usuario: data })
    } catch {
      set({ error: 'Usuario o contrasena incorrectos' })
      throw new Error('login-failed')
    }
  },

  logout: async () => {
    await authApi.logout().catch(() => {})
    set({ usuario: null })
  },

  puedeUsar: (funcionalidad) => {
    const usuario = get().usuario
    if (!usuario) return false
    if (usuario.rol === 'master') return true
    return !(BOTONES_RESTRINGIDOS_A_MASTER as readonly string[]).includes(funcionalidad)
  },
}))
