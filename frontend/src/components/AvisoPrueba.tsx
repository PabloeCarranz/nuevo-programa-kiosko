import { useState } from 'react'
import { useLicenciaStore } from '../store/licenciaStore'
import ActivarLicencia from './ActivarLicencia'

// Cartelito con los dias que quedan de la prueba gratuita. No se muestra si el programa ya esta activado.
export default function AvisoPrueba() {
  const licencia = useLicenciaStore((s) => s.licencia)
  const [abierto, setAbierto] = useState(false)

  if (licencia?.estado !== 'prueba') return null
  const quedan = licencia.dias_restantes
  const urgente = quedan <= 2

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        title="Activar el programa con un código"
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:brightness-95 ${
          urgente
            ? 'border-[var(--pos-red)] bg-[var(--pos-red-soft)] text-[var(--pos-red)]'
            : 'border-[var(--pos-accent-border)] bg-[var(--pos-accent-soft)] text-[var(--pos-accent)]'
        }`}
      >
        Prueba gratuita · {quedan === 1 ? 'queda 1 día' : `quedan ${quedan} días`} · Activar
      </button>
      {abierto && <ActivarLicencia onCerrar={() => setAbierto(false)} />}
    </>
  )
}
