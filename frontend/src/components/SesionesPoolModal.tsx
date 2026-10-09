import { useEffect, useState } from 'react'
import { actualizarFacturado, borrarSesion, listarSesiones } from '../api/pool'
import type { SesionPool } from '../api/pool'
import { useAuthStore } from '../store/authStore'

export default function SesionesPoolModal({ onCerrar }: { onCerrar: () => void }) {
  const esMaster = useAuthStore((s) => s.usuario?.rol === 'master')
  const [sesiones, setSesiones] = useState<SesionPool[]>([])

  function cargar() {
    listarSesiones().then(setSesiones)
  }
  useEffect(cargar, [])

  async function toggleFacturado(s: SesionPool) {
    if (!esMaster) return
    const nuevoValor = !s.facturado
    let comentario: string | undefined
    if (nuevoValor) {
      const respuesta = window.prompt('Comentario (opcional, max 100 caracteres):', s.COMENTARIOS ?? '')
      if (respuesta !== null) comentario = respuesta.slice(0, 100)
    }
    await actualizarFacturado(s.id, nuevoValor, comentario)
    cargar()
  }

  async function borrar(s: SesionPool) {
    if (!esMaster) return
    if (!confirm(`¿Borrar la sesion de ${s.cliente}?`)) return
    await borrarSesion(s.id)
    cargar()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pos-overlay">
      <div className="max-h-[85vh] w-[820px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-primary)]">Sesiones de Mesa de Pool (F10)</h2>
          <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]">✕</button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--pos-text-dim)]">
              <th>Cliente</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Inicia</th><th>Termina</th><th>Facturado</th><th>Comentario</th>{esMaster && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sesiones.map((s) => (
              <tr key={s.id} className="border-t border-[var(--pos-border)]/40">
                <td>{s.cliente}</td>
                <td>{s.inicio_tiempo}</td>
                <td>{s.fin_tiempo ?? '-'}</td>
                <td>{s.estado}</td>
                <td>{s.usuario_inicia}</td>
                <td>{s.usuario_termina ?? '-'}</td>
                <td
                  onClick={() => toggleFacturado(s)}
                  className={`${esMaster ? 'cursor-pointer underline' : ''} ${s.facturado ? 'text-[var(--pos-green)]' : 'text-[var(--pos-red)]'}`}
                >
                  {s.facturado ? 'Si' : 'No'}
                </td>
                <td className="max-w-[120px] truncate" title={s.COMENTARIOS ?? ''}>{s.COMENTARIOS ?? ''}</td>
                {esMaster && (
                  <td>
                    <button onClick={() => borrar(s)} className="text-[var(--pos-red)] hover:underline">Borrar</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
