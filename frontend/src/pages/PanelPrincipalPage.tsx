import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnulacionFacturasModal from '../components/AnulacionFacturasModal'
import BalanceModal from '../components/BalanceModal'
import CierreCajaModal from '../components/CierreCajaModal'
import ClienteWindow from '../components/ClienteWindow'
import ControlStockModal from '../components/ControlStockModal'
import CuentasAbiertas from '../components/CuentasAbiertas'
import DatosNegocioModal from '../components/DatosNegocioModal'
import FacturacionScanner from '../components/FacturacionScanner'
import GestionRubrosModal from '../components/GestionRubrosModal'
import GestionProductosModal from '../components/GestionProductosModal'
import Icon from '../components/Icon'
import type { IconName } from '../components/Icon'
import IngresoMercaderiaModal from '../components/IngresoMercaderiaModal'
import KardexModal from '../components/KardexModal'
import ListadoRubroModal from '../components/ListadoRubroModal'
import NombreSistemaModal from '../components/NombreSistemaModal'
import SelectorTema from '../components/SelectorTema'
import SesionesPoolModal from '../components/SesionesPoolModal'
import { useAuthStore } from '../store/authStore'
import { inicialDelNombre, TECLAS_RUBRO, useNegocioStore } from '../store/negocioStore'
import { useVentaStore } from '../store/ventaStore'
import type { EstadoVenta, FilaCarrito, MedioPago } from '../store/ventaStore'
import type { Cliente } from '../api/clientes'
import type { FuncionalidadKey } from '../store/authStore'

const FUNCIONALIDADES: { key: FuncionalidadKey; label: string; icon: IconName }[] = [
  { key: 'ingreso-mercaderia', label: 'Ingreso de mercadería', icon: 'truck' },
  { key: 'gestion-productos', label: 'Productos', icon: 'tag' },
  { key: 'movimientos-stock', label: 'Movimientos de stock', icon: 'arrows' },
  { key: 'listado-facturas', label: 'Facturas', icon: 'receipt' },
  { key: 'control-stock', label: 'Control de stock', icon: 'clipboard' },
  { key: 'cierre-caja', label: 'Cierre de caja', icon: 'lock' },
]

const MEDIOS_PAGO: MedioPago[] = ['Efectivo', 'Transferencia', 'Cuenta', 'Multipago']


const ESTADO_VENTA: Record<EstadoVenta, { texto: string; clase: string }> = {
  idle: { texto: 'En carga', clase: 'bg-[var(--pos-panel-2)] text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)]' },
  totalizado: { texto: 'Totalizada', clase: 'bg-[var(--pos-primary-soft)] text-[var(--pos-primary)]' },
  recibo_mostrado: { texto: 'Recibo listo', clase: 'bg-[var(--pos-primary-soft)] text-[var(--pos-primary)]' },
  impreso: { texto: 'Facturada', clase: 'bg-[var(--pos-green-soft)] text-[var(--pos-green)]' },
}

export default function PanelPrincipalPage() {
  const navigate = useNavigate()
  const { usuario, logout, puedeUsar } = useAuthStore()
  const venta = useVentaStore()
  const { negocio, rubros, cargarRubros } = useNegocioStore()
  const rubrosVisibles = rubros.filter((r) => r.activo)
  const [refrescarCuentas, setRefrescarCuentas] = useState(0)
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
  const [mostrarDatosNegocio, setMostrarDatosNegocio] = useState(false)
  const [mostrarNombre, setMostrarNombre] = useState(false)
  const [mostrarRubros, setMostrarRubros] = useState(false)

  useEffect(() => {
    cargarRubros().catch(() => {})
  }, [cargarRubros])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (mostrarScanner) return
      if (e.key === 'F5') {
        e.preventDefault()
        abrirScanner()
      } else if ((TECLAS_RUBRO as readonly string[]).includes(e.key)) {
        // F1-F4, F6-F8: listado de precios del rubro visible en esa posicion
        const rubro = rubrosVisibles[TECLAS_RUBRO.indexOf(e.key as (typeof TECLAS_RUBRO)[number])]
        if (!rubro) return
        e.preventDefault()
        setRubroListado(rubro.clave)
      } else if (e.key === 'F10') {
        e.preventDefault()
        setMostrarSesiones(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venta.estado, mostrarScanner, rubrosVisibles])

  function abrirScanner() {
    if (venta.estado !== 'idle') {
      alert("Debe presionar 'Reset' para volver a facturar.")
      return
    }
    setMostrarScanner(true)
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
    setRefrescarCuentas((n) => n + 1)
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

  const esMaster = usuario?.rol === 'master'
  // Con muchos rubros, el detalle muestra solo los que tienen importe para que
  // la pantalla siga entrando sin scroll.
  const rubrosDetalle =
    rubrosVisibles.length <= 4 ? rubrosVisibles : rubrosVisibles.filter((r) => (venta.subtotales.porRubro[r.clave] ?? 0) > 0)
  const unidades = venta.items.reduce((acc, i) => acc + i.cantidad, 0)
  // Mientras no se totaliza, el total se muestra en vivo con los productos cargados
  const totalVisible =
    venta.estado === 'idle' ? venta.items.reduce((acc, i) => acc + i.cantidad * i.precio, 0) : venta.subtotales.subtotal
  const estado = ESTADO_VENTA[venta.estado]

  const pasos = [
    { n: 1, label: 'Total', onClick: handleTotal, habilitado: venta.items.length > 0 && venta.estado === 'idle' },
    { n: 2, label: 'Recibo', onClick: handleRecibo, habilitado: venta.estado === 'totalizado' },
    {
      n: 3,
      label: venta.enviando ? 'Enviando...' : 'Facturar',
      onClick: handleImprimir,
      habilitado: venta.estado === 'recibo_mostrado' && !venta.enviando,
    },
  ]

  return (
    <div className="flex h-screen flex-col text-[var(--pos-text)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--pos-border)] bg-[var(--pos-panel)] px-4 py-1.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="brand-mark !hidden !h-8 !w-8 !rounded-lg !text-sm sm:!inline-flex">{inicialDelNombre(negocio.nombre)}</span>
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2.5">
            <h1 className="line-clamp-2 text-[length:min(calc(var(--pos-brand-size)*0.8),5.5vw)] leading-tight font-bold break-words sm:truncate">
              {negocio.nombre}
            </h1>
            {negocio.subtitulo && <p className="truncate text-xs text-[var(--pos-text-dim)]">{negocio.subtitulo}</p>}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <span className="mr-2 hidden items-center gap-2 rounded-full bg-[var(--pos-panel-2)] py-0.5 pr-3 pl-0.5 text-sm ring-1 ring-[var(--pos-border)] md:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pos-primary-soft)] text-[0.6875rem] font-bold text-[var(--pos-primary)]">
              {usuario?.usuario.charAt(0).toUpperCase()}
            </span>
            <span className="font-medium">{usuario?.usuario}</span>
            <span className="text-xs text-[var(--pos-text-dim)]">{esMaster ? 'Administrador' : 'Caja'}</span>
          </span>
          <button onClick={() => setMostrarNombre(true)} className="btn-icon" title="Nombre del sistema (pide contraseña de Master)">
            <Icon name="lock" />
          </button>
          <SelectorTema />
          <button disabled={!esMaster} className="btn-icon !hidden sm:!inline-flex" title="Cambiar contraseña (solo Master)">
            <Icon name="key" />
          </button>
          <button disabled={!esMaster} onClick={() => setMostrarBalance(true)} className="btn-icon" title="Balance (solo Master)">
            <Icon name="chart" />
          </button>
          <button disabled={!esMaster} onClick={() => setMostrarDatosNegocio(true)} className="btn-icon" title="Datos del negocio (solo Master)">
            <Icon name="settings" />
          </button>
          <span className="mx-1 h-6 w-px bg-[var(--pos-border)]" />
          <button onClick={handleLogout} className="btn-icon hover:!bg-[var(--pos-red-soft)] hover:!text-[var(--pos-red)]" title="Salir">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,23rem)] lg:content-stretch lg:overflow-hidden">
        <div className="flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          {/* ---------- Venta actual ---------- */}
          <section className="panel rounded-2xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold">Venta actual</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>{estado.texto}</span>
              </div>
              <button
                onClick={abrirScanner}
                disabled={venta.estado !== 'idle'}
                className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              >
                <Icon name="scan" />
                {venta.items.length > 0 ? 'Editar productos' : 'Nueva venta'}
                <kbd className="rounded bg-white/20 px-1.5 py-px font-mono text-[0.6875rem]">F5</kbd>
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="section-label mb-1 block" htmlFor="cliente-venta">
                    Cliente
                  </label>
                  <input
                    id="cliente-venta"
                    value={venta.cliente === 'Usuario Final' ? '' : venta.cliente}
                    onChange={(e) => venta.setCliente(e.target.value || 'Usuario Final')}
                    placeholder="Consumidor final"
                    className="w-full rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <p className="section-label mb-1">Medio de pago</p>
                  <div className="segmented segmented-compacto" role="group" aria-label="Medio de pago">
                    {MEDIOS_PAGO.map((opcion) => (
                      <button
                        key={opcion}
                        type="button"
                        aria-pressed={venta.medioPago === opcion}
                        onClick={() => venta.setMedioPago(opcion)}
                        disabled={venta.estado !== 'idle'}
                      >
                        {opcion}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="section-label mb-1">Detalle por rubro</p>
                  {rubrosDetalle.length === 0 ? (
                    <p className="rounded-lg bg-[var(--pos-panel-2)] px-3 py-2 text-xs text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)]">
                      Se completa al totalizar la venta.
                    </p>
                  ) : (
                    <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {rubrosDetalle.map((rubro) => (
                        <div
                          key={rubro.clave}
                          className="flex items-baseline justify-between gap-2 rounded-lg bg-[var(--pos-panel-2)] px-3 py-1.5 ring-1 ring-[var(--pos-border)]"
                        >
                          <dt className="truncate text-xs text-[var(--pos-text-dim)]" title={rubro.nombre}>
                            {rubro.emoji} {rubro.nombre}
                          </dt>
                          <dd className="shrink-0 text-sm font-semibold tabular-nums">{money(venta.subtotales.porRubro[rubro.clave] ?? 0)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="pos-venta-total flex flex-col gap-1 px-4 py-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="section-label !text-[var(--pos-total-text)]">Total</span>
                    <span className="text-xs text-[var(--pos-total-dim)]">
                      {venta.items.length === 0 ? 'Sin productos' : `${venta.items.length} ítems · ${unidades} u.`}
                    </span>
                  </div>
                  <div className="pos-venta-total-num">{money(totalVisible)}</div>
                  {venta.medioPago === 'Multipago' && venta.estado !== 'idle' && (
                    <p className="text-right text-xs text-[var(--pos-total-dim)]">
                      Efectivo {money(venta.multipagoEfectivo)} · Transf. {money(venta.multipagoTransferencia)}
                    </p>
                  )}
                </div>

                <ol className="grid grid-cols-3 gap-1.5">
                  {pasos.map((paso) => (
                    <li key={paso.n}>
                      <button
                        onClick={paso.onClick}
                        disabled={!paso.habilitado}
                        className={`flex w-full flex-col items-center rounded-xl py-1.5 text-sm font-semibold leading-tight disabled:cursor-not-allowed ${
                          paso.habilitado ? 'btn-primary' : 'border border-dashed border-[var(--pos-border-strong)] text-[var(--pos-text-faint)]'
                        }`}
                      >
                        <span className="text-[0.625rem] font-medium opacity-75">Paso {paso.n}</span>
                        {paso.label}
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={handleReset}
                  disabled={venta.estado === 'idle' && venta.items.length === 0}
                  className="btn flex items-center justify-center gap-2 rounded-xl py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="rotate" size={16} />
                  {venta.estado === 'impreso' ? 'Siguiente venta' : 'Reiniciar venta'}
                </button>
              </div>
            </div>

            {venta.textoRecibo && (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-[var(--pos-panel-2)] p-4 ring-1 ring-[var(--pos-border)]">
                <div key={venta.textoRecibo} className="paper-ticket w-full max-w-sm">
                  <pre id="recibo-imprimible" className="max-h-[420px] overflow-y-auto whitespace-pre-wrap px-5 py-4 font-mono text-[0.78rem] leading-relaxed">
                    {venta.textoRecibo}
                  </pre>
                </div>
                {venta.estado === 'impreso' && (
                  <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
                    <Icon name="printer" size={16} /> Imprimir ticket
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ---------- Accesos: precios y gestion ---------- */}
          <section className="panel flex flex-col gap-3 rounded-2xl p-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h2 className="section-label">Consultar precios</h2>
                {esMaster && (
                  <button
                    onClick={() => setMostrarRubros(true)}
                    className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold text-[var(--pos-primary)] hover:bg-[var(--pos-primary-soft)]"
                    title="Agregar, renombrar u ordenar rubros (pide contraseña de Master)"
                  >
                    <Icon name="settings" size={13} /> Editar rubros
                  </button>
                )}
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-1.5">
                {rubrosVisibles.map((rubro, i) => (
                  <button
                    key={rubro.clave}
                    onClick={() => setRubroListado(rubro.clave)}
                    title={rubro.nombre}
                    className="btn flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-sm font-medium"
                  >
                    <span className="truncate">
                      {rubro.emoji} {rubro.nombre}
                    </span>
                    {TECLAS_RUBRO[i] && (
                      <kbd className="rounded bg-[var(--pos-panel-2)] px-1.5 font-mono text-[0.6875rem] text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)]">
                        {TECLAS_RUBRO[i]}
                      </kbd>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setMostrarSesiones(true)}
                  className="btn flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-sm font-medium"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Icon name="clock" size={15} className="shrink-0" />
                    <span className="truncate">Tiempos</span>
                  </span>
                  <kbd className="rounded bg-[var(--pos-panel-2)] px-1.5 font-mono text-[0.6875rem] text-[var(--pos-text-dim)] ring-1 ring-[var(--pos-border)]">
                    F10
                  </kbd>
                </button>
              </div>
            </div>

            <div>
              <h2 className="section-label mb-1.5">Gestión</h2>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {FUNCIONALIDADES.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    disabled={!puedeUsar(key)}
                    onClick={accionesFuncionalidad[key]}
                    title={puedeUsar(key) ? label : `${label} (solo Master)`}
                    className="btn flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--pos-primary-soft)] text-[var(--pos-primary)]">
                      <Icon name={icon} size={16} />
                    </span>
                    <span className="min-w-0 truncate leading-tight">{label}</span>
                    {!puedeUsar(key) && <Icon name="lock" size={14} className="ml-auto shrink-0 text-[var(--pos-text-dim)]" />}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <CuentasAbiertas key={refrescarCuentas} onSeleccionar={handleSeleccionarCliente} />
      </main>

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
            setRefrescarCuentas((n) => n + 1)
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
      {mostrarNombre && <NombreSistemaModal onCerrar={() => setMostrarNombre(false)} />}
      {mostrarRubros && <GestionRubrosModal onCerrar={() => setMostrarRubros(false)} />}
    </div>
  )
}
