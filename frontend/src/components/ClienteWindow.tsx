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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90">
      <div className="w-[640px] rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-violet)]">Pedido de: {cliente.nombre}</h2>
          <button onClick={cerrarVentana} className="text-[var(--pos-text-dim)] hover:text-white">
            ✕
          </button>
        </div>

        {bloqueado ? (
          <p className="text-[var(--pos-red)]">No se pudo abrir esta ventana (ya hay otra ventana de cliente abierta).</p>
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

            <table className="mb-3 w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--pos-border)] text-left text-[var(--pos-text-dim)]">
                  <th className="py-1">Codigo</th>
                  <th>Nombre</th>
                  <th>Cant.</th>
                  <th>Precio</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} onContextMenu={(e) => { e.preventDefault(); quitarItem(i) }} className="border-b border-[var(--pos-border)]/40" title="Click derecho para quitar">
                    <td className="py-1">{item.codigo}</td>
                    <td>{item.nombre}</td>
                    <td>{item.cantidad}</td>
                    <td>{item.precio}</td>
                    <td>{item.cantidad * item.precio}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mb-3 flex items-end gap-2 text-sm">
              <div>
                <label className="block text-[var(--pos-text-dim)]">Codigo (5 digitos)</label>
                <input
                  value={codigoManual}
                  onChange={(e) => handleCodigoManualChange(e.target.value)}
                  className="w-24 rounded border border-[var(--pos-border)] bg-black px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-[var(--pos-text-dim)]">
                  {nombreEncontrado ? nombreEncontrado.nombre : codigoManual.length === 5 ? 'Codigo no encontrado' : ' '}
                </label>
                <input
                  ref={cantidadRef}
                  value={cantidadManual}
                  onChange={(e) => setCantidadManual(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && agregarPorCodigoManual()}
                  placeholder="Cant."
                  className="w-20 rounded border border-[var(--pos-border)] bg-black px-2 py-1"
                />
              </div>
              <button
                onClick={agregarPorCodigoManual}
                disabled={!nombreEncontrado}
                className="rounded bg-[var(--pos-violet-dim)] px-3 py-1.5 disabled:opacity-30"
              >
                Agregar
              </button>
              <span className="ml-auto font-bold">Total: $ {total.toLocaleString('es-AR')}</span>
            </div>

            <div className="mb-3 rounded border border-[var(--pos-border)] p-2 text-sm">
              <p>
                Inicio: {sesion?.inicio_tiempo ?? '--:--:--'} &nbsp; Fin: {sesion?.fin_tiempo ?? '--:--:--'}
              </p>
              {sesion?.estado === 'ABIERTA' && (
                <p className="text-[var(--pos-green)]">⏳ Tiempo transcurrido: {formatearDuracion(segundosTranscurridos)}</p>
              )}
              {mensajeSesion && <p className="text-[var(--pos-text-dim)]">{mensajeSesion}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleIniciarSesion}
                  disabled={sesion?.estado === 'ABIERTA'}
                  className="rounded bg-[var(--pos-violet-dim)] px-3 py-1 text-xs disabled:opacity-30"
                >
                  Iniciar tiempo de juego
                </button>
                <button
                  onClick={handleDetenerSesion}
                  disabled={sesion?.estado !== 'ABIERTA'}
                  className="rounded bg-[var(--pos-violet-dim)] px-3 py-1 text-xs disabled:opacity-30"
                >
                  Detener
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={handleGuardar} className="rounded border border-[var(--pos-border)] px-3 py-1.5 text-sm hover:border-[var(--pos-violet)]">
                Guardar
              </button>
              <button onClick={handleFacturarClick} className="rounded bg-[var(--pos-violet)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110">
                Facturar
              </button>
            </div>
          </>

        )}

        {mostrarSelectorMedioPago && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/90">
            <div className="rounded border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4">
              <p className="mb-2 text-center text-sm">Medio de pago</p>
              <div className="flex gap-2">
                {MEDIOS_PAGO.map((medio) => (
                  <button
                    key={medio}
                    onClick={() => confirmarMedioPagoYFacturar(medio)}
                    className="rounded bg-[var(--pos-violet-dim)] px-3 py-1.5 text-sm hover:brightness-125"
                  >
                    {medio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
