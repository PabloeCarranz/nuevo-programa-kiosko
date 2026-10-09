import { useState } from 'react'
import type { Negocio } from '../api/negocio'
import { useNegocioStore } from '../store/negocioStore'
import Icon from './Icon'
import GestionRubrosModal from './GestionRubrosModal'
import NombreSistemaModal from './NombreSistemaModal'

// El nombre no esta aca: tiene candado y se cambia desde NombreSistemaModal
const CAMPOS_NEGOCIO: { key: keyof Negocio; label: string; placeholder: string }[] = [
  { key: 'subtitulo', label: 'Subtitulo', placeholder: 'Ej: Almacén y bebidas · Abierto 24 hs' },
  { key: 'direccion', label: 'Direccion (sale en el ticket)', placeholder: 'Av. Siempreviva 742' },
  { key: 'telefono', label: 'Telefono (sale en el ticket)', placeholder: '11 5555-0000' },
  { key: 'pie_ticket', label: 'Mensaje al pie del ticket', placeholder: '¡Gracias por su visita!' },
]

export default function DatosNegocioModal({ onCerrar }: { onCerrar: () => void }) {
  const { negocio, rubros, guardar } = useNegocioStore()
  const [datos, setDatos] = useState<Negocio>(negocio)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mostrarNombre, setMostrarNombre] = useState(false)
  const [mostrarRubros, setMostrarRubros] = useState(false)

  function cambiar(key: keyof Negocio, valor: string) {
    setDatos((d) => ({ ...d, [key]: valor }))
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await guardar(datos)
      onCerrar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los datos')
    } finally {
      setGuardando(false)
    }
  }

  const input = 'w-full rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2 text-sm text-[var(--pos-text)] outline-none focus:border-[var(--pos-info)]'

  return (
    <>
    <div className="fixed inset-0 z-40 flex items-center justify-center pos-overlay p-4">
      <form onSubmit={handleGuardar} className="panel max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-primary)]">Datos del negocio</h2>
          <button type="button" onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1 text-xs text-[var(--pos-text-dim)]">
            Nombre del negocio
            <div className="flex items-center gap-2 rounded border border-[var(--pos-border)] bg-[var(--pos-panel-2)] px-3 py-1.5">
              <Icon name="lock" size={14} />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--pos-text)]">{negocio.nombre}</span>
              <button type="button" onClick={() => setMostrarNombre(true)} className="btn rounded-lg px-2.5 py-1 text-xs font-medium">
                Cambiar
              </button>
            </div>
          </div>
          {CAMPOS_NEGOCIO.map(({ key, label, placeholder }) => (
            <label key={key} className="grid gap-1 text-xs text-[var(--pos-text-dim)]">
              {label}
              <input id={`negocio-${key}`} value={datos[key]} placeholder={placeholder} onChange={(e) => cambiar(key, e.target.value)} className={input} />
            </label>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-xl bg-[var(--pos-panel-2)] px-3 py-2.5 ring-1 ring-[var(--pos-border)]">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Rubros</p>
            <p className="truncate text-xs text-[var(--pos-text-dim)]">
              {rubros
                .filter((r) => r.activo)
                .map((r) => `${r.emoji} ${r.nombre}`)
                .join('  ·  ')}
            </p>
          </div>
          <button type="button" onClick={() => setMostrarRubros(true)} className="btn shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium">
            Editar rubros
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-[var(--pos-red)]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="btn rounded-lg px-4 py-2 text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
    {mostrarNombre && <NombreSistemaModal onCerrar={() => setMostrarNombre(false)} />}
    {mostrarRubros && <GestionRubrosModal onCerrar={() => setMostrarRubros(false)} />}
    </>
  )
}
