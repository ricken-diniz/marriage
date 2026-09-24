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
    } catch {
      setErro('Código inválido.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-story" aria-label="Boas-vindas">
        <div className="monogram" aria-hidden="true">M</div>
        <span className="login-eyebrow">Nosso dia</span>
        <h1>Que bom ter você com a gente.</h1>
        <p>Este espaço foi preparado para guardar cada detalhe de uma celebração muito especial.</p>
        <div className="story-line" aria-hidden="true" />
        <span className="story-note">Com carinho, Jéssica &amp; Nathan</span>
      </section>

      <section className="login-panel">
        <form onSubmit={handleSubmit} className="codigo-form">
          <span className="login-eyebrow">Acesso reservado</span>
          <h2>Entre com seu código</h2>
          <p>Use o código que recebemos especialmente para você.</p>

          <label htmlFor="codigo">Código do convite</label>
          <input
            id="codigo"
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ex.: ABC123"
            disabled={carregando}
            autoFocus
            autoComplete="one-time-code"
            spellCheck="false"
          />

          {erro && <span className="codigo-erro" role="alert">{erro}</span>}

          <button type="submit" disabled={carregando || !codigo.trim()}>
            {carregando ? 'Conferindo...' : 'Abrir convite'}
          </button>
          <small>O código diferencia letras maiúsculas e minúsculas.</small>
        </form>
      </section>
    </div>
  )
}

export default LoginPage