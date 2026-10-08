import { useEffect, useState } from 'react'
import { buscarProducto } from '../api/productos'
import { anularIngreso, listarIngresosRecientes, registrarIngreso } from '../api/ingresos'
import type { Ingreso } from '../api/ingresos'

const RUBROS = ['golosinas', 'bebidas', 'cigarros'] as const

function formatearFecha(fecha: string): string {
  const parte = fecha.split(' ')[0] // "YYYY-MM-DD"
  const [anio, mes, dia] = parte.split('-')
  if (!anio || !mes || !dia) return fecha
  return `${dia}/${mes}/${anio.slice(2)}`
}

export default function IngresoMercaderiaModal({ onCerrar }: { onCerrar: () => void }) {
  const [rubro, setRubro] = useState<(typeof RUBROS)[number]>('golosinas')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [comentario, setComentario] = useState('')
  const [recientes, setRecientes] = useState<Ingreso[]>([])
  const [mostrarRecientes, setMostrarRecientes] = useState(false)

  function cargarRecientes() {
    listarIngresosRecientes().then(setRecientes)
  }

  useEffect(() => {
    if (mostrarRecientes) cargarRecientes()
  }, [mostrarRecientes])

  async function handleCodigoChange(valor: string) {
    const limpio = valor.replace(/\D/g, '').slice(0, 5)
    setCodigo(limpio)
    if (limpio.length === 5) {
      try {
        const p = await buscarProducto(limpio)
        setNombre(p.nombre)
      } catch {
        setNombre(null)
      }
    } else {
      setNombre(null)
    }
  }

  async function handleRegistrar() {
    const cant = parseInt(cantidad, 10)
    if (!nombre || !Number.isFinite(cant) || cant <= 0) return
    if (comentario.length > 50) {
      alert('El comentario no puede superar 50 caracteres')
      return
    }
    try {
      const r = await registrarIngreso(rubro, Number(codigo), cant, comentario)
      alert(`Ingreso registrado: ${r.detalle}`)
      setCodigo('')
      setNombre(null)
      setCantidad('')
      setComentario('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo registrar el ingreso')
    }
  }

  async function handleAnular(id: number) {
    if (!confirm('¿Anular este ingreso? Se revertira el stock sumado.')) return
    await anularIngreso(id)
    cargarRecientes()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90">
      <div className="w-[520px] rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-violet)]">Ingreso de Mercaderia</h2>
          <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-white">✕</button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <label className="block text-[var(--pos-text-dim)]">Rubro</label>
            <select value={rubro} onChange={(e) => setRubro(e.target.value as typeof rubro)} className="w-full rounded border border-[var(--pos-border)] bg-black px-2 py-1">
              {RUBROS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[var(--pos-text-dim)]">Codigo (5 digitos)</label>
            <input value={codigo} onChange={(e) => handleCodigoChange(e.target.value)} className="w-full rounded border border-[var(--pos-border)] bg-black px-2 py-1" />
          </div>
        </div>
        <p className="mb-2 text-sm text-[var(--pos-text-dim)]">{nombre ?? (codigo.length === 5 ? 'Codigo no encontrado' : ' ')}</p>
        <div className="mb-2">
          <label className="block text-sm text-[var(--pos-text-dim)]">Cantidad</label>
          <input value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ''))} className="w-full rounded border border-[var(--pos-border)] bg-black px-2 py-1" />
        </div>
        <div className="mb-3">
          <label className="block text-sm text-[var(--pos-text-dim)]">Comentarios (max 50)</label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value.slice(0, 50))}
            className="w-full rounded border border-[var(--pos-border)] bg-black px-2 py-1 text-sm"
            rows={2}
          />
        </div>
        <div className="flex justify-between">
          <button onClick={() => setMostrarRecientes((v) => !v)} className="rounded border border-[var(--pos-border)] px-3 py-1.5 text-sm">
            {mostrarRecientes ? 'Ocultar' : 'Ver'} ultimos ingresos
          </button>
          <button
            onClick={handleRegistrar}
            disabled={!nombre || !cantidad}
            className="rounded bg-[var(--pos-violet)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Registrar Ingreso
          </button>
        </div>

        {mostrarRecientes && (
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--pos-text-dim)]">
                <th>Fecha</th><th>Detalle</th><th>Codigo</th><th>Producto</th><th>Cant.</th><th></th>
              </tr>
            </thead>
            <tbody>
              {recientes.map((ing) => (
                <tr key={ing.ID} className="border-t border-[var(--pos-border)]/40">
                  <td className="py-1">{formatearFecha(ing.FECHA)}</td>
                  <td>{ing.DETALLE}</td>
                  <td>{ing.CODIGO}</td>
                  <td>{ing.NOMBRE_PRODUCTO}</td>
                  <td>{ing.CANTIDAD_INGRESADA}</td>
                  <td>
                    <button onClick={() => handleAnular(ing.ID)} className="text-[var(--pos-red)] hover:underline">
                      Anular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
