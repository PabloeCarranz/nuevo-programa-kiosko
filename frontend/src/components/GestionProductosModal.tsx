import { useEffect, useState } from 'react'
import { actualizarProducto, bajaProducto, crearProducto, listarCatalogo } from '../api/catalogo'
import type { Producto } from '../api/productos'
import { useNegocioStore } from '../store/negocioStore'

export default function GestionProductosModal({ onCerrar }: { onCerrar: () => void }) {
  const rubros = useNegocioStore((s) => s.rubros)
  const [rubro, setRubro] = useState<string>(() => rubros[0]?.clave ?? 'golosinas')
  const [productos, setProductos] = useState<Producto[]>([])
  const [editando, setEditando] = useState<Producto | null>(null)

  const [nombre, setNombre] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precio, setPrecio] = useState('')
  const [barras, setBarras] = useState('')

  function cargar() {
    listarCatalogo(rubro).then(setProductos)
  }

  useEffect(cargar, [rubro])

  function limpiarFormulario() {
    setEditando(null)
    setNombre('')
    setCantidad('')
    setPrecio('')
    setBarras('')
  }

  function seleccionarParaEditar(p: Producto) {
    setEditando(p)
    setNombre(p.nombre)
    setPrecio(String(p.precio))
    setBarras('')
  }

  async function handleGuardar() {
    const precioNum = Number(precio)
    if (!nombre.trim() || !Number.isFinite(precioNum)) return
    try {
      if (editando) {
        await actualizarProducto(rubro, editando.codigo, { nombre: nombre.trim(), precio: precioNum, barras_codigo: barras })
      } else {
        await crearProducto(rubro, { nombre: nombre.trim(), cantidad: Number(cantidad) || 0, precio: precioNum, barras_codigo: barras })
      }
      limpiarFormulario()
      cargar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar el producto')
    }
  }

  async function handleBaja(p: Producto) {
    if (!confirm(`¿Dar de baja "${p.nombre}"?`)) return
    await bajaProducto(rubro, p.codigo)
    cargar()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pos-overlay">
      <div className="max-h-[85vh] w-[640px] overflow-auto rounded-lg border border-[var(--pos-border)] bg-[var(--pos-panel)] p-4 text-[var(--pos-text)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--pos-primary)]">Gestion de Productos</h2>
          <button onClick={onCerrar} className="text-[var(--pos-text-dim)] hover:text-[var(--pos-text)]">✕</button>
        </div>

        <label className="mb-2 block text-sm text-[var(--pos-text-dim)]">Rubro</label>
        <select
          value={rubro}
          onChange={(e) => {
            setRubro(e.target.value)
            limpiarFormulario()
          }}
          className="mb-3 w-full rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1 text-sm"
        >
          {rubros.map((r) => (
            <option key={r.clave} value={r.clave}>
              {r.emoji} {r.nombre}
              {r.activo ? '' : ' (oculto)'}
            </option>
          ))}
        </select>

        <div className="mb-3 grid grid-cols-2 gap-2 rounded border border-[var(--pos-border)] p-2 text-sm">
          <input placeholder="Nombre (max 20)" value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 20))} className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
          <input
            placeholder="Cantidad inicial"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ''))}
            disabled={!!editando}
            className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1 disabled:opacity-40"
          />
          <input placeholder="Precio" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/[^0-9.]/g, ''))} className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
          <input placeholder="Codigo de barras" value={barras} onChange={(e) => setBarras(e.target.value.replace(/\D/g, ''))} className="rounded border border-[var(--pos-border)] bg-[var(--pos-input)] px-2 py-1" />
          <div className="col-span-2 flex justify-end gap-2">
            {editando && (
              <button onClick={limpiarFormulario} className="rounded border border-[var(--pos-border)] px-3 py-1">Cancelar edicion</button>
            )}
            <button onClick={handleGuardar} className="rounded bg-[var(--pos-primary)] px-4 py-1 font-semibold text-white">
              {editando ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--pos-text-dim)]">
              <th>Codigo</th><th>Nombre</th><th>Precio</th><th></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.codigo} className="border-t border-[var(--pos-border)]/40">
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.precio}</td>
                <td className="text-right">
                  <button onClick={() => seleccionarParaEditar(p)} className="mr-2 text-[var(--pos-primary)] hover:underline">Editar</button>
                  <button onClick={() => handleBaja(p)} className="text-[var(--pos-red)] hover:underline">Baja</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
