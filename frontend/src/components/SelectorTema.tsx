import { useEffect, useRef, useState } from 'react'
import { TAMANIOS, TEMAS, useTemaStore } from '../store/temaStore'
import type { TemaId } from '../store/temaStore'
import Icon from './Icon'
import type { IconName } from './Icon'

const ICONO: Record<TemaId, IconName> = { claro: 'sun', oscuro: 'moon', sistema: 'monitor' }

export default function SelectorTema() {
  const { tema, setTema, tamanio, setTamanio } = useTemaStore()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function cerrarSiAfuera(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setAbierto(false)
    }
    function cerrarConEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', cerrarSiAfuera)
    document.addEventListener('keydown', cerrarConEsc)
    return () => {
      document.removeEventListener('mousedown', cerrarSiAfuera)
      document.removeEventListener('keydown', cerrarConEsc)
    }
  }, [abierto])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAbierto((v) => !v)} className="btn-icon" title="Tema y tamaño de letra" aria-haspopup="menu" aria-expanded={abierto}>
        <Icon name={ICONO[tema]} />
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-48 rounded-xl border border-[var(--pos-border)] bg-[var(--pos-panel)] p-1.5 shadow-[var(--pos-shadow-lg)]"
        >
          <p className="section-label px-2.5 pt-1 pb-1.5">Tema</p>
          {TEMAS.map((t) => (
            <button
              key={t.id}
              role="menuitemradio"
              aria-checked={tema === t.id}
              onClick={() => {
                setTema(t.id)
                setAbierto(false)
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-[var(--pos-primary-soft)] ${
                tema === t.id ? 'font-semibold text-[var(--pos-primary)]' : ''
              }`}
            >
              <Icon name={ICONO[t.id]} size={16} />
              <span className="flex-1">{t.label}</span>
              {tema === t.id && <Icon name="check" size={15} />}
            </button>
          ))}

          <div className="my-1.5 h-px bg-[var(--pos-border)]" />
          <p className="section-label px-2.5 pt-1 pb-1.5">Tamaño de letra</p>
          <div className="grid grid-cols-3 gap-1 px-1 pb-1" role="group" aria-label="Tamaño de letra">
            {TAMANIOS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setTamanio(t.id)}
                aria-pressed={tamanio === t.id}
                title={t.label}
                className={`flex h-9 items-end justify-center rounded-lg pb-1.5 font-semibold leading-none transition ${
                  tamanio === t.id
                    ? 'bg-[var(--pos-primary)] text-[var(--pos-on-primary)]'
                    : 'bg-[var(--pos-panel-2)] text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)] hover:text-[var(--pos-text)]'
                }`}
                style={{ fontSize: `${0.8 + i * 0.25}rem` }}
              >
                A
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
