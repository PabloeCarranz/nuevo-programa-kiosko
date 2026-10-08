import { useEffect, useState } from 'react'
import { listarPorRubro } from '../api/productos'
import type { Producto } from '../api/productos'

import { useNegocioStore } from '../store/negocioStore'

const TECLAS: Record<string, string> = { golosinas: 'F1', bebidas: 'F2', cigarros: 'F3', mesa_pool: 'F4' }

export default function ListadoRubroModal({ rubro, onCerrar }: { rubro: string; onCerrar: () => void }) {
  const [productos, setProductos] = useState<Producto[]>([])
  const nombreRubro = useNegocioStore((s) => s.nombreRubro)

  useEffect(() => {
    listarPorRubro(rubro).then(setProductos)
  }, [rubro])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90">
      <div className="max-h-[80vh] w-[420px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-violet)]">{nombreRubro(rubro)} ({TECLAS[rubro]})</h2>
          <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-white">✕</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--pos-text-dim)]"><th>#</th><th>Producto</th><th className="text-right">Precio</th></tr>
          </thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={p.codigo} className="border-t border-[var(--pos-border)]/40">
                <td>{i + 1}</td><td>{p.nombre}</td><td className="text-right">{p.precio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
