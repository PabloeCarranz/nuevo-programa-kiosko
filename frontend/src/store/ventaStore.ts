import { create } from 'zustand'
import { obtenerRangosProducto } from '../api/config'
import type { RangosProducto } from '../api/config'
import { confirmarFactura } from '../api/facturacion'
import type { ConfirmarFacturaResponse } from '../api/facturacion'
import { useNegocioStore } from './negocioStore'

export type MedioPago = 'Efectivo' | 'Transferencia' | 'Cuenta' | 'Multipago'
export type EstadoVenta = 'idle' | 'totalizado' | 'recibo_mostrado' | 'impreso'

export interface FilaCarrito {
  codigo: number
  nombre: string
  cantidad: number
  precio: number
}

interface Subtotales {
  golosinas: number
  bebidas: number
  cigarros: number
  mesa_pool: number
  subtotal: number
}

const SUBTOTALES_VACIOS: Subtotales = { golosinas: 0, bebidas: 0, cigarros: 0, mesa_pool: 0, subtotal: 0 }

function clasificar(items: FilaCarrito[], rangos: RangosProducto): Subtotales {
  const acc = { ...SUBTOTALES_VACIOS }
  for (const item of items) {
    const total = item.cantidad * item.precio
    const rubro = Object.entries(rangos).find(([, r]) => item.codigo >= r.desde && item.codigo <= r.hasta)?.[0]
    if (rubro && rubro in acc) {
      ;(acc as unknown as Record<string, number>)[rubro] += total
    }
    acc.subtotal += total
  }
  return acc
}

function armarTextoPreview(params: {
  items: FilaCarrito[]
  cliente: string
  usuario: string
  medioPago: MedioPago
  multipagoEfectivo: number
  multipagoTransferencia: number
  subtotales: Subtotales
}): string {
  const { items, cliente, usuario, medioPago, multipagoEfectivo, multipagoTransferencia, subtotales } = params
  const lineas: string[] = []
  const negocio = useNegocioStore.getState().negocio
  lineas.push(negocio.nombre.toUpperCase())
  for (const extra of [negocio.subtitulo, negocio.direccion, negocio.telefono]) if (extra) lineas.push(extra)
  lineas.push('='.repeat(47))
  lineas.push(`Datos:\t(tentativo)\t\t${new Date().toLocaleString('es-AR')}`)
  lineas.push('*'.repeat(47))
  lineas.push('Items\t\t\tCant.\tCosto Items')
  lineas.push('-'.repeat(54))
  for (const item of items) {
    lineas.push(`${item.nombre}\t\t\t${item.cantidad}\t$${(item.cantidad * item.precio).toLocaleString('es-AR')}`)
  }
  lineas.push('-'.repeat(54))
  lineas.push(`Atendido por:\t${usuario}`)
  lineas.push(`Cliente:\t${cliente}`)
  if (medioPago === 'Multipago') {
    lineas.push('Medio de Pago:\tMultipago')
    lineas.push(`  Efectivo:\t$${multipagoEfectivo.toLocaleString('es-AR')}`)
    lineas.push(`  Transferencia:\t$${multipagoTransferencia.toLocaleString('es-AR')}`)
  } else {
    lineas.push(`Medio de Pago:\t${medioPago}`)
  }
  lineas.push('-'.repeat(54))
  lineas.push(` Subtotal:\t\t\t\t$ ${subtotales.subtotal.toLocaleString('es-AR')}`)
  lineas.push(` Total:\t\t\t\t$ ${subtotales.subtotal.toLocaleString('es-AR')}`)
  lineas.push('*'.repeat(47))
  lineas.push(negocio.pie_ticket || 'Lo esperamos pronto')
  return lineas.join('\n')
}

interface VentaState {
  rangos: RangosProducto | null
  items: FilaCarrito[]
  estado: EstadoVenta
  cliente: string
  medioPago: MedioPago
  multipagoEfectivo: number
  multipagoTransferencia: number
  subtotales: Subtotales
  textoRecibo: string
  resultado: ConfirmarFacturaResponse | null
  error: string | null
  enviando: boolean
  sesionPoolId: number | null

  cargarRangos: () => Promise<void>
  setItemsDesdeEscaner: (items: FilaCarrito[]) => void
  setCliente: (nombre: string) => void
  setSesionPoolId: (id: number | null) => void
  setMedioPago: (medio: MedioPago) => void
  calcularTotal: (efectivo?: number) => void
  mostrarRecibo: (usuario: string) => void
  imprimir: (caja: string) => Promise<void>
  reset: () => void
}

export const useVentaStore = create<VentaState>((set, get) => ({
  rangos: null,
  items: [],
  estado: 'idle',
  cliente: 'Usuario Final',
  medioPago: 'Efectivo',
  multipagoEfectivo: 0,
  multipagoTransferencia: 0,
  subtotales: SUBTOTALES_VACIOS,
  textoRecibo: '',
  resultado: null,
  error: null,
  enviando: false,
  sesionPoolId: null,

  cargarRangos: async () => {
    if (get().rangos) return
    const rangos = await obtenerRangosProducto()
    set({ rangos })
  },

  setItemsDesdeEscaner: (items) => set({ items }),
  setCliente: (nombre) => set({ cliente: nombre }),
  setSesionPoolId: (id) => set({ sesionPoolId: id }),
  setMedioPago: (medio) => set({ medioPago: medio, multipagoEfectivo: 0, multipagoTransferencia: 0 }),

  calcularTotal: (efectivo) => {
    const { items, rangos, medioPago } = get()
    if (!rangos || items.length === 0) return
    const subtotales = clasificar(items, rangos)
    let multipagoEfectivo = 0
    let multipagoTransferencia = 0
    if (medioPago === 'Multipago') {
      multipagoEfectivo = Math.max(0, efectivo ?? 0)
      multipagoTransferencia = Math.max(0, subtotales.subtotal - multipagoEfectivo)
    }
    set({ subtotales, multipagoEfectivo, multipagoTransferencia, estado: 'totalizado' })
  },

  mostrarRecibo: (usuario) => {
    const { items, cliente, medioPago, multipagoEfectivo, multipagoTransferencia, subtotales } = get()
    const texto = armarTextoPreview({ items, cliente, usuario, medioPago, multipagoEfectivo, multipagoTransferencia, subtotales })
    set({ textoRecibo: texto, estado: 'recibo_mostrado' })
  },

  imprimir: async (caja) => {
    const { items, cliente, medioPago, multipagoEfectivo, multipagoTransferencia, sesionPoolId } = get()
    set({ enviando: true, error: null })
    try {
      const resultado = await confirmarFactura({
        caja,
        cliente,
        medio_pago: medioPago,
        items: items.map((i) => ({ codigo: i.codigo, cantidad: i.cantidad })),
        multipago_efectivo: medioPago === 'Multipago' ? multipagoEfectivo : undefined,
        multipago_transferencia: medioPago === 'Multipago' ? multipagoTransferencia : undefined,
        sesion_pool_id: sesionPoolId ?? undefined,
      })
      set({ resultado, textoRecibo: resultado.texto_recibo, estado: 'impreso', enviando: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error al confirmar la factura', enviando: false })
      throw e
    }
  },

  reset: () =>
    set({
      items: [],
      estado: 'idle',
      cliente: 'Usuario Final',
      medioPago: 'Efectivo',
      multipagoEfectivo: 0,
      multipagoTransferencia: 0,
      subtotales: SUBTOTALES_VACIOS,
      textoRecibo: '',
      resultado: null,
      error: null,
      sesionPoolId: null,
    }),
}))
