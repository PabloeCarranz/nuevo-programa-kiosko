import { useEffect, useState } from 'react'
import { borrarCliente, listarClientes } from '../api/clientes'
import type { Cliente } from '../api/clientes'

const COLUMNAS = 6
const FILAS = 9
const POLL_MS = 4000

function formatearNombre(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/)
  if (partes.length >= 2) {
    const nombre = partes[0].slice(0, 7)
    const inicialApellido = partes[partes.length - 1][0]?.toUpperCase() ?? ''
    return `${nombre} ${inicialApellido}`
  }
  return nombreCompleto.slice(0, 8)
}

export default function ClienteGrid({ onSeleccionar }: { onSeleccionar: (cliente: Cliente) => void }) {
  const [clientes, setClientes] = useState<Cliente[]>([])

  async function refrescar() {
    try {
      const lista = await listarClientes()
      setClientes(lista)
    } catch {
      // silencioso: el proximo poll reintenta
    }
  }

  useEffect(() => {
    refrescar()
    const id = setInterval(refrescar, POLL_MS)
    return () => clearInterval(id)
  }, [])

  async function handleBorrar(e: React.SyntheticEvent, cliente: Cliente) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`¿Borrar a ${cliente.nombre}?`)) return
    await borrarCliente(cliente.id)
    refrescar()
  }

  const celdas = Array.from({ length: COLUMNAS * FILAS }, (_, i) => clientes[i])

  return (
    <div className="grid grid-cols-6 gap-1.5">
      {celdas.map((cliente, i) =>
        cliente ? (
          <div key={cliente.id} className="group relative">
            <button
              onClick={() => onSeleccionar(cliente)}
              onContextMenu={(e) => handleBorrar(e, cliente)}
              className="neon-btn flex h-9 w-[118px] items-center justify-center rounded-lg text-xs text-[var(--pos-text)]"
              title={cliente.nombre}
            >
              <span
                className={`absolute left-1.5 h-2 w-2 rounded-full ${
                  cliente.sesion_pool_activa ? 'pos-blink neon-dot-red bg-[var(--pos-red)]' : 'neon-dot-green bg-[var(--pos-green)]'
                }`}
              />
              {formatearNombre(cliente.nombre)}
            </button>
            <button
              onClick={(e) => handleBorrar(e, cliente)}
              title={`Borrar a ${cliente.nombre}`}
              className="neon-x absolute -right-1.5 -top-1.5 flex h-4 w-4 scale-75 items-center justify-center rounded-full border border-[var(--pos-pink)] bg-black/80 text-[10px] font-bold leading-none text-[var(--pos-pink)] opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ) : (
          <div
            key={`vacio-${i}`}
            className="h-9 w-[118px] rounded border border-dashed border-[var(--pos-border)] opacity-30"
          />
        ),
      )}
    </div>
  )
}
