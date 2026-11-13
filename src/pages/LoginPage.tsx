import { useState, type SubmitEventHandler } from 'react'
import monogramImage from '../assets/IMG_5339.PNG'

interface LoginPageProps {
  onSubmit: (code: string) => Promise<unknown>
}

export function LoginPage({ onSubmit }: LoginPageProps) {
  const [codigo, setCodigo] = useState(() => new URLSearchParams(window.location.search).get('codigo') ?? '')
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
        <div className="monogram">
          <img src={monogramImage} alt="" aria-hidden="true" />
        </div>
        <span className="login-eyebrow">26/12/2026</span>
        <h1>Sejam bem-vindos!</h1>
        <p>Preparem o coração, porque o caminho até o altar já começou. Preparamos este espaço para compartilhar cada detalhe da nossa celebração.</p>
        <div className="story-line" aria-hidden="true" />
        <span className="story-note">Com carinho, Jéssica &amp; Nathan</span>
      </section>

      <section className="login-panel">
        <form onSubmit={handleSubmit} className="codigo-form">
          <span className="login-eyebrow">Acesso reservado</span>
          <h2>Entre com seu código</h2>
          <p>Use o código que enviamos especialmente para você.</p>

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