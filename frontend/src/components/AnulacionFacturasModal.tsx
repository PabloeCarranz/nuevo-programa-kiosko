import { useEffect, useState } from 'react'
import { anularFactura, listarFacturas, listarFacturasAnuladas, obtenerDetalleFactura } from '../api/facturas'
import type { DetalleFacturaLinea, Factura } from '../api/facturas'

export default function AnulacionFacturasModal({ onCerrar }: { onCerrar: () => void }) {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [anuladas, setAnuladas] = useState<Factura[]>([])
  const [verAnuladas, setVerAnuladas] = useState(false)
  const [seleccionada, setSeleccionada] = useState<Factura | null>(null)
  const [lineas, setLineas] = useState<DetalleFacturaLinea[]>([])

  function cargar() {
    listarFacturas().then(setFacturas)
  }
  useEffect(cargar, [])

  async function seleccionar(f: Factura) {
    setSeleccionada(f)
    const detalle = await obtenerDetalleFactura(f.id)
    setLineas(detalle.lineas)
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const esDeHoy = seleccionada?.fecha.startsWith(hoy)

  async function handleAnular() {
    if (!seleccionada) return
    if (!confirm(`¿Anular la factura ${seleccionada.numero_factura}? Se repondra el stock.`)) return
    try {
      await anularFactura(seleccionada.id)
      setSeleccionada(null)
      setLineas([])
      cargar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo anular la factura')
    }
  }

  async function toggleAnuladas() {
    if (!verAnuladas) await listarFacturasAnuladas().then(setAnuladas)
    setVerAnuladas((v) => !v)
  }

  const lista = verAnuladas ? anuladas : facturas
  const money = (n: number) => `$ ${n.toLocaleString('es-AR')}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pos-overlay">
      <div className="max-h-[85vh] w-[700px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-primary)]">{verAnuladas ? 'Facturas Anuladas' : 'Listado de Facturas'}</h2>
          <div className="flex gap-2">
            <button onClick={toggleAnuladas} className="rounded border border-[var(--pos-border)] px-3 py-1 text-sm">
              {verAnuladas ? 'Ver activas' : '📜 Ver Anuladas'}
            </button>
            <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]">✕</button>
          </div>
        </div>

        <select
          onChange={(e) => {
            const f = lista.find((x) => x.id === Number(e.target.value))
            if (f) seleccionar(f)
          }}
          value={seleccionada?.id ?? ''}
          className="mb-3 w-full rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1 text-sm"
        >
          <option value="">Seleccionar factura...</option>
          {lista.map((f) => (
            <option key={f.id} value={f.id}>
              📄 FACT {f.numero_factura} — Caja {f.caja} — {f.fecha}
            </option>
          ))}
        </select>

        {seleccionada && (
          <div className="rounded border border-[var(--pos-border)] p-3 text-sm">
            <p>Cliente: {seleccionada.cliente}</p>
            <p>Usuario: {seleccionada.usuario}</p>
            <p>Medio de pago: {seleccionada.metodo_pago}</p>
            <p>Fecha: {seleccionada.fecha}</p>
            <table className="mt-2 w-full text-xs">
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.id}>
                    <td>{l.producto}</td>
                    <td className="text-right">{l.cantidad}</td>
                    <td className="text-right">{money(l.precio_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-right font-bold">Total: {money(seleccionada.total)}</p>

            {!verAnuladas && (
              <button
                onClick={handleAnular}
                disabled={!esDeHoy}
                title={esDeHoy ? '' : 'Solo se pueden anular facturas de hoy'}
                className="mt-2 rounded bg-[var(--pos-red)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-30"
              >
                ❌ Anular Factura
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
