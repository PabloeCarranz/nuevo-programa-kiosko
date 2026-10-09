import { useState } from 'react'
import { buscarProducto } from '../api/productos'
import {
  anularAjuste,
  guardarInventario,
  listarAjustesRecientes,
  obtenerDiferenciasInventario,
  registrarAjuste,
} from '../api/controlStock'
import type { Ajuste, DiferenciaInventario } from '../api/controlStock'

type Modo = 'menu' | 'inventario' | 'ajustes'

const hoy = () => new Date().toISOString().slice(0, 10)

export default function ControlStockModal({ onCerrar }: { onCerrar: () => void }) {
  const [modo, setModo] = useState<Modo>('menu')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pos-overlay">
      <div className="max-h-[85vh] w-[640px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-primary)]">Controlar Stock</h2>
          <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]">✕</button>
        </div>

        {modo === 'menu' && (
          <div className="flex gap-3">
            <button onClick={() => setModo('inventario')} className="flex-1 rounded border border-[var(--pos-border)] py-6 hover:border-[var(--pos-primary)]">
              📋 Inventario
            </button>
            <button onClick={() => setModo('ajustes')} className="flex-1 rounded border border-[var(--pos-border)] py-6 hover:border-[var(--pos-primary)]">
              ⚖️ Ajustes de Stock
            </button>
          </div>
        )}

        {modo === 'inventario' && <InventarioPanel onVolver={() => setModo('menu')} />}
        {modo === 'ajustes' && <AjustesPanel onVolver={() => setModo('menu')} />}
      </div>
    </div>
  )
}

function InventarioPanel({ onVolver }: { onVolver: () => void }) {
  const [fecha, setFecha] = useState(hoy())
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [items, setItems] = useState<{ codigo: number; nombre: string; cantidad: number }[]>([])
  const [diferencias, setDiferencias] = useState<DiferenciaInventario[] | null>(null)

  async function handleCodigo(valor: string) {
    const limpio = valor.replace(/\D/g, '').slice(0, 5)
    setCodigo(limpio)
    if (limpio.length === 5) {
      try {
        setNombre((await buscarProducto(limpio)).nombre)
      } catch {
        setNombre(null)
      }
    } else setNombre(null)
  }

  function agregar() {
    const cant = Number(cantidad)
    if (!nombre || !Number.isFinite(cant)) return
    setItems((prev) => [...prev, { codigo: Number(codigo), nombre, cantidad: cant }])
    setCodigo('')
    setNombre(null)
    setCantidad('')
  }

  function deshacer() {
    setItems((prev) => prev.slice(0, -1))
  }

  async function guardar() {
    await guardarInventario(fecha, items)
    alert('Inventario guardado')
    setItems([])
  }

  async function verDiferencias() {
    setDiferencias(await obtenerDiferenciasInventario(fecha))
  }

  const money = (n: number) => `$ ${n.toLocaleString('es-AR')}`

  return (
    <div>
      <button onClick={onVolver} className="mb-3 text-sm text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]">← Volver</button>
      <div className="mb-2">
        <label className="block text-sm text-[var(--pos-text-dim)]">Fecha del conteo</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1 text-sm" />
      </div>
      <div className="mb-2 flex gap-2 text-sm">
        <input placeholder="Codigo" value={codigo} onChange={(e) => handleCodigo(e.target.value)} className="w-28 rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
        <span className="flex items-center text-[var(--pos-text-dim)]">{nombre ?? ''}</span>
        <input placeholder="Cant. fisica" value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/[^0-9.]/g, ''))} className="w-24 rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
        <button onClick={agregar} disabled={!nombre} className="rounded bg-[var(--pos-primary-soft)] px-3 disabled:opacity-30">Agregar</button>
        <button onClick={deshacer} className="rounded border border-[var(--pos-border)] px-3">Deshacer</button>
      </div>
      <table className="mb-3 w-full text-xs">
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx}><td>{i.codigo}</td><td>{i.nombre}</td><td className="text-right">{i.cantidad}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <button onClick={guardar} disabled={items.length === 0} className="rounded bg-[var(--pos-primary)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-30">
          Guardar Inventario
        </button>
        <button onClick={verDiferencias} className="rounded border border-[var(--pos-border)] px-3 py-1.5 text-sm">
          Listar Diferencias
        </button>
      </div>

      {diferencias && (
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--pos-text-dim)]"><th>Producto</th><th>Fisico</th><th>Sistema</th><th>Dif.</th><th>Valorizado</th></tr>
          </thead>
          <tbody>
            {diferencias.map((d) => (
              <tr key={d.codigo} className={d.diferencia !== 0 ? 'text-[var(--pos-red)]' : ''}>
                <td>{d.nombre}</td><td>{d.fisico}</td><td>{d.sistema}</td><td>{d.diferencia}</td><td>{money(d.valorizado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function AjustesPanel({ onVolver }: { onVolver: () => void }) {
  const [tipo, setTipo] = useState<'MAS' | 'MENOS'>('MAS')
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [comentario, setComentario] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [recientes, setRecientes] = useState<Ajuste[]>([])
  const [mostrarRecientes, setMostrarRecientes] = useState(false)

  async function handleCodigo(valor: string) {
    const limpio = valor.replace(/\D/g, '').slice(0, 5)
    setCodigo(limpio)
    if (limpio.length === 5) {
      try {
        setNombre((await buscarProducto(limpio)).nombre)
      } catch {
        setNombre(null)
      }
    } else setNombre(null)
  }

  async function registrar() {
    const cant = parseInt(cantidad, 10)
    if (!nombre || !Number.isFinite(cant) || cant <= 0) return
    if (fecha < hoy()) {
      alert('La fecha no puede ser anterior a hoy')
      return
    }
    try {
      const r = await registrarAjuste(tipo, Number(codigo), cant, comentario, fecha)
      alert(`Ajuste registrado: ${r.detalle}`)
      setCodigo('')
      setNombre(null)
      setCantidad('')
      setComentario('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo registrar el ajuste')
    }
  }

  function cargarRecientes() {
    listarAjustesRecientes().then(setRecientes)
  }

  async function anular(detalle: string) {
    if (!confirm(`¿Anular el ajuste ${detalle}?`)) return
    await anularAjuste(detalle)
    cargarRecientes()
  }

  return (
    <div>
      <button onClick={onVolver} className="mb-3 text-sm text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]">← Volver</button>
      <div className="mb-2 flex gap-2 text-sm">
        <button onClick={() => setTipo('MAS')} className={`rounded px-3 py-1 ${tipo === 'MAS' ? 'bg-[var(--pos-green)] text-white' : 'border border-[var(--pos-border)]'}`}>Ajuste ++</button>
        <button onClick={() => setTipo('MENOS')} className={`rounded px-3 py-1 ${tipo === 'MENOS' ? 'bg-[var(--pos-red)] text-white' : 'border border-[var(--pos-border)]'}`}>Ajuste --</button>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
        <input placeholder="Codigo" value={codigo} onChange={(e) => handleCodigo(e.target.value)} className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
      </div>
      <p className="mb-2 text-sm text-[var(--pos-text-dim)]">{nombre ?? (codigo.length === 5 ? 'Codigo no encontrado' : ' ')}</p>
      <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
        <input placeholder="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ''))} className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
        <input placeholder="Comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => {
            setMostrarRecientes((v) => !v)
            if (!mostrarRecientes) cargarRecientes()
          }}
          className="rounded border border-[var(--pos-border)] px-3 py-1.5 text-sm"
        >
          {mostrarRecientes ? 'Ocultar' : 'Ver'} ajustes recientes
        </button>
        <button onClick={registrar} disabled={!nombre || !cantidad} className="rounded bg-[var(--pos-primary)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-30">
          Registrar Ajuste
        </button>
      </div>

      {mostrarRecientes && (
        <table className="mt-3 w-full text-xs">
          <thead><tr className="text-left text-[var(--pos-text-dim)]"><th>Detalle</th><th>Producto</th><th>Cant.</th><th></th></tr></thead>
          <tbody>
            {recientes.map((a) => (
              <tr key={a.ID} className="border-t border-[var(--pos-border)]/40">
                <td>{a.detalle}</td>
                <td>{a.NOMBRE_PRODUCTO}</td>
                <td className={a.TIPO_AJUSTE === 'MAS' ? 'text-[var(--pos-green)]' : 'text-[var(--pos-red)]'}>
                  {a.TIPO_AJUSTE === 'MAS' ? '+' : '-'}{a.CANTIDAD}
                </td>
                <td><button onClick={() => anular(a.detalle)} className="text-[var(--pos-red)] hover:underline">Anular</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
