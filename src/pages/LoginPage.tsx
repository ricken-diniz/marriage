import { useState, type SubmitEventHandler } from 'react'

interface LoginPageProps {
  onSubmit: (code: string) => Promise<unknown>
}

export function LoginPage({ onSubmit }: LoginPageProps) {
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!codigo.trim()) return

    setCarregando(true)
    setErro(null)

    try {
      await onSubmit(codigo.trim())
    } catch (err) {
      setErro('Código inválido ou já utilizado.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="codigo-container">
      <form onSubmit={handleSubmit} className="codigo-form">
        <h1>Digite seu código</h1>
        <p>Insira o código que você recebeu para acessar.</p>

        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Ex: ABC123"
          disabled={carregando}
          autoFocus
        />

        {erro && <span className="codigo-erro">{erro}</span>}

        <button type="submit" disabled={carregando || !codigo.trim()}>
          {carregando ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage