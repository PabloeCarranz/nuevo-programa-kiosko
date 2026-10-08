import { useState } from 'react'
import type { Negocio } from '../api/negocio'
import { useNegocioStore } from '../store/negocioStore'

const CAMPOS_NEGOCIO: { key: keyof Negocio; label: string; placeholder: string }[] = [
  { key: 'nombre', label: 'Nombre del negocio', placeholder: 'La Canchita Bar' },
  { key: 'subtitulo', label: 'Subtitulo', placeholder: 'Bar · Pool · Canchas' },
  { key: 'direccion', label: 'Direccion (sale en el ticket)', placeholder: 'Av. Siempreviva 742' },
  { key: 'telefono', label: 'Telefono (sale en el ticket)', placeholder: '11 5555-0000' },
  { key: 'pie_ticket', label: 'Mensaje al pie del ticket', placeholder: '¡Gracias por su visita!' },
]

const CAMPOS_RUBRO: { key: keyof Negocio; tecla: string }[] = [
  { key: 'rubro_golosinas', tecla: 'F1' },
  { key: 'rubro_bebidas', tecla: 'F2' },
  { key: 'rubro_cigarros', tecla: 'F3' },
  { key: 'rubro_mesa_pool', tecla: 'F4' },
]

export default function DatosNegocioModal({ onCerrar }: { onCerrar: () => void }) {
  const { negocio, guardar } = useNegocioStore()
  const [datos, setDatos] = useState<Negocio>(negocio)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const input = 'w-full rounded border border-[var(--pos-border)] bg-black px-3 py-2 text-sm text-[var(--pos-text)] outline-none focus:border-[var(--pos-cyan)]'

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4">
      <form onSubmit={handleGuardar} className="neon-panel max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-violet)]">Datos del negocio</h2>
          <button type="button" onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-white" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="grid gap-3">
          {CAMPOS_NEGOCIO.map(({ key, label, placeholder }) => (
            <label key={key} className="grid gap-1 text-xs text-[var(--pos-text-dim)]">
              {label}
              <input id={`negocio-${key}`} value={datos[key]} placeholder={placeholder} onChange={(e) => cambiar(key, e.target.value)} className={input} />
            </label>
          ))}
        </div>

        <h3 className="mt-5 mb-1 text-sm font-semibold text-[var(--pos-cyan)]">Rubros</h3>
        <p className="mb-3 text-xs text-[var(--pos-text-dim)]">
          Los nombres de los botones de rubro en la pantalla de venta y de los subtotales. El cuarto rubro es el de alquiler por tiempo.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CAMPOS_RUBRO.map(({ key, tecla }) => (
            <label key={key} className="grid gap-1 text-xs text-[var(--pos-text-dim)]">
              Rubro {tecla}
              <input id={`negocio-${key}`} value={datos[key]} maxLength={24} onChange={(e) => cambiar(key, e.target.value)} className={input} />
            </label>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-[var(--pos-red)]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="neon-btn rounded-lg px-4 py-2 text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="neon-btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
