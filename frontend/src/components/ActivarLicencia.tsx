import { useRef, useState } from 'react'
import { useLicenciaStore } from '../store/licenciaStore'

// Sin onCerrar es la pantalla que bloquea el programa (prueba vencida).
// Con onCerrar se abre sobre el programa para activarlo antes de que venza.
export default function ActivarLicencia({ onCerrar }: { onCerrar?: () => void }) {
  const { licencia, activar } = useLicenciaStore()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const idRef = useRef<HTMLInputElement>(null)

  if (!licencia) return null
  const vencida = licencia.estado === 'vencida'

  async function copiarId() {
    idRef.current?.select()
    try {
      await navigator.clipboard.writeText(licencia!.id_equipo)
    } catch {
      document.execCommand('copy') // desde otra PC de la red no hay portapapeles moderno
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function handleActivar(e: React.FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) return
    setEnviando(true)
    setError(null)
    try {
      await activar(codigo)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar')
      setEnviando(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center overflow-auto p-4 ${onCerrar ? 'pos-overlay' : 'bg-[var(--pos-bg)]'}`}
    >
      <form onSubmit={handleActivar} className="panel w-full max-w-[34rem] rounded-2xl p-6 shadow-xl">
        <div className="mb-4 text-center">
          <p className="text-4xl">{vencida ? '🔒' : '🔑'}</p>
          <h1 className="mt-1 text-xl font-bold text-[var(--pos-text)]">
            {vencida ? 'Terminó tu prueba gratuita' : 'Activar el programa'}
          </h1>
          <p className="mt-1 text-sm text-[var(--pos-text-dim)]">
            {vencida
              ? `Pasaron los ${licencia.dias_prueba} días de prueba. Tus datos están guardados y vuelven apenas actives el programa.`
              : `Te quedan ${licencia.dias_restantes} ${licencia.dias_restantes === 1 ? 'día' : 'días'} de prueba. Con el código el programa queda activado para siempre en esta PC.`}
          </p>
        </div>

        <p className="mb-1 text-sm font-semibold text-[var(--pos-text)]">1. Pasale este número de tu PC a quien te vendió el programa</p>
        <div className="mb-4 flex gap-2">
          <input
            ref={idRef}
            readOnly
            value={licencia.id_equipo}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2 text-center font-mono text-lg font-semibold tracking-widest"
          />
          <button type="button" onClick={copiarId} className="btn rounded px-4 text-sm font-medium">
            {copiado ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>

        <label htmlFor="codigo-activacion" className="mb-1 block text-sm font-semibold text-[var(--pos-text)]">
          2. Pegá acá el código que te manden
        </label>
        <textarea
          id="codigo-activacion"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          rows={4}
          spellCheck={false}
          autoFocus
          placeholder="XXXXXX-XXXXXX-XXXXXX-..."
          className="w-full resize-none rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2 font-mono text-sm break-all"
        />

        {error && <p className="mt-2 text-sm text-[var(--pos-red)]">{error}</p>}

        <div className="mt-4 flex gap-2">
          {onCerrar && (
            <button type="button" onClick={onCerrar} className="btn rounded-lg px-4 py-2 text-sm">
              Seguir probando
            </button>
          )}
          <button
            type="submit"
            disabled={enviando || !codigo.trim()}
            className="btn-primary flex-1 rounded-lg py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? 'Activando...' : 'Activar'}
          </button>
        </div>
      </form>
    </div>
  )
}
