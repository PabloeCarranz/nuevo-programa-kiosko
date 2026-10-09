import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarUsuarios } from '../api/auth'
import Icon from '../components/Icon'
import EditorNombre from '../components/EditorNombre'
import SelectorTema from '../components/SelectorTema'
import { useAuthStore } from '../store/authStore'
import { inicialDelNombre, useNegocioStore } from '../store/negocioStore'

export default function LoginPage() {
  const negocio = useNegocioStore((s) => s.negocio)
  const configurado = useNegocioStore((s) => s.configurado)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const error = useAuthStore((s) => s.error)

  const [usuarios, setUsuarios] = useState<string[]>([])
  const [usuario, setUsuario] = useState('Caja1')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarUsuarios().then((lista) => {
      setUsuarios(lista)
      if (lista.length > 0 && !lista.includes(usuario)) setUsuario(lista[0])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      await login(usuario, password)
      navigate('/', { replace: true })
    } catch {
      // el error ya queda reflejado en el store
    } finally {
      setEnviando(false)
    }
  }

  // Instalacion nueva: antes del ingreso se le pone nombre al sistema
  if (!configurado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--pos-glow),transparent_60%)] p-4">
        <div className="absolute top-3 right-3">
          <SelectorTema />
        </div>
        <div className="panel w-full max-w-lg rounded-2xl p-6 shadow-xl">
          <EditorNombre
            titulo="¡Bienvenido! ¿Cómo se llama tu negocio?"
            descripcion="Este nombre aparece arriba de la pantalla y en los tickets. Podés decorarlo con emojis o signos."
            textoBoton="Empezar"
            onListo={() => {}}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--pos-glow),transparent_60%)] p-4">
      <div className="absolute top-3 right-3">
        <SelectorTema />
      </div>
      <form onSubmit={handleSubmit} className="panel w-full max-w-sm rounded-2xl p-7 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="brand-mark !h-14 !w-14 !rounded-2xl !text-2xl">{inicialDelNombre(negocio.nombre)}</span>
          <div>
            <h1 className="text-[length:calc(var(--pos-brand-size)*1.15)] font-bold">{negocio.nombre}</h1>
            {negocio.subtitulo && <p className="text-sm text-[var(--pos-text-dim)]">{negocio.subtitulo}</p>}
          </div>
        </div>

        <label className="section-label mb-1.5 block" htmlFor="usuario">
          Usuario
        </label>
        <select
          id="usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="mb-4 w-full rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] px-3 py-2.5"
        >
          {usuarios.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        <label className="section-label mb-1.5 block" htmlFor="password">
          Contraseña
        </label>
        <div className="relative mb-4">
          <input
            id="password"
            type={mostrarPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[var(--pos-border)] bg-[var(--pos-input)] py-2.5 pr-11 pl-3"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setMostrarPassword((v) => !v)}
            className="btn-icon absolute top-1/2 right-1 !h-8 !w-8 -translate-y-1/2"
            tabIndex={-1}
            title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Icon name={mostrarPassword ? 'eyeOff' : 'eye'} size={17} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-[var(--pos-red-soft)] px-3 py-2 text-sm text-[var(--pos-red)]">{error}</p>}

        <button type="submit" disabled={enviando} className="btn-primary w-full rounded-xl py-2.5 font-semibold">
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
