import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useNegocioStore } from './store/negocioStore'
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

  useEffect(() => {
    cargarSesion()
    cargarNegocio()
  }, [cargarSesion, cargarNegocio])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--pos-text-dim)]">
        Cargando...
      </div>
    )
  }

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
