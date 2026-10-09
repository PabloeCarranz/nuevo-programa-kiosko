import { useEffect, useState } from 'react'
import { borrarCliente, crearCliente, listarClientes } from '../api/clientes'
import type { Cliente } from '../api/clientes'
import Icon from './Icon'

const POLL_MS = 4000

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

// Cuentas abiertas (mesas, canchas o clientes con consumo pendiente). Reemplaza
// la antigua grilla fija de 54 comandas: solo muestra las que existen.
export default function CuentasAbiertas({ onSeleccionar }: { onSeleccionar: (cliente: Cliente) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargado, setCargado] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  async function refrescar() {
    try {
      setClientes(await listarClientes())
      setCargado(true)
    } catch {
      // silencioso: el proximo poll reintenta
    }
  }

  useEffect(() => {
    refrescar()
    const id = setInterval(refrescar, POLL_MS)
    return () => clearInterval(id)
  }, [])

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    setCreando(true)
    setError(null)
    try {
      await crearCliente(nombre)
      setNuevoNombre('')
      await refrescar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setCreando(false)
    }
  }

  async function handleBorrar(e: React.SyntheticEvent, cliente: Cliente) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`¿Borrar la cuenta de ${cliente.nombre}?`)) return
    await borrarCliente(cliente.id)
    refrescar()
  }

  const enJuego = clientes.filter((c) => c.sesion_pool_activa).length
  const visibles = filtro.trim()
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(filtro.trim().toLowerCase()))
    : clientes

  return (
    <section className="panel flex flex-col rounded-2xl lg:min-h-0">
      <header className="border-b border-[var(--pos-border)] px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Cuentas abiertas</h2>
            <p className="text-xs text-[var(--pos-text-dim)]">Mesas, canchas o clientes con consumo pendiente</p>
          </div>
          <div className="flex shrink-0 gap-1.5 text-xs font-medium">
            <span className="rounded-full bg-[var(--pos-panel-2)] px-2 py-0.5 text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)]">
              {clientes.length}
            </span>
            {enJuego > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--pos-accent-soft)] px-2 py-0.5 text-[var(--pos-accent)]">
                <Icon name="clock" size={12} /> {enJuego}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleCrear} className="mt-3 flex gap-2">
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nueva cuenta: Mesa 4, Cancha 2, Juan..."
            className="min-w-0 flex-1 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!nuevoNombre.trim() || creando}
            className="btn-primary flex items-center gap-1 rounded-lg px-3 text-sm font-semibold"
            title="Abrir cuenta"
          >
            <Icon name="plus" size={16} /> Abrir
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-[var(--pos-red)]">{error}</p>}

        {clientes.length > 8 && (
          <div className="relative mt-2">
            <Icon name="search" size={15} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--pos-text-dim)]" />
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar cuenta"
              className="w-full rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel-2)] py-1.5 pr-3 pl-8 text-sm"
            />
          </div>
        )}
      </header>

      <div className="p-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {!cargado ? (
          <p className="p-4 text-center text-sm text-[var(--pos-text-dim)]">Cargando...</p>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--pos-primary-soft)] text-[var(--pos-primary)]">
              <Icon name="users" size={22} />
            </span>
            <p className="text-sm font-medium">No hay cuentas abiertas</p>
            <p className="max-w-56 text-xs text-[var(--pos-text-dim)]">
              Abrí una cuenta para ir sumando consumos o controlar el tiempo de una mesa o cancha.
            </p>
          </div>
        ) : visibles.length === 0 ? (
          <p className="p-4 text-center text-sm text-[var(--pos-text-dim)]">Sin coincidencias</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
            {visibles.map((cliente) => (
              <li key={cliente.id} className="group relative">
                <button
                  onClick={() => onSeleccionar(cliente)}
                  onContextMenu={(e) => handleBorrar(e, cliente)}
                  title={cliente.nombre}
                  className={`flex w-full items-center gap-3 rounded-xl border bg-[var(--pos-panel)] p-2.5 text-left transition hover:-translate-y-px hover:shadow-md ${
                    cliente.sesion_pool_activa
                      ? 'border-[var(--pos-accent-border)] hover:border-[var(--pos-accent)]'
                      : 'border-[var(--pos-border)] hover:border-[var(--pos-primary)]'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      cliente.sesion_pool_activa
                        ? 'bg-[var(--pos-accent-soft)] text-[var(--pos-accent)]'
                        : 'bg-[var(--pos-primary-soft)] text-[var(--pos-primary)]'
                    }`}
                  >
                    {iniciales(cliente.nombre)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[length:var(--pos-cuenta-size)] font-semibold">{cliente.nombre}</span>
                    {cliente.sesion_pool_activa ? (
                      <span className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-[var(--pos-accent)]">
                        <span className="dot-live pos-blink inline-block h-1.5 w-1.5 rounded-full bg-[var(--pos-accent)]" />
                        Tiempo corriendo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[0.6875rem] text-[var(--pos-text-dim)]">
                        <span className="dot-ok inline-block h-1.5 w-1.5 rounded-full bg-[var(--pos-green)]" />
                        Abierta
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={(e) => handleBorrar(e, cliente)}
                  title={`Borrar la cuenta de ${cliente.nombre}`}
                  className="btn-x absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center bg-[var(--pos-panel)] opacity-0 transition group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
