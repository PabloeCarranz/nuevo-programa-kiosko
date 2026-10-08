import { useEffect, useRef, useState } from 'react'
import { buscarProducto, listarPorRubro, listarTodosLosProductos } from '../api/productos'
import type { ProductoConRubro } from '../api/productos'
import { listarSesiones } from '../api/pool'
import type { SesionPool } from '../api/pool'
import { useAuthStore } from '../store/authStore'
import { RUBROS, useNegocioStore } from '../store/negocioStore'
import type { Rubro } from '../store/negocioStore'
import type { FilaCarrito } from '../store/ventaStore'

type Columna = 'codigo' | 'cantidad'
interface Cursor {
  fila: number
  col: Columna
}

const pesos = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

function duracionDesde(inicio: string, ahora: Date) {
  const desde = new Date(inicio.replace(' ', 'T'))
  const seg = Math.max(0, Math.floor((ahora.getTime() - desde.getTime()) / 1000))
  const h = String(Math.floor(seg / 3600)).padStart(2, '0')
  const m = String(Math.floor((seg % 3600) / 60)).padStart(2, '0')
  const s = String(seg % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function FacturacionScanner({
  itemsIniciales,
  onConfirmar,
  onCancelar,
}: {
  itemsIniciales: FilaCarrito[]
  onConfirmar: (items: FilaCarrito[]) => void
  onCancelar: () => void
}) {
  const usuario = useAuthStore((s) => s.usuario)
  const { negocio, nombreRubro } = useNegocioStore()

  const [filas, setFilas] = useState<FilaCarrito[]>(itemsIniciales)
  const [cursor, setCursor] = useState<Cursor>({ fila: itemsIniciales.length, col: 'codigo' })
  const [valor, setValor] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false)
  const [rubroBusqueda, setRubroBusqueda] = useState<Rubro | null>(null)
  const [productosTodos, setProductosTodos] = useState<ProductoConRubro[] | null>(null)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(0)
  const [sesionesAbiertas, setSesionesAbiertas] = useState<SesionPool[]>([])
  const [ahora, setAhora] = useState(() => new Date())

  const codigoRef = useRef<HTMLInputElement>(null)
  const cantidadRef = useRef<HTMLInputElement>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const busquedaRef = useRef<HTMLInputElement>(null)
  const filasRef = useRef(filas)
  filasRef.current = filas
  const mostrarBusquedaRef = useRef(mostrarBusqueda)
  mostrarBusquedaRef.current = mostrarBusqueda

  // El input activo (codigo o cantidad segun el cursor) siempre recupera el foco,
  // igual que self.entry.focus_set() en el original tras cada movimiento.
  useEffect(() => {
    if (mostrarBusquedaRef.current) return
    if (cursor.col === 'codigo') codigoRef.current?.focus()
    else cantidadRef.current?.focus()
  }, [cursor])

  // Reloj de la barra superior y cronometros de las mesas/canchas en uso.
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    listarSesiones('ABIERTA').then(setSesionesAbiertas).catch(() => {})
  }, [])

  function refocarBarcodeSiNadaMasTieneFoco() {
    setTimeout(() => {
      if (document.activeElement === document.body) barcodeRef.current?.focus()
    }, 0)
  }

  function agregarFila(producto: { codigo: number; nombre: string; precio: number }) {
    setFilas((prev) => {
      const nuevas = [...prev, { codigo: producto.codigo, nombre: producto.nombre, cantidad: 0, precio: producto.precio }]
      setCursor({ fila: nuevas.length - 1, col: 'cantidad' })
      return nuevas
    })
  }

  async function agregarProductoPorCodigo(codigo: string) {
    const limpio = codigo.trim()
    if (!limpio) return
    setBuscando(true)
    setNoEncontrado(false)
    try {
      agregarFila(await buscarProducto(limpio))
    } catch {
      setNoEncontrado(true)
    } finally {
      setBuscando(false)
      setValor('')
    }
  }

  async function abrirBusqueda(rubro: Rubro | null = null) {
    setMostrarBusqueda(true)
    setRubroBusqueda(rubro)
    setFiltroTexto('')
    setIndiceSeleccionado(0)
    setProductosTodos(null)
    const lista = rubro
      ? (await listarPorRubro(rubro)).map((p) => ({ ...p, rubro })).sort((a, b) => a.nombre.localeCompare(b.nombre))
      : await listarTodosLosProductos()
    setProductosTodos(lista)
  }

  function cerrarBusqueda() {
    setMostrarBusqueda(false)
    setFiltroTexto('')
    setCursor((c) => ({ ...c }))
  }

  function seleccionarProductoDeBusqueda(producto: ProductoConRubro) {
    setMostrarBusqueda(false)
    setFiltroTexto('')
    agregarFila(producto)
  }

  const coincidencias = (productosTodos ?? []).filter((p) =>
    p.nombre.trim().toLowerCase().includes(filtroTexto.trim().toLowerCase()),
  )

  function confirmarCantidad(filaIdx: number, texto: string) {
    const cantidad = parseInt(texto, 10)
    if (!Number.isFinite(cantidad) || cantidad <= 0) return
    setFilas((prev) => prev.map((f, i) => (i === filaIdx ? { ...f, cantidad } : f)))
    setCursor({ fila: filasRef.current.length, col: 'codigo' })
    setValor('')
  }

  function quitarFila(idx: number) {
    setFilas((prev) => prev.filter((_, i) => i !== idx))
    setCursor({ fila: filasRef.current.length - 1, col: 'codigo' })
    setValor('')
  }

  function moverCursor(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      setCursor((c) => (c.col === 'cantidad' ? { ...c, col: 'codigo' } : c))
    } else if (e.key === 'ArrowRight') {
      setCursor((c) => (c.col === 'codigo' ? { ...c, col: 'cantidad' } : c))
    } else if (e.key === 'ArrowUp') {
      setCursor((c) => ({ ...c, fila: Math.max(0, c.fila - 1) }))
    } else if (e.key === 'ArrowDown') {
      setCursor((c) => ({ ...c, fila: Math.min(filasRef.current.length, c.fila + 1) }))
    }
  }

  function confirmar() {
    onConfirmar(filasRef.current.filter((f) => f.cantidad > 0))
  }

  function cancelar() {
    if (filasRef.current.length > 0 && !confirm('¿Salir sin confirmar? Se perderan los productos escaneados.')) return
    onCancelar()
  }

  function handleTeclado(e: KeyboardEvent) {
    if (e.key === 'F2') {
      e.preventDefault()
      abrirBusqueda()
    } else if (e.key === 'F9') {
      if (mostrarBusquedaRef.current) return
      e.preventDefault()
      confirmar()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (mostrarBusquedaRef.current) {
        cerrarBusqueda()
        return
      }
      cancelar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  useEffect(() => {
    window.addEventListener('keydown', handleTeclado)
    return () => window.removeEventListener('keydown', handleTeclado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mostrarBusqueda) busquedaRef.current?.focus()
  }, [mostrarBusqueda])

  const filaFantasma = cursor.fila === filas.length
  const total = filas.reduce((acc, f) => acc + f.cantidad * f.precio, 0)
  const unidades = filas.reduce((acc, f) => acc + f.cantidad, 0)
  const pendientes = filas.filter((f) => f.cantidad <= 0).length
  const numeroCaja = usuario?.usuario === 'Master' ? 'Master' : (usuario?.usuario ?? '').replace(/\D/g, '').padStart(2, '0')

  return (
    <div className="pos-venta fixed inset-0 z-50 flex flex-col gap-3 p-4 text-[var(--pos-text)]">
      <input
        ref={barcodeRef}
        defaultValue=""
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const target = e.target as HTMLInputElement
            agregarProductoPorCodigo(target.value)
            target.value = ''
          }
        }}
        onBlur={refocarBarcodeSiNadaMasTieneFoco}
        className="absolute -left-40 -top-40 h-px w-px opacity-0"
        aria-hidden
      />

      <header className="pos-venta-bar flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="pos-venta-brand">{negocio.nombre}</span>
          <span className="font-mono text-[11px] tracking-[0.15em] text-[var(--pos-text-dim)] uppercase">
            Caja {numeroCaja} · Cajero: {usuario?.usuario}
          </span>
        </div>
        <span className="font-mono text-xs tabular-nums text-[var(--pos-text-dim)]">
          {ahora.toLocaleDateString('es-AR')} {ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        <section className="pos-venta-panel flex min-h-0 flex-col rounded-lg p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="pos-venta-label">Venta en curso</h2>
            <span className={`text-xs ${noEncontrado ? 'text-[var(--pos-red)]' : 'text-[var(--pos-text-dim)]'}`}>
              {buscando ? 'Buscando...' : noEncontrado ? 'Codigo no encontrado' : 'Escanee o escriba el codigo y Enter'}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="pos-venta-tabla w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="w-28">Codigo</th>
                  <th>Descripcion</th>
                  <th className="w-20 text-right">Cant.</th>
                  <th className="w-24 text-right">Unitario</th>
                  <th className="w-28 text-right">Importe</th>
                  <th className="w-8" aria-label="Quitar"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, i) => (
                  <tr key={`${fila.codigo}-${i}`} onKeyDown={moverCursor} className={cursor.fila === i ? 'is-activa' : ''}>
                    <td className="font-mono text-[var(--pos-text-dim)]">{fila.codigo}</td>
                    <td>{fila.nombre}</td>
                    <td className="text-right">
                      {cursor.fila === i && cursor.col === 'cantidad' ? (
                        <input
                          ref={cantidadRef}
                          value={valor}
                          placeholder="cant."
                          onChange={(e) => setValor(e.target.value.replace(/\D/g, '').slice(0, 5))}
                          onKeyDown={(e) => {
                            moverCursor(e)
                            if (e.key === 'Enter') confirmarCantidad(i, valor)
                          }}
                          className="pos-venta-input w-16 text-right"
                        />
                      ) : (
                        <span className="tabular-nums">{fila.cantidad || <span className="text-[var(--pos-pink)]">—</span>}</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{pesos(fila.precio)}</td>
                    <td className="text-right font-semibold tabular-nums">{pesos(fila.cantidad * fila.precio)}</td>
                    <td className="text-center">
                      <button tabIndex={-1} onClick={() => quitarFila(i)} className="neon-x text-xs" title="Quitar de la venta">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                <tr onKeyDown={moverCursor} className={filaFantasma ? 'is-activa' : ''}>
                  <td>
                    {filaFantasma && cursor.col === 'codigo' ? (
                      <input
                        ref={codigoRef}
                        value={valor}
                        placeholder="codigo"
                        onChange={(e) => setValor(e.target.value.replace(/\D/g, '').slice(0, 13))}
                        onKeyDown={(e) => {
                          moverCursor(e)
                          if (e.key === 'Enter') agregarProductoPorCodigo(valor)
                        }}
                        className="pos-venta-input w-24"
                      />
                    ) : null}
                  </td>
                  <td colSpan={5} className="text-xs text-[var(--pos-text-dim)]">
                    {filas.length === 0 ? 'Todavia no hay productos. Escanee uno o use F2 para buscar por nombre.' : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <div className="pos-venta-total rounded-lg px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="pos-venta-label">Total</span>
              <span className="text-xs text-[var(--pos-text-dim)]">
                {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
                {pendientes > 0 && <span className="text-[var(--pos-pink)]"> · {pendientes} sin cantidad</span>}
              </span>
            </div>
            <div className="pos-venta-total-num">$ {pesos(total)}</div>
          </div>

          <button onClick={confirmar} className="pos-venta-go rounded-lg py-3 text-base font-bold">
            F9 · Confirmar venta
          </button>

          <div className="grid grid-cols-2 gap-2">
            {RUBROS.map((rubro) => (
              <button key={rubro} onClick={() => abrirBusqueda(rubro)} className="neon-btn truncate rounded-md px-3 py-2.5 text-sm">
                {nombreRubro(rubro)}
              </button>
            ))}
            <button onClick={() => abrirBusqueda()} className="neon-btn rounded-md px-3 py-2 text-xs text-[var(--pos-text-dim)]">
              F2 · Buscar por nombre
            </button>
            <button onClick={cancelar} className="neon-btn rounded-md px-3 py-2 text-xs text-[var(--pos-text-dim)]">
              ESC · Volver
            </button>
          </div>

          <section className="pos-venta-panel rounded-lg p-3">
            <h2 className="pos-venta-label mb-2">{nombreRubro('mesa_pool')} · en uso</h2>
            {sesionesAbiertas.length === 0 ? (
              <p className="text-xs text-[var(--pos-text-dim)]">No hay tiempo corriendo. Se inicia desde la ficha de cada cliente.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {sesionesAbiertas.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded bg-white/[0.03] px-2.5 py-1.5 font-mono text-xs">
                    <span className="flex items-center gap-2">
                      <span className="neon-dot-green inline-block h-1.5 w-1.5 rounded-full bg-[var(--pos-green)]" />
                      {s.cliente}
                    </span>
                    <span className="tabular-nums text-[var(--pos-pink)]">{duracionDesde(s.inicio_tiempo, ahora)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {mostrarBusqueda && (
        <div className="absolute inset-0 z-10 flex items-start justify-center bg-black/85 px-4 pt-16" onClick={cerrarBusqueda}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] rounded-lg border border-[var(--pos-violet)] bg-[#0d0a16] p-4 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
            <p className="mb-2 text-sm text-[var(--pos-text-dim)]">
              {rubroBusqueda ? `${nombreRubro(rubroBusqueda)}: elija un producto` : 'Buscar producto por nombre'} (ESC para cerrar)
            </p>
            <input
              ref={busquedaRef}
              value={filtroTexto}
              onChange={(e) => {
                setFiltroTexto(e.target.value)
                setIndiceSeleccionado(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setIndiceSeleccionado((i) => Math.min(i + 1, coincidencias.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setIndiceSeleccionado((i) => Math.max(i - 1, 0))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  const producto = coincidencias[indiceSeleccionado]
                  if (producto) seleccionarProductoDeBusqueda(producto)
                }
              }}
              placeholder="Escriba para filtrar, ej: coca..."
              className="w-full rounded border border-[var(--pos-border)] bg-black px-3 py-2 text-white outline-none"
            />
            <div className="mt-2 max-h-80 overflow-y-auto">
              {productosTodos === null ? (
                <p className="p-3 text-sm text-[var(--pos-text-dim)]">Cargando productos...</p>
              ) : coincidencias.length === 0 ? (
                <p className="p-3 text-sm text-[var(--pos-text-dim)]">Sin coincidencias</p>
              ) : (
                coincidencias.map((producto, i) => (
                  <button
                    key={producto.codigo}
                    onClick={() => seleccionarProductoDeBusqueda(producto)}
                    onMouseEnter={() => setIndiceSeleccionado(i)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      i === indiceSeleccionado ? 'bg-[var(--pos-violet)] text-white' : 'text-[var(--pos-text)]'
                    }`}
                  >
                    <span>{producto.nombre}</span>
                    <span className="text-xs opacity-70">
                      {producto.codigo} · ${pesos(producto.precio)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
