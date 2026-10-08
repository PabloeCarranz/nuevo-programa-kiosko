import { useState } from 'react'
import { obtenerKardex } from '../api/kardex'
import type { Kardex } from '../api/kardex'

export default function KardexModal({ onCerrar }: { onCerrar: () => void }) {
  const [codigo, setCodigo] = useState('')
  const [kardex, setKardex] = useState<Kardex | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function buscar() {
    setError(null)
    setKardex(null)
    try {
      const data = await obtenerKardex(Number(codigo))
      setKardex(data)
    } catch {
      setError('Producto no encontrado')
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90">
      <div className="max-h-[85vh] w-[640px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-violet)]">Movimientos de Stock</h2>
          <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-white">✕</button>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 5))}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="Codigo del producto"
            className="w-40 rounded border border-[var(--pos-border)] bg-black px-2 py-1 text-sm"
          />
          <button onClick={buscar} className="rounded bg-[var(--pos-violet)] px-3 py-1 text-sm font-semibold text-white">
            Buscar
          </button>
        </div>

        {error && <p className="text-[var(--pos-red)]">{error}</p>}

        {kardex && (
          <>
            <p className="mb-2 font-semibold">{kardex.nombre}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--pos-text-dim)]">
                  <th>Fecha</th><th>Tipo</th><th>Detalle</th><th className="text-right">Cant.</th><th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {kardex.movimientos.map((m, i) => (
                  <tr key={i} className="border-t border-[var(--pos-border)]/40">
                    <td>{m.fecha}</td>
                    <td className={m.cantidad >= 0 ? 'text-[var(--pos-green)]' : 'text-[var(--pos-red)]'}>{m.tipo}</td>
                    <td>{m.detalle}</td>
                    <td className="text-right">{m.cantidad}</td>
                    <td className="text-right">{m.saldo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
