import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useNegocioStore } from './store/negocioStore'
import { useLicenciaStore } from './store/licenciaStore'
import ActivarLicencia from './components/ActivarLicencia'
import LoginPage from './pages/LoginPage'
import PanelPrincipalPage from './pages/PanelPrincipalPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const usuario = useAuthStore((s) => s.usuario)
  if (!usuario) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  const { loading, usuario, cargarSesion } = useAuthStore()

  const cargarNegocio = useNegocioStore((s) => s.cargar)
  const { licencia, cargada: licenciaCargada, cargar: cargarLicencia } = useLicenciaStore()

  useEffect(() => {
    cargarSesion()
    cargarNegocio()
    cargarLicencia()
    // apiFetch avisa cuando la API responde 402 (la prueba vencio con el programa abierto)
    window.addEventListener('licencia-vencida', cargarLicencia)
    return () => window.removeEventListener('licencia-vencida', cargarLicencia)
  }, [cargarSesion, cargarNegocio, cargarLicencia])

  if (loading || !licenciaCargada) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--pos-text-dim)]">
        Cargando...
      </div>
    )
  }

  if (licencia?.estado === 'vencida') return <ActivarLicencia />

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <PanelPrincipalPage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App
