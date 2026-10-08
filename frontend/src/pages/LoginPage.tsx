import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarUsuarios } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { useNegocioStore } from '../store/negocioStore'

export default function LoginPage() {
  const negocio = useNegocioStore((s) => s.negocio)
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

  return (
    <div className="flex h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="neon-panel w-80 rounded-2xl p-6"
      >
        <h1 className="neon-title mb-1 text-center text-2xl font-extrabold tracking-wide">
          {negocio.nombre}
        </h1>
        <p className="mb-6 min-h-4 text-center text-xs tracking-[0.3em] text-[var(--pos-text-dim)] uppercase">{negocio.subtitulo}</p>

        <label className="mb-1 block text-sm text-[var(--pos-text-dim)]" htmlFor="usuario">
          Usuario
        </label>
        <select
          id="usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="mb-4 w-full rounded border border-[var(--pos-border)] bg-black px-3 py-2 text-[var(--pos-text)]"
        >
          {usuarios.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm text-[var(--pos-text-dim)]" htmlFor="password">
          Contrasena
        </label>
        <div className="mb-4 flex items-center rounded border border-[var(--pos-border)] bg-black">
          <input
            id="password"
            type={mostrarPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent px-3 py-2 text-[var(--pos-text)] outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setMostrarPassword((v) => !v)}
            className="px-3 text-[var(--pos-text-dim)]"
            tabIndex={-1}
          >
            {mostrarPassword ? '🚫' : '👁'}
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-[var(--pos-red)]">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="neon-btn-primary w-full rounded-lg py-2 font-semibold text-white disabled:opacity-50"
        >
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
