import { useEffect, useState } from 'react'
import { confirmarCierre, obtenerResumenCierre } from '../api/cierre'
import type { ResumenCierre } from '../api/cierre'

export default function CierreCajaModal({ onCerrado, onCancelar }: { onCerrado: () => void; onCancelar: () => void }) {
  const [resumen, setResumen] = useState<ResumenCierre | null>(null)
  const [cargando, setCargando] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [reporteFinal, setReporteFinal] = useState<string | null>(null)

  useEffect(() => {
    obtenerResumenCierre()
      .then(setResumen)
      .finally(() => setCargando(false))
  }, [])

  async function handleGuardarReporte() {
    if (!confirm('¿Confirmar el cierre de caja? Esta accion no se puede deshacer.')) return
    setConfirmando(true)
    try {
      const resultado = await confirmarCierre()
      setReporteFinal(resultado.texto)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo confirmar el cierre')
    } finally {
      setConfirmando(false)
    }
  }

  const money = (n: number) => `$ ${n.toLocaleString('es-AR')}`

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90">
      <div className="max-h-[85vh] w-[600px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <h2 className="mb-3 text-center text-lg font-bold text-[var(--pos-violet)]">🧾 Cierre de Caja</h2>

        {reporteFinal ? (
          <>
            <pre className="max-h-96 overflow-auto whitespace-pre rounded bg-black p-3 font-mono text-xs leading-tight">{reporteFinal}</pre>
            <div className="mt-3 flex justify-end">
              <button
                onClick={onCerrado}
                className="rounded bg-[var(--pos-violet)] px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110"
              >
                Aceptar
              </button>
            </div>
          </>
        ) : cargando ? (
          <p className="text-center text-[var(--pos-text-dim)]">Cargando resumen...</p>
        ) : resumen && resumen.grupos.length === 0 ? (
          <p className="text-center text-[var(--pos-text-dim)]">No hay movimientos desde el ultimo cierre ({resumen.desde}).</p>
        ) : (
          resumen && (
            <>
              <p className="mb-2 text-sm text-[var(--pos-text-dim)]">Desde: {resumen.desde}</p>
              {resumen.grupos.map((grupo) => (
                <div key={grupo.metodo_pago} className="mb-3 rounded border border-[var(--pos-border)] p-2 text-sm">
                  <p className="mb-1 font-semibold text-[var(--pos-violet)]">{grupo.metodo_pago}</p>
                  <table className="w-full text-xs">
                    <tbody>
                      {grupo.lineas.map((linea) => (
                        <tr key={linea.producto}>
                          <td>{linea.producto}</td>
                          <td className="text-right">{linea.cantidad}</td>
                          <td className="text-right">{money(linea.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {grupo.metodo_pago === 'Multipago' && (
                    <p className="mt-1 text-xs text-[var(--pos-text-dim)]">
                      Efectivo: {money(grupo.efectivo ?? 0)} — Transferencia: {money(grupo.transferencia ?? 0)}
                    </p>
                  )}
                  <p className="mt-1 text-right font-semibold">Subtotal: {money(grupo.total)}</p>
                </div>
              ))}
              <p className="mb-3 text-right text-lg font-bold text-[var(--pos-green)]">TOTAL GENERAL: {money(resumen.total_general)}</p>
              <div className="flex justify-end gap-2">
                <button onClick={onCancelar} className="rounded border border-[var(--pos-border)] px-3 py-1.5 text-sm text-[var(--pos-text-dim)]">
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarReporte}
                  disabled={confirmando}
                  className="rounded bg-[var(--pos-violet)] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {confirmando ? 'Guardando...' : '💾 Guardar Reporte'}
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
