import { useEffect, useState } from 'react'
import { obtenerBalance, obtenerOpcionesFiltro } from '../api/balance'
import type { BalanceResultado } from '../api/balance'
import { obtenerDetalleFactura } from '../api/facturas'
import type { DetalleFacturaLinea, Factura } from '../api/facturas'

const hoy = () => new Date().toISOString().slice(0, 10)

export default function BalanceModal({ onCerrar }: { onCerrar: () => void }) {
  const [desde, setDesde] = useState(hoy())
  const [hasta, setHasta] = useState(hoy())
  const [metodoPago, setMetodoPago] = useState('Todos')
  const [caja, setCaja] = useState('Todas')
  const [opciones, setOpciones] = useState<{ metodos_pago: string[]; cajas: string[] }>({ metodos_pago: [], cajas: [] })
  const [resultado, setResultado] = useState<BalanceResultado | null>(null)
  const [seleccionada, setSeleccionada] = useState<Factura | null>(null)
  const [lineas, setLineas] = useState<DetalleFacturaLinea[]>([])

  useEffect(() => {
    obtenerOpcionesFiltro().then(setOpciones)
    aplicarFiltros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function aplicarFiltros() {
    const r = await obtenerBalance({ desde, hasta, metodo_pago: metodoPago, caja })
    setResultado(r)
  }

  async function verDetalle(f: Factura) {
    setSeleccionada(f)
    setLineas((await obtenerDetalleFactura(f.id)).lineas)
  }

  function aplicarPeriodo(periodo: string) {
    const hoyDate = new Date()
    if (periodo === 'hoy') {
      setDesde(hoy())
      setHasta(hoy())
    } else if (periodo === 'semana') {
      const d = new Date(hoyDate)
      d.setDate(d.getDate() - 7)
      setDesde(d.toISOString().slice(0, 10))
      setHasta(hoy())
    } else if (periodo === 'mes') {
      const d = new Date(hoyDate)
      d.setMonth(d.getMonth() - 1)
      setDesde(d.toISOString().slice(0, 10))
      setHasta(hoy())
    }
  }

  const money = (n: number) => `$ ${n.toLocaleString('es-AR')}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90">
      <div className="max-h-[85vh] w-[760px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-violet)]">📊 Balance de Ventas</h2>
          <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-white">✕</button>
        </div>

        <div className="mb-2 flex flex-wrap items-end gap-2 text-sm">
          <button onClick={() => aplicarPeriodo('hoy')} className="rounded border border-[var(--pos-border)] px-2 py-1">Hoy</button>
          <button onClick={() => aplicarPeriodo('semana')} className="rounded border border-[var(--pos-border)] px-2 py-1">Ultima semana</button>
          <button onClick={() => aplicarPeriodo('mes')} className="rounded border border-[var(--pos-border)] px-2 py-1">Ultimo mes</button>
          <div>
            <label className="block text-xs text-[var(--pos-text-dim)]">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded border border-[var(--pos-border)] bg-black px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-[var(--pos-text-dim)]">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded border border-[var(--pos-border)] bg-black px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-[var(--pos-text-dim)]">Metodo</label>
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="rounded border border-[var(--pos-border)] bg-black px-2 py-1">
              <option>Todos</option>
              {opciones.metodos_pago.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--pos-text-dim)]">Caja</label>
            <select value={caja} onChange={(e) => setCaja(e.target.value)} className="rounded border border-[var(--pos-border)] bg-black px-2 py-1">
              <option>Todas</option>
              {opciones.cajas.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={aplicarFiltros} className="rounded bg-[var(--pos-green)] px-3 py-1.5 font-semibold text-black">💚 Aplicar filtros</button>
        </div>

        {resultado && (
          <>
            <div className="mb-3 grid grid-cols-5 gap-2 text-center text-sm">
              {Object.entries(resultado.totales).map(([metodo, total]) => (
                <div key={metodo} className="rounded border border-[var(--pos-border)] p-2">
                  <p className="text-[var(--pos-text-dim)]">{metodo}</p>
                  <p className="font-bold">{money(total)}</p>
                </div>
              ))}
              <div className="rounded border border-[var(--pos-violet)] p-2">
                <p className="text-[var(--pos-text-dim)]">TOTAL</p>
                <p className="font-bold text-[var(--pos-green)]">{money(resultado.total_general)}</p>
              </div>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--pos-text-dim)]">
                  <th>Factura</th><th>Fecha</th><th>Metodo</th><th>Caja</th><th>Cliente</th><th>Usuario</th><th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {resultado.facturas.map((f) => (
                  <tr key={f.id} onClick={() => verDetalle(f)} className="cursor-pointer border-t border-[var(--pos-border)]/40 hover:bg-white/5">
                    <td>{f.numero_factura}</td><td>{f.fecha}</td><td>{f.metodo_pago}</td><td>{f.caja}</td><td>{f.cliente}</td><td>{f.usuario}</td>
                    <td className="text-right">{money(f.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {seleccionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setSeleccionada(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-[420px] rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4">
              <h3 className="mb-2 font-bold text-[var(--pos-violet)]">{seleccionada.numero_factura}</h3>
              <table className="w-full text-xs">
                <tbody>
                  {lineas.map((l) => (
                    <tr key={l.id}><td>{l.producto}</td><td className="text-right">{l.cantidad}</td><td className="text-right">{money(l.precio_total)}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-right font-bold">Total: {money(seleccionada.total)}</p>
              <button onClick={() => setSeleccionada(null)} className="mt-2 rounded border border-[var(--pos-border)] px-3 py-1 text-sm">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
