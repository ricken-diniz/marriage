import { useAuth } from './api/useAuth'
import LoginPage from './pages/LoginPage'
import MainApp from './pages/MainApp'

function App() {
  const { carregando, identificado, enviarCodigo } = useAuth()

  if (carregando) return <p>Carregando...</p>
  if (!identificado) return <LoginPage onSubmit={enviarCodigo} />

  return <MainApp />
}

export default App
