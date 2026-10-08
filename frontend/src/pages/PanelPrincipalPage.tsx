import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnulacionFacturasModal from '../components/AnulacionFacturasModal'
import BalanceModal from '../components/BalanceModal'
import CierreCajaModal from '../components/CierreCajaModal'
import ClienteGrid from '../components/ClienteGrid'
import ClienteWindow from '../components/ClienteWindow'
import ControlStockModal from '../components/ControlStockModal'
import DatosNegocioModal from '../components/DatosNegocioModal'
import FacturacionScanner from '../components/FacturacionScanner'
import GestionProductosModal from '../components/GestionProductosModal'
import IngresoMercaderiaModal from '../components/IngresoMercaderiaModal'
import KardexModal from '../components/KardexModal'
import ListadoRubroModal from '../components/ListadoRubroModal'
import SesionesPoolModal from '../components/SesionesPoolModal'
import { useAuthStore } from '../store/authStore'
import { useNegocioStore } from '../store/negocioStore'
import { useVentaStore } from '../store/ventaStore'
import type { FilaCarrito, MedioPago } from '../store/ventaStore'
import { crearCliente } from '../api/clientes'
import type { Cliente } from '../api/clientes'
import type { FuncionalidadKey } from '../store/authStore'

const FUNCIONALIDADES: { key: FuncionalidadKey; label: string }[] = [
  { key: 'ingreso-mercaderia', label: 'Ingr. de Mercaderia' },
  { key: 'gestion-productos', label: 'Carga de Nuevo Producto' },
  { key: 'movimientos-stock', label: 'Movimientos de Stock' },
  { key: 'listado-facturas', label: 'Listado de Facturas' },
  { key: 'control-stock', label: 'Controlar Stock' },
  { key: 'cierre-caja', label: 'Cierre de Caja' },
]

const MEDIOS_PAGO: MedioPago[] = ['Efectivo', 'Transferencia', 'Cuenta', 'Multipago']

export default function PanelPrincipalPage() {
  const navigate = useNavigate()
  const { usuario, logout, puedeUsar } = useAuthStore()
  const venta = useVentaStore()
  const { negocio, nombreRubro } = useNegocioStore()
  const [refrescarGrid, setRefrescarGrid] = useState(0)
  const [mostrarScanner, setMostrarScanner] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [mostrarCierreCaja, setMostrarCierreCaja] = useState(false)
  const [mostrarIngreso, setMostrarIngreso] = useState(false)
  const [mostrarCatalogo, setMostrarCatalogo] = useState(false)
  const [mostrarKardex, setMostrarKardex] = useState(false)
  const [mostrarFacturas, setMostrarFacturas] = useState(false)
  const [mostrarControlStock, setMostrarControlStock] = useState(false)
  const [mostrarBalance, setMostrarBalance] = useState(false)
  const [rubroListado, setRubroListado] = useState<string | null>(null)
  const [mostrarSesiones, setMostrarSesiones] = useState(false)
  const [mostrarFuncionalidades, setMostrarFuncionalidades] = useState(false)
  const [mostrarDatosNegocio, setMostrarDatosNegocio] = useState(false)

  useEffect(() => {
    venta.cargarRangos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (mostrarScanner) return
      if (e.key === 'F5') {
        e.preventDefault()
        if (venta.estado !== 'idle') {
          alert("Debe presionar 'Reset' para volver a facturar.")
          return
        }
        setMostrarScanner(true)
      } else if (e.key === 'F1') {
        e.preventDefault()
        setRubroListado('golosinas')
      } else if (e.key === 'F2') {
        e.preventDefault()
        setRubroListado('bebidas')
      } else if (e.key === 'F3') {
        e.preventDefault()
        setRubroListado('cigarros')
      } else if (e.key === 'F4') {
        e.preventDefault()
        setRubroListado('mesa_pool')
      } else if (e.key === 'F10') {
        e.preventDefault()
        setMostrarSesiones(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venta.estado, mostrarScanner])

  async function handleAgregarCliente() {
    const nombre = window.prompt('Nombre y apellido del nuevo cliente:')
    if (!nombre || !nombre.trim()) return
    try {
      await crearCliente(nombre.trim())
      setRefrescarGrid((n) => n + 1)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo crear el cliente')
    }
  }

  function handleSeleccionarCliente(cliente: Cliente) {
    if (venta.estado !== 'idle') {
      alert("Debe presionar 'Reset' antes de abrir otro cliente.")
      return
    }
    setClienteSeleccionado(cliente)
  }

  function handleFacturarDesdeCliente(params: { items: FilaCarrito[]; medioPago: MedioPago; sesionPoolId: number | null }) {
    venta.setCliente(clienteSeleccionado!.nombre)
    venta.setMedioPago(params.medioPago)
    venta.setSesionPoolId(params.sesionPoolId)
    venta.setItemsDesdeEscaner(params.items)
    setClienteSeleccionado(null)
    setMostrarScanner(true)
    setRefrescarGrid((n) => n + 1)
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function handleTotal() {
    if (venta.medioPago === 'Multipago') {
      const texto = window.prompt('Monto abonado en efectivo:')
      const efectivo = Number(texto)
      if (!texto || !Number.isFinite(efectivo)) return
      venta.calcularTotal(efectivo)
    } else {
      venta.calcularTotal()
    }
  }

  function handleRecibo() {
    venta.mostrarRecibo(usuario!.usuario)
  }

  async function handleImprimir() {
    const ok = window.confirm(`Se va a facturar un total de $${venta.subtotales.subtotal.toLocaleString('es-AR')}. ¿Confirmar impresion?`)
    if (!ok) return
    try {
      await venta.imprimir(usuario!.usuario)
      new Audio('/sonidos/cajaregistradora.wav').play().catch(() => {})
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo confirmar la factura')
    }
  }

  function handleReset() {
    venta.reset()
  }

  const money = (n: number) => `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

  const accionesFuncionalidad: Partial<Record<FuncionalidadKey, () => void>> = {
    'cierre-caja': () => setMostrarCierreCaja(true),
    'ingreso-mercaderia': () => setMostrarIngreso(true),
    'gestion-productos': () => setMostrarCatalogo(true),
    'movimientos-stock': () => setMostrarKardex(true),
    'listado-facturas': () => setMostrarFacturas(true),
    'control-stock': () => setMostrarControlStock(true),
  }

  return (
    <div className="h-screen p-3 text-[var(--pos-text)]">
      <header className="neon-panel relative mb-3 flex items-center justify-between overflow-hidden rounded-xl px-4 py-2.5">
        <div className="neon-starfield" />
        <button onClick={handleAgregarCliente} className="neon-bounce rounded px-2 py-1 text-lg transition hover:bg-white/5" title="Agregar cliente">
          👤➕
        </button>
        <h1 className="flex flex-col items-center text-2xl leading-tight font-extrabold tracking-wide">
          <span className="neon-title">{negocio.nombre}</span>
          {negocio.subtitulo && <span className="text-[10px] font-medium tracking-[0.3em] text-[var(--pos-text-dim)] uppercase">{negocio.subtitulo}</span>}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--pos-text-dim)]">{usuario?.usuario}</span>
          <button disabled={usuario?.rol !== 'master'} className="text-lg transition hover:drop-shadow-[0_0_6px_var(--pos-cyan)] disabled:opacity-25" title="Cambiar contrasena (solo Master)">
            🔑
          </button>
          <button
            disabled={usuario?.rol !== 'master'}
            onClick={() => setMostrarBalance(true)}
            className="text-lg transition hover:drop-shadow-[0_0_6px_var(--pos-cyan)] disabled:opacity-25"
            title="Balance (solo Master)"
          >
            📊
          </button>
          <button
            disabled={usuario?.rol !== 'master'}
            onClick={() => setMostrarDatosNegocio(true)}
            className="text-lg transition hover:drop-shadow-[0_0_6px_var(--pos-cyan)] disabled:opacity-25"
            title="Datos del negocio (solo Master)"
          >
            ⚙️
          </button>
          <button onClick={handleLogout} className="text-sm text-[var(--pos-text-dim)] transition hover:text-[var(--pos-red)]">
            Salir
          </button>
        </div>
        <div className="neon-header-border" />
      </header>

      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="neon-panel rounded-xl p-3">
          <div className="brand-plate mb-3 rounded-lg">
            <span className="brand-plate-name">{negocio.nombre}</span>
            {negocio.subtitulo && <span className="brand-plate-sub">{negocio.subtitulo}</span>}
          </div>
          <div className="mb-3 text-sm">
            <p className="text-[var(--pos-text-dim)]">
              Usuario actual: <span className="text-[var(--pos-text)]">{usuario?.usuario}</span>
            </p>
            <label className="mt-2 block text-[var(--pos-text-dim)]">Apellido y Nombre</label>
            <input
              value={venta.cliente === 'Usuario Final' ? '' : venta.cliente}
              onChange={(e) => venta.setCliente(e.target.value || 'Usuario Final')}
              placeholder="Usuario Final"
              className="mt-1 w-full rounded border border-[var(--pos-border)] bg-black px-2 py-1 text-[var(--pos-text)] placeholder:text-[var(--pos-text-dim)]"
            />
            <p className="mt-3 mb-1 text-[var(--pos-text-dim)]">Medio de Pago</p>
            <div className="flex flex-wrap gap-3">
              {MEDIOS_PAGO.map((opcion) => (
                <label key={opcion} className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="medio-pago"
                    checked={venta.medioPago === opcion}
                    onChange={() => venta.setMedioPago(opcion)}
                    disabled={venta.estado !== 'idle'}
                  />
                  {opcion}
                </label>
              ))}
            </div>
            {venta.items.length > 0 && (
              <p className="mt-2 text-xs text-[var(--pos-green)]">{venta.items.length} producto(s) escaneado(s) — F9 en el scanner para confirmar</p>
            )}
          </div>
          <ClienteGrid key={refrescarGrid} onSeleccionar={handleSeleccionarCliente} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="neon-panel grid grid-cols-3 gap-2 rounded-xl p-3 text-sm">
            {[
              [nombreRubro('golosinas'), venta.subtotales.golosinas],
              [nombreRubro('bebidas'), venta.subtotales.bebidas],
              [nombreRubro('cigarros'), venta.subtotales.cigarros],
              ['Subtotal', venta.subtotales.subtotal],
              ['Impuestos', 0],
              ['Total', venta.subtotales.subtotal],
            ].map(([label, valor]) => (
              <div key={label as string}>
                <span className="text-[var(--pos-text-dim)]">{label}</span>
                <input readOnly value={money(valor as number)} className="mt-1 w-full rounded border border-[var(--pos-border)] bg-black px-2 py-1" />
              </div>
            ))}
          </div>

          {venta.textoRecibo ? (
            <div className="flex h-[560px] flex-col items-center gap-2">
              <div key={venta.textoRecibo} className="paper-ticket flex min-h-0 w-80 flex-1 flex-col overflow-hidden">
                <p className="shrink-0 pt-4 pb-2 text-center text-[10px] tracking-[0.3em] text-black/35">✂ · · · · · · · · · · · · · · · ·</p>
                <pre id="recibo-imprimible" className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap px-4 pb-3 font-mono text-[13px] leading-relaxed">
                  {venta.textoRecibo}
                </pre>
              </div>
              {venta.estado === 'impreso' && (
                <button
                  onClick={() => window.print()}
                  className="neon-btn-primary rounded-full px-4 py-1.5 text-xs font-semibold text-white"
                >
                  🖨️ Imprimir
                </button>
              )}
            </div>
          ) : (
            <div className="neon-panel flex h-40 items-center justify-center rounded-xl p-3 text-sm text-[var(--pos-text-dim)]">
              El recibo se muestra aca despues de presionar Recibo...
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={handleTotal}
              disabled={venta.items.length === 0 || venta.estado !== 'idle'}
              className="neon-btn-primary rounded-lg py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
            >
              Total
            </button>
            <button
              onClick={handleRecibo}
              disabled={venta.estado !== 'totalizado'}
              className="neon-btn-primary rounded-lg py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
            >
              Recibo
            </button>
            <button
              onClick={handleImprimir}
              disabled={venta.estado !== 'recibo_mostrado' || venta.enviando}
              className="neon-btn-primary rounded-lg py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
            >
              {venta.enviando ? 'Enviando...' : 'Imprimir'}
            </button>
            <button
              onClick={handleReset}
              disabled={venta.estado === 'idle' && venta.items.length === 0}
              className="neon-btn-primary rounded-lg py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
            >
              Reset
            </button>
          </div>

          <button
            onClick={() => setMostrarFuncionalidades((v) => !v)}
            className="neon-btn flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium tracking-wide text-[var(--pos-text-dim)]"
          >
            <span className={`inline-block transition-transform duration-300 ${mostrarFuncionalidades ? 'rotate-180' : ''}`}>▲</span>
            {mostrarFuncionalidades ? 'Ocultar opciones' : 'Mas opciones'}
          </button>

          <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${mostrarFuncionalidades ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2 pt-2">
                {FUNCIONALIDADES.map(({ key, label }) => (
                  <button
                    key={key}
                    disabled={!puedeUsar(key)}
                    onClick={accionesFuncionalidad[key]}
                    className="neon-btn rounded-lg py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {mostrarScanner && (
        <FacturacionScanner
          itemsIniciales={venta.items}
          onConfirmar={(items) => {
            venta.setItemsDesdeEscaner(items)
            setMostrarScanner(false)
          }}
          onCancelar={() => setMostrarScanner(false)}
        />
      )}

      {clienteSeleccionado && (
        <ClienteWindow
          cliente={clienteSeleccionado}
          onCerrar={() => {
            setClienteSeleccionado(null)
            setRefrescarGrid((n) => n + 1)
          }}
          onFacturar={handleFacturarDesdeCliente}
        />
      )}

      {mostrarCierreCaja && (
        <CierreCajaModal
          onCancelar={() => setMostrarCierreCaja(false)}
          onCerrado={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
        />
      )}

      {mostrarIngreso && <IngresoMercaderiaModal onCerrar={() => setMostrarIngreso(false)} />}
      {mostrarCatalogo && <GestionProductosModal onCerrar={() => setMostrarCatalogo(false)} />}
      {mostrarKardex && <KardexModal onCerrar={() => setMostrarKardex(false)} />}
      {mostrarFacturas && <AnulacionFacturasModal onCerrar={() => setMostrarFacturas(false)} />}
      {mostrarControlStock && <ControlStockModal onCerrar={() => setMostrarControlStock(false)} />}
      {mostrarBalance && <BalanceModal onCerrar={() => setMostrarBalance(false)} />}
      {rubroListado && <ListadoRubroModal rubro={rubroListado} onCerrar={() => setRubroListado(null)} />}
      {mostrarDatosNegocio && <DatosNegocioModal onCerrar={() => setMostrarDatosNegocio(false)} />}
      {mostrarSesiones && <SesionesPoolModal onCerrar={() => setMostrarSesiones(false)} />}
    </div>
  )
}
