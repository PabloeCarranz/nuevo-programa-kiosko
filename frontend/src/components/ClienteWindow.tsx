import { useEffect, useRef, useState } from 'react'
import { buscarProducto } from '../api/productos'
import {
  abrirVentanaCliente,
  cerrarVentanaCliente,
  guardarConsumoTemporal,
  obtenerConsumoTemporal,
} from '../api/clienteVentana'
import { detenerSesion, iniciarSesion, obtenerSesionActiva } from '../api/pool'
import type { SesionPool } from '../api/pool'
import type { Cliente } from '../api/clientes'
import type { FilaCarrito, MedioPago } from '../store/ventaStore'
import { ApiError } from '../api/client'
import Icon from './Icon'

const MEDIOS_PAGO: MedioPago[] = ['Efectivo', 'Transferencia', 'Cuenta', 'Multipago']

interface ItemCliente {
  codigo: number
  nombre: string
  cantidad: number
  precio: number
}

function formatearDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export default function ClienteWindow({
  cliente,
  onCerrar,
  onFacturar,
}: {
  cliente: Cliente
  onCerrar: () => void
  onFacturar: (params: { items: FilaCarrito[]; medioPago: MedioPago; sesionPoolId: number | null }) => void
}) {
  const [bloqueado, setBloqueado] = useState(false)
  const [items, setItems] = useState<ItemCliente[]>([])
  const [sesion, setSesion] = useState<SesionPool | null>(null)
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0)
  const [mensajeSesion, setMensajeSesion] = useState<string | null>(null)
  const [codigoManual, setCodigoManual] = useState('')
  const [nombreEncontrado, setNombreEncontrado] = useState<{ nombre: string; precio: number } | null>(null)
  const [cantidadManual, setCantidadManual] = useState('')
  const [huboCambios, setHuboCambios] = useState(false)
  const [mostrarSelectorMedioPago, setMostrarSelectorMedioPago] = useState(false)

  const barcodeRef = useRef<HTMLInputElement>(null)
  const cantidadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let activo = true
    abrirVentanaCliente(cliente.nombre)
      .then(async () => {
        const [consumo, sesionActiva] = await Promise.all([
          obtenerConsumoTemporal(cliente.nombre),
          obtenerSesionActiva(cliente.nombre),
        ])
        if (!activo) return
        setItems(
          consumo.map((c) => ({ codigo: Number(c.codigo), nombre: c.detalle, cantidad: c.cantidad, precio: c.precio_unitario })),
        )
        setSesion(sesionActiva)
      })
      .catch((e) => {
        setBloqueado(true)
        alert(e instanceof ApiError ? e.message : 'No se pudo abrir la ventana del cliente')
      })
    return () => {
      activo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.nombre])

  useEffect(() => {
    if (!bloqueado) barcodeRef.current?.focus()
  }, [bloqueado])

  useEffect(() => {
    if (!sesion || sesion.estado !== 'ABIERTA') return
    const inicio = new Date(sesion.inicio_tiempo.replace(' ', 'T')).getTime()
    const id = setInterval(() => setSegundosTranscurridos(Math.max(0, Math.floor((Date.now() - inicio) / 1000))), 1000)
    return () => clearInterval(id)
  }, [sesion])

  function cerrarVentana() {
    if (bloqueado) {
      onCerrar()
      return
    }
    if (huboCambios && !confirm('Has cargado productos pero no los has guardado. ¿Cerrar de todas formas?')) return
    cerrarVentanaCliente(cliente.nombre).finally(onCerrar)
  }

  async function agregarPorCodigoManual() {
    if (codigoManual.length !== 5 || !nombreEncontrado) return
    const cantidad = parseInt(cantidadManual, 10)
    if (!Number.isFinite(cantidad) || cantidad <= 0) return
    setItems((prev) => [...prev, { codigo: Number(codigoManual), nombre: nombreEncontrado.nombre, cantidad, precio: nombreEncontrado.precio }])
    setHuboCambios(true)
    setCodigoManual('')
    setCantidadManual('')
    setNombreEncontrado(null)
    setTimeout(() => barcodeRef.current?.focus(), 0)
  }

  async function handleCodigoManualChange(valor: string) {
    const limpio = valor.replace(/\D/g, '').slice(0, 13)
    setCodigoManual(limpio)
    if (limpio.length === 5) {
      try {
        const producto = await buscarProducto(limpio)
        setNombreEncontrado({ nombre: producto.nombre, precio: producto.precio })
        setTimeout(() => cantidadRef.current?.focus(), 0)
      } catch {
        setNombreEncontrado(null)
      }
    } else {
      setNombreEncontrado(null)
    }
  }

  async function handleBarcodeEnter(codigo: string) {
    if (!codigo.trim()) return
    try {
      const producto = await buscarProducto(codigo.trim())
      setItems((prev) => [...prev, { codigo: producto.codigo, nombre: producto.nombre, cantidad: 1, precio: producto.precio }])
      setHuboCambios(true)
    } catch {
      // codigo no encontrado: se ignora, igual que el original
    }
  }

  function quitarItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
    setHuboCambios(true)
  }

  async function handleIniciarSesion() {
    const nueva = await iniciarSesion(cliente.nombre)
    setSesion(nueva)
  }

  async function handleDetenerSesion() {
    if (!sesion) return
    const ok = confirm(
      'Modo Facturacion Obligatorio: si no facturas ahora, las horas quedan como NO FACTURADAS. ¿Confirmar detener el tiempo de juego?',
    )
    if (!ok) return
    const resultado = await detenerSesion(sesion.id)
    setSesion((prev) => (prev ? { ...prev, estado: 'CERRADA', fin_tiempo: resultado.fin_tiempo } : prev))
    setMensajeSesion(
      `Se jugo desde ${resultado.inicio_tiempo} hasta ${resultado.fin_tiempo} (Se jugo: ${formatearDuracion(resultado.duracion_segundos)})`,
    )
  }

  async function handleGuardar() {
    await guardarConsumoTemporal(
      cliente.nombre,
      items.map((i) => ({ codigo: i.codigo, detalle: i.nombre, cantidad: i.cantidad, precio_unitario: i.precio })),
    )
    setHuboCambios(false)
    alert('Guardado exitoso')
  }

  function handleFacturarClick() {
    if (items.length === 0) {
      alert('No hay productos cargados para facturar')
      return
    }
    if (!confirm('Los productos se transferiran a facturacion y no se puede volver atras. ¿Continuar?')) return
    setMostrarSelectorMedioPago(true)
  }

  async function confirmarMedioPagoYFacturar(medioPago: MedioPago) {
    setMostrarSelectorMedioPago(false)
    await guardarConsumoTemporal(cliente.nombre, [])
    await cerrarVentanaCliente(cliente.nombre)
    onFacturar({
      items: items.map((i) => ({ codigo: i.codigo, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
      medioPago,
      sesionPoolId: sesion?.estado === 'CERRADA' || sesion?.estado === 'ABIERTA' ? sesion.id : null,
    })
  }

  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio, 0)

  const money = (n: number) => `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`
  const tiempoCorriendo = sesion?.estado === 'ABIERTA'

  return (
    <div className="pos-overlay fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="relative flex max-h-full w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-[var(--pos-border)] bg-[var(--pos-panel)] text-[var(--pos-text)]">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--pos-border)] px-5 py-4">
          <div className="min-w-0">
            <p className="section-label">Cuenta</p>
            <h2 className="truncate text-[length:var(--pos-brand-size)] font-bold">{cliente.nombre}</h2>
          </div>
          <button onClick={cerrarVentana} className="btn-icon" title="Cerrar">
            <Icon name="x" />
          </button>
        </header>

        {bloqueado ? (
          <p className="m-5 rounded-lg bg-[var(--pos-red-soft)] px-3 py-2 text-sm text-[var(--pos-red)]">
            No se pudo abrir esta cuenta: ya hay otra ventana de cliente abierta.
          </p>
        ) : (
          <>
            <input
              ref={barcodeRef}
              defaultValue=""
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const t = e.target as HTMLInputElement
                  handleBarcodeEnter(t.value)
                  t.value = ''
                }
              }}
              onBlur={() => {
                // Solo recupera el foco si nada mas lo tomo (p.ej. el usuario
                // clickeo el campo de codigo manual): evita pelearle el foco
                // a la carga manual de productos.
                setTimeout(() => {
                  if (document.activeElement === document.body) barcodeRef.current?.focus()
                }, 0)
              }}
              className="absolute -left-40 -top-40 h-px w-px opacity-0"
              aria-hidden
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {/* Tiempo de mesa / cancha */}
              <div
                className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1 ${
                  tiempoCorriendo ? 'bg-[var(--pos-accent-soft)] ring-[var(--pos-accent-border)]' : 'bg-[var(--pos-panel-2)] ring-[var(--pos-border)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--pos-panel)] ${
                      tiempoCorriendo ? 'text-[var(--pos-accent)]' : 'text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)]'
                    }`}
                  >
                    <Icon name="clock" size={20} />
                  </span>
                  <div className="text-sm leading-tight">
                    {tiempoCorriendo ? (
                      <>
                        <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--pos-accent)]">
                          {formatearDuracion(segundosTranscurridos)}
                        </p>
                        <p className="text-xs text-[var(--pos-text-dim)]">Desde {sesion?.inicio_tiempo}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Tiempo de uso</p>
                        <p className="text-xs text-[var(--pos-text-dim)]">
                          {sesion?.inicio_tiempo ? `${sesion.inicio_tiempo} → ${sesion.fin_tiempo ?? '--:--'}` : 'Sin tiempo iniciado'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleIniciarSesion}
                    disabled={tiempoCorriendo}
                    className="btn rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Iniciar
                  </button>
                  <button
                    onClick={handleDetenerSesion}
                    disabled={!tiempoCorriendo}
                    className="btn rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Detener
                  </button>
                </div>
                {mensajeSesion && <p className="w-full text-xs text-[var(--pos-text-dim)]">{mensajeSesion}</p>}
              </div>

              {/* Consumos */}
              <div className="overflow-hidden rounded-xl ring-1 ring-[var(--pos-border)]">
                <table className="pos-venta-tabla w-full border-collapse text-left text-sm">
                  <thead>
                    <tr>
                      <th className="w-20">Código</th>
                      <th>Producto</th>
                      <th className="w-16 text-right">Cant.</th>
                      <th className="w-24 text-right">Precio</th>
                      <th className="w-24 text-right">Importe</th>
                      <th className="w-8" aria-label="Quitar"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-[var(--pos-text-dim)]">
                          Sin consumos. Escaneá un producto o cargalo por código abajo.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, i) => (
                        <tr
                          key={i}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            quitarItem(i)
                          }}
                        >
                          <td className="font-mono text-xs text-[var(--pos-text-dim)]">{item.codigo}</td>
                          <td>{item.nombre}</td>
                          <td className="text-right tabular-nums">{item.cantidad}</td>
                          <td className="text-right tabular-nums">{money(item.precio)}</td>
                          <td className="text-right font-semibold tabular-nums">{money(item.cantidad * item.precio)}</td>
                          <td className="text-center">
                            <button onClick={() => quitarItem(i)} className="btn-x px-1 py-0.5" title="Quitar">
                              <Icon name="x" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Carga manual */}
              <div className="mt-4 flex flex-wrap items-end gap-2 text-sm">
                <div>
                  <label className="section-label mb-1 block">Código</label>
                  <input
                    value={codigoManual}
                    onChange={(e) => handleCodigoManualChange(e.target.value)}
                    placeholder="5 dígitos"
                    className="w-28 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="section-label mb-1 block">Cantidad</label>
                  <input
                    ref={cantidadRef}
                    value={cantidadManual}
                    onChange={(e) => setCantidadManual(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && agregarPorCodigoManual()}
                    placeholder="Cant."
                    className="w-20 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2"
                  />
                </div>
                <button
                  onClick={agregarPorCodigoManual}
                  disabled={!nombreEncontrado}
                  className="btn flex items-center gap-1 rounded-lg px-3 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="plus" size={15} /> Agregar
                </button>
                <span
                  className={`min-w-0 flex-1 truncate pb-2 text-sm ${
                    nombreEncontrado ? 'font-medium text-[var(--pos-green)]' : 'text-[var(--pos-red)]'
                  }`}
                >
                  {nombreEncontrado
                    ? `${nombreEncontrado.nombre} · ${money(nombreEncontrado.precio)}`
                    : codigoManual.length === 5
                      ? 'Código no encontrado'
                      : ''}
                </span>
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pos-border)] bg-[var(--pos-panel-2)] px-5 py-4">
              <div>
                <p className="section-label">Total de la cuenta</p>
                <p className="text-2xl font-bold tabular-nums text-[var(--pos-total-text)]">{money(total)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleGuardar} className="btn rounded-xl px-4 py-2.5 text-sm font-semibold">
                  Guardar
                </button>
                <button onClick={handleFacturarClick} className="pos-venta-go rounded-xl px-5 py-2.5 text-sm font-semibold">
                  Cobrar
                </button>
              </div>
            </footer>
          </>
        )}

        {mostrarSelectorMedioPago && (
          <div className="pos-overlay absolute inset-0 flex items-center justify-center rounded-2xl p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--pos-border)] bg-[var(--pos-panel)] p-5">
              <p className="mb-1 text-base font-semibold">¿Cómo paga?</p>
              <p className="mb-4 text-sm text-[var(--pos-text-dim)]">Total {money(total)}</p>
              <div className="grid grid-cols-2 gap-2">
                {MEDIOS_PAGO.map((medio) => (
                  <button
                    key={medio}
                    onClick={() => confirmarMedioPagoYFacturar(medio)}
                    className="btn rounded-xl px-3 py-3 text-sm font-semibold"
                  >
                    {medio}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMostrarSelectorMedioPago(false)}
                className="mt-3 w-full rounded-lg py-2 text-sm text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
