import { useAuth } from './api/useAuth'
import LoginPage from './pages/LoginPage'
import MainApp from './pages/MainApp'
import AdminPage from './pages/AdminPage'

function App() {
  const { carregando, identificado, ehAdmin, enviarCodigo } = useAuth()

  if (carregando) return <p>Carregando...</p>
  if (!identificado) return <LoginPage onSubmit={enviarCodigo} />

  if (ehAdmin) return <AdminPage />

  return <MainApp />
}

export default App
