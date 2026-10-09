import { create } from 'zustand'

// Temas disponibles. Cada id (salvo 'sistema') tiene su bloque
// :root[data-theme='...'] en index.css; 'claro' usa el :root base.
export const TEMAS = [
  { id: 'claro', label: 'Claro' },
  { id: 'oscuro', label: 'Oscuro' },
  { id: 'sistema', label: 'Automático' },
] as const

// Tamaño de letra: cada id tiene su :root[data-size='...'] en index.css
export const TAMANIOS = [
  { id: 'normal', label: 'Normal' },
  { id: 'grande', label: 'Grande' },
  { id: 'muy-grande', label: 'Muy grande' },
] as const

export type TemaId = (typeof TEMAS)[number]['id']
export type TamanioId = (typeof TAMANIOS)[number]['id']

// La eleccion es por equipo (cada PC o celular recuerda la suya), no por negocio.
// index.html repite esta lectura para aplicarla antes del primer pintado.
const CLAVE_TEMA = 'pos-tema'
const CLAVE_TAMANIO = 'pos-tamanio'
const TAMANIO_POR_DEFECTO: TamanioId = 'grande'
const consultaOscuro = window.matchMedia('(prefers-color-scheme: dark)')

function leer<T extends string>(clave: string, validos: readonly { id: T }[], porDefecto: T): T {
  try {
    const valor = localStorage.getItem(clave)
    if (validos.some((v) => v.id === valor)) return valor as T
  } catch {
    // sin acceso a localStorage: se usa el valor por defecto
  }
  return porDefecto
}

function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // se aplica igual, solo que no se recuerda
  }
}

function aplicarTema(tema: TemaId) {
  const real = tema === 'sistema' ? (consultaOscuro.matches ? 'oscuro' : 'claro') : tema
  document.documentElement.dataset.theme = real
}

function aplicarTamanio(tamanio: TamanioId) {
  document.documentElement.dataset.size = tamanio
}

interface TemaState {
  tema: TemaId
  tamanio: TamanioId
  setTema: (tema: TemaId) => void
  setTamanio: (tamanio: TamanioId) => void
}

export const useTemaStore = create<TemaState>((set) => ({
  tema: leer(CLAVE_TEMA, TEMAS, 'claro'),
  tamanio: leer(CLAVE_TAMANIO, TAMANIOS, TAMANIO_POR_DEFECTO),
  setTema: (tema) => {
    guardar(CLAVE_TEMA, tema)
    aplicarTema(tema)
    set({ tema })
  },
  setTamanio: (tamanio) => {
    guardar(CLAVE_TAMANIO, tamanio)
    aplicarTamanio(tamanio)
    set({ tamanio })
  },
}))

aplicarTema(useTemaStore.getState().tema)
aplicarTamanio(useTemaStore.getState().tamanio)
consultaOscuro.addEventListener('change', () => {
  if (useTemaStore.getState().tema === 'sistema') aplicarTema('sistema')
})
