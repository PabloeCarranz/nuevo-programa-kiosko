import { useRef, useState } from 'react'
import { inicialDelNombre, useNegocioStore } from '../store/negocioStore'
import Icon from './Icon'

const MAX_NOMBRE = 60

// Panel de emojis y signos (se abre con el boton 😊, como en WhatsApp)
const CATEGORIAS: { titulo: string; items: string[] }[] = [
  { titulo: 'Brillos', items: ['✨', '⭐', '🌟', '💫', '🔥', '⚡', '👑', '💎', '🎉', '🍀', '🌈', '☀️', '🌙', '💥', '🎈', '🏆'] },
  { titulo: 'Comida y bebida', items: ['🍺', '🍻', '🍷', '☕', '🧉', '🥤', '🍔', '🍕', '🌭', '🍟', '🥩', '🥐', '🍦', '🍫', '🍬', '🍩'] },
  { titulo: 'Deportes y juegos', items: ['⚽', '🏀', '🎾', '🏓', '🏐', '🎱', '🎳', '🎯', '🎮', '🥇', '🏟️', '💪'] },
  { titulo: 'Comercio', items: ['🏪', '🛒', '🛍️', '📦', '💳', '💰', '🧾', '📱', '🔑', '🧺', '🧴', '✂️'] },
  { titulo: 'Corazones', items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍'] },
  { titulo: 'Signos', items: ['★', '☆', '✦', '✧', '✪', '❖', '◆', '◇', '•', '·', '|', '~', '♛', '♚', '™', '®'] },
]

// Rubro que se adivina por palabras del nombre -> emoji para las ideas
const RUBROS_POR_PALABRA: [RegExp, string][] = [
  [/kiosc|kiosk|golosin/, '🏪'],
  [/almacen|despensa|super|mercado|autoservicio|minimarket/, '🛒'],
  [/\bbar\b|cervec|\bpub\b|birra/, '🍺'],
  [/cancha|futbol|\bf5\b|fulbito/, '⚽'],
  [/padel|tenis/, '🎾'],
  [/\bpool\b|billar/, '🎱'],
  [/basquet|basket/, '🏀'],
  [/cafe|cafeter/, '☕'],
  [/pizz/, '🍕'],
  [/burger|hamburgues/, '🍔'],
  [/helad/, '🍦'],
  [/panader|confiter/, '🥐'],
  [/parrill|asado|carnicer/, '🥩'],
  [/gimnas|\bgym\b|fitness/, '💪'],
  [/bowling|bolos/, '🎳'],
  [/juego|gamer|\bplay\b/, '🎮'],
  [/vino|vinoteca/, '🍷'],
  [/rotiser|comida/, '🍗'],
]

// Adornos que quedan bien en cualquier negocio
const MARCOS_GENERALES: [string, string][] = [
  ['✨ ', ' ✨'],
  ['⭐ ', ' ⭐'],
  ['👑 ', ' 👑'],
  ['★ ', ' ★'],
  ['【 ', ' 】'],
  ['« ', ' »'],
]

const EJEMPLOS = 'Ej: Kiosco Don Pepe, Pádel Norte, Bar El Faro'

function sinAcentos(texto: string) {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

// Saca los adornos de los bordes para volver a vestir el nombre limpio
function nombreLimpio(nombre: string): string {
  return nombre.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.!?)]+$/gu, '').trim()
}

function ideasPara(base: string): string[] {
  if (!base) return []
  const palabras = sinAcentos(base)
  const delRubro = RUBROS_POR_PALABRA.filter(([re]) => re.test(palabras)).map(([, emoji]) => emoji)
  const marcos: [string, string][] = [
    ...delRubro.map((e): [string, string] => [`${e} `, ` ${e}`]),
    ...(delRubro.length >= 2 ? [[`${delRubro[0]} `, ` ${delRubro[1]}`] as [string, string]] : []),
    ...MARCOS_GENERALES,
  ]
  const ideas = marcos.map(([izq, der]) => `${izq}${base}${der}`).filter((s) => s.length <= MAX_NOMBRE)
  return [...new Set(ideas)].slice(0, 8)
}

export default function EditorNombre({
  titulo,
  descripcion,
  textoBoton,
  onListo,
  onCancelar,
}: {
  titulo: string
  descripcion: string
  textoBoton: string
  onListo: () => void
  onCancelar?: () => void
}) {
  const { negocio, configurado, cambiarNombre } = useNegocioStore()
  const nombreOriginal = configurado ? negocio.nombre : ''
  const [nombre, setNombre] = useState(nombreOriginal)
  const [password, setPassword] = useState('')
  const [verEmojis, setVerEmojis] = useState(false)
  const [verIdeas, setVerIdeas] = useState(false)
  const [categoria, setCategoria] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const base = nombreLimpio(nombre)
  const ideas = ideasPara(base)
  const huboCambio = nombre.trim() !== nombreOriginal.trim()

  function insertar(texto: string) {
    const input = inputRef.current
    const desde = input?.selectionStart ?? nombre.length
    const hasta = input?.selectionEnd ?? nombre.length
    const nuevo = (nombre.slice(0, desde) + texto + nombre.slice(hasta)).slice(0, MAX_NOMBRE)
    setNombre(nuevo)
    requestAnimationFrame(() => {
      input?.focus()
      const pos = Math.min(desde + texto.length, nuevo.length)
      input?.setSelectionRange(pos, pos)
    })
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Escribí un nombre para el sistema')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await cambiarNombre(nombre.trim(), password)
      onListo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el nombre')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-sm text-[var(--pos-text-dim)]">{descripcion}</p>
      </div>

      {/* El campo es a la vez la vista previa: se escribe directo aca */}
      <div>
        <div className="flex items-center gap-3 rounded-xl border-2 border-[var(--pos-border)] bg-[var(--pos-input)] py-2 pr-2 pl-3 transition focus-within:border-[var(--pos-primary)] focus-within:shadow-[0_0_0_3px_var(--pos-focus-ring)]">
          <span className="brand-mark">{inicialDelNombre(nombre)}</span>
          <input
            id="nombre-sistema"
            ref={inputRef}
            value={nombre}
            maxLength={MAX_NOMBRE}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={EJEMPLOS}
            autoFocus
            aria-label="Nombre del negocio"
            className="min-w-0 flex-1 border-0 bg-transparent py-1 text-[length:var(--pos-brand-size)] font-bold !shadow-none outline-none placeholder:text-base placeholder:font-normal"
          />
          <button
            type="button"
            onClick={() => setVerEmojis((v) => !v)}
            aria-expanded={verEmojis}
            title="Agregar emojis o signos"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl transition ${
              verEmojis ? 'bg-[var(--pos-primary-soft)]' : 'hover:bg-[var(--pos-panel-2)]'
            }`}
          >
            😊
          </button>
        </div>
        <p className="mt-1 text-right text-xs text-[var(--pos-text-dim)]">
          {nombre.length}/{MAX_NOMBRE}
        </p>
      </div>

      {verEmojis && (
        <div className="-mt-3 rounded-xl ring-1 ring-[var(--pos-border)]">
          <div className="flex gap-1 overflow-x-auto border-b border-[var(--pos-border)] p-1.5">
            {CATEGORIAS.map((c, i) => (
              <button
                key={c.titulo}
                type="button"
                onClick={() => setCategoria(i)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
                  categoria === i ? 'bg-[var(--pos-primary-soft)] text-[var(--pos-primary)]' : 'text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]'
                }`}
              >
                {c.items[0]} {c.titulo}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-0.5 p-1.5">
            {CATEGORIAS[categoria].items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => insertar(item)}
                title={`Agregar ${item}`}
                className="flex h-9 items-center justify-center rounded-lg text-lg transition hover:scale-110 hover:bg-[var(--pos-primary-soft)]"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {ideas.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setVerIdeas((v) => !v)}
            aria-expanded={verIdeas}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--pos-primary)] hover:underline"
          >
            <span className={`inline-block transition-transform ${verIdeas ? 'rotate-90' : ''}`}>▸</span>
            ✨ Ideas para decorarlo
          </button>
          {verIdeas && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ideas.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNombre(s)}
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    s === nombre
                      ? 'bg-[var(--pos-primary)] text-[var(--pos-on-primary)]'
                      : 'bg-[var(--pos-panel-2)] ring-1 ring-[var(--pos-border)] hover:ring-[var(--pos-primary)]'
                  }`}
                >
                  {s}
                </button>
              ))}
              {base !== nombre.trim() && (
                <button
                  type="button"
                  onClick={() => setNombre(base)}
                  className="rounded-full px-3 py-1 text-sm text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)] hover:text-[var(--pos-text)]"
                >
                  Sin adornos
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-[var(--pos-border)] pt-4">
        <label className="section-label mb-1 flex items-center gap-1.5" htmlFor="password-master">
          <Icon name="lock" size={13} /> Contraseña de Master
        </label>
        <input
          id="password-master"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2"
        />
        <p className="mt-1 text-xs text-[var(--pos-text-dim)]">El nombre tiene candado: solo el Master puede cambiarlo.</p>
      </div>

      {error && <p className="rounded-lg bg-[var(--pos-red-soft)] px-3 py-2 text-sm text-[var(--pos-red)]">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="btn rounded-xl px-4 py-2 text-sm font-medium">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={guardando || !password || !nombre.trim() || (configurado && !huboCambio)}
          className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold"
        >
          {guardando ? 'Guardando...' : textoBoton}
        </button>
      </div>
    </form>
  )
}
