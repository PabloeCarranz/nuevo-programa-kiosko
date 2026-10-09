import { useState } from 'react'
import type { RubroEditado } from '../api/rubros'
import { TECLAS_RUBRO, useNegocioStore } from '../store/negocioStore'
import Icon from './Icon'

const MAX_NOMBRE = 24
// 4 originales + 10 bloques de codigos libres (ver rubros_service.py)
const MAX_RUBROS = 14

const EMOJIS_RUBRO = [
  '🍬', '🍫', '🍭', '🥤', '🍺', '🍷', '☕', '🧉', '🍔', '🍕', '🌭', '🍟', '🥩', '🍗', '🥐', '🍞',
  '🍦', '🧃', '🥛', '🧀', '🍎', '🥦', '🥚', '🛒', '🧴', '🧻', '🧼', '🚬', '📚', '✏️', '📱', '🔋',
  '💊', '🐶', '🎁', '🎮', '⚽', '🎾', '🎱', '⏱️', '🏪', '📦', '🔧', '💡', '👕', '⭐',
]

interface Fila extends RubroEditado {
  id: string // clave estable para React, tambien en los nuevos
  es_tiempo: boolean
}

export default function GestionRubrosModal({ onCerrar }: { onCerrar: () => void }) {
  const { rubros, guardarRubros } = useNegocioStore()
  const [filas, setFilas] = useState<Fila[]>(() =>
    rubros.map((r) => ({ id: r.clave, clave: r.clave, nombre: r.nombre, emoji: r.emoji, activo: r.activo, es_tiempo: r.es_tiempo })),
  )
  const [emojiAbierto, setEmojiAbierto] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const original = JSON.stringify(rubros.map((r) => [r.clave, r.nombre, r.emoji, r.activo]))
  const actual = JSON.stringify(filas.map((f) => [f.clave, f.nombre.trim(), f.emoji, f.activo]))
  const huboCambios = original !== actual

  function cambiar(id: string, cambios: Partial<Fila>) {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, ...cambios } : f)))
  }

  function mover(indice: number, delta: number) {
    setFilas((fs) => {
      const destino = indice + delta
      if (destino < 0 || destino >= fs.length) return fs
      const copia = [...fs]
      ;[copia[indice], copia[destino]] = [copia[destino], copia[indice]]
      return copia
    })
  }

  function agregar() {
    const id = `nuevo-${Date.now()}`
    setFilas((fs) => [...fs, { id, clave: null, nombre: '', emoji: '📦', activo: true, es_tiempo: false }])
    setTimeout(() => document.getElementById(`rubro-${id}`)?.focus(), 0)
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (filas.some((f) => !f.nombre.trim())) {
      setError('Todos los rubros necesitan un nombre')
      return
    }
    setGuardando(true)
    try {
      await guardarRubros(
        filas.map(({ clave, nombre, emoji, activo }) => ({ clave, nombre: nombre.trim(), emoji, activo })),
        password,
      )
      onCerrar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los rubros')
    } finally {
      setGuardando(false)
    }
  }

  let visibles = 0

  return (
    <div className="pos-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <form
        onSubmit={handleGuardar}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--pos-border)] bg-[var(--pos-panel)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--pos-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">Rubros</h2>
            <p className="text-sm text-[var(--pos-text-dim)]">
              Agrupan tus productos. Cambiá el nombre o el emoji, ordenalos, ocultá los que no uses o agregá nuevos.
            </p>
          </div>
          <button type="button" onClick={onCerrar} className="btn-icon" title="Cerrar">
            <Icon name="x" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ul className="flex flex-col gap-2">
            {filas.map((f, i) => {
              const tecla = f.activo ? TECLAS_RUBRO[visibles++] : undefined
              return (
                <li
                  key={f.id}
                  className={`relative flex items-center gap-2 rounded-xl p-2 ring-1 transition ${
                    f.activo ? 'bg-[var(--pos-panel)] ring-[var(--pos-border)]' : 'bg-[var(--pos-panel-2)] opacity-60 ring-[var(--pos-border)]'
                  }`}
                >
                  <div className="flex flex-col">
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="btn-x px-1 leading-none disabled:opacity-20" title="Subir">
                      ▲
                    </button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === filas.length - 1} className="btn-x px-1 leading-none disabled:opacity-20" title="Bajar">
                      ▼
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEmojiAbierto(emojiAbierto === f.id ? null : f.id)}
                    title="Cambiar emoji"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--pos-panel-2)] text-xl ring-1 ring-[var(--pos-border)] transition hover:ring-[var(--pos-primary)]"
                  >
                    {f.emoji || '·'}
                  </button>

                  <div className="min-w-0 flex-1">
                    <input
                      id={`rubro-${f.id}`}
                      value={f.nombre}
                      maxLength={MAX_NOMBRE}
                      onChange={(e) => cambiar(f.id, { nombre: e.target.value })}
                      placeholder="Nombre del rubro"
                      className="w-full rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-1.5 font-medium"
                    />
                    <div className="mt-0.5 flex gap-1.5 px-1 text-[0.7rem] text-[var(--pos-text-dim)]">
                      {f.clave === null && <span className="font-semibold text-[var(--pos-green)]">Nuevo</span>}
                      {f.es_tiempo && <span>Alquiler por tiempo</span>}
                      {!f.activo && <span>Oculto</span>}
                    </div>
                  </div>

                  {tecla && (
                    <kbd className="shrink-0 rounded bg-[var(--pos-panel-2)] px-1.5 font-mono text-xs text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)]">
                      {tecla}
                    </kbd>
                  )}

                  <button
                    type="button"
                    onClick={() => cambiar(f.id, { activo: !f.activo })}
                    title={f.activo ? 'Ocultar este rubro' : 'Mostrar este rubro'}
                    className="btn-icon shrink-0"
                  >
                    <Icon name={f.activo ? 'eye' : 'eyeOff'} />
                  </button>
                  {f.clave === null && (
                    <button
                      type="button"
                      onClick={() => setFilas((fs) => fs.filter((x) => x.id !== f.id))}
                      title="Quitar (todavía no se guardó)"
                      className="btn-x flex h-8 w-8 shrink-0 items-center justify-center"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  )}

                  {emojiAbierto === f.id && (
                    <div className="absolute top-full left-8 z-10 mt-1 grid w-72 grid-cols-8 gap-0.5 rounded-xl border border-[var(--pos-border)] bg-[var(--pos-panel)] p-1.5 shadow-[var(--pos-shadow-lg)]">
                      {EMOJIS_RUBRO.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            cambiar(f.id, { emoji })
                            setEmojiAbierto(null)
                          }}
                          className={`flex h-8 items-center justify-center rounded-lg text-lg hover:bg-[var(--pos-primary-soft)] ${
                            f.emoji === emoji ? 'bg-[var(--pos-primary-soft)]' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            onClick={agregar}
            disabled={filas.length >= MAX_RUBROS}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--pos-border-strong)] py-2.5 text-sm font-semibold text-[var(--pos-primary)] transition hover:border-[var(--pos-primary)] hover:bg-[var(--pos-primary-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="plus" size={16} /> Agregar rubro
          </button>
          <p className="mt-2 text-xs text-[var(--pos-text-dim)]">
            Los rubros no se borran (sus ventas quedan en el historial): si no lo usás, ocultalo con el ojito. Los atajos F1–F8 se reparten entre los
            visibles, en este orden.
          </p>
        </div>

        <footer className="border-t border-[var(--pos-border)] bg-[var(--pos-panel-2)] px-5 py-4">
          <label className="section-label mb-1 flex items-center gap-1.5" htmlFor="password-rubros">
            <Icon name="lock" size={13} /> Contraseña de Master
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="password-rubros"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="min-w-0 flex-1 rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2"
            />
            <button type="button" onClick={onCerrar} className="btn rounded-xl px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={guardando || !password || !huboCambios} className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
          {error && <p className="mt-2 rounded-lg bg-[var(--pos-red-soft)] px-3 py-2 text-sm text-[var(--pos-red)]">{error}</p>}
        </footer>
      </form>
    </div>
  )
}
