import { useEffect, useState } from 'react'
import { listarPorRubro } from '../api/productos'
import type { Producto } from '../api/productos'

import { useNegocioStore } from '../store/negocioStore'


export default function ListadoRubroModal({ rubro, onCerrar }: { rubro: string; onCerrar: () => void }) {
  const [productos, setProductos] = useState<Producto[]>([])
  const rubroInfo = useNegocioStore((s) => s.rubros.find((r) => r.clave === rubro))
  const tecla = useNegocioStore((s) => s.teclaDeRubro(rubro))

  useEffect(() => {
    listarPorRubro(rubro).then(setProductos)
  }, [rubro])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pos-overlay">
      <div className="max-h-[80vh] w-[420px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-primary)]">{rubroInfo?.emoji} {rubroInfo?.nombre ?? rubro}
            {tecla && <span className="ml-2 text-sm font-normal text-[var(--pos-text-dim)]">({tecla})</span>}</h2>
          <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]">✕</button>
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
