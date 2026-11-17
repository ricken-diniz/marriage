import { useState, type SubmitEventHandler } from 'react'
import InvitationPage from './InvitationPage'
import monogramImage from '../assets/IMG_5339.PNG'
import flowerImage from '../assets/t.webp'

interface LoginPageProps {
  onSubmit: (code: string) => Promise<unknown>
}

export function LoginPage({ onSubmit }: LoginPageProps) {
  const [codigo, setCodigo] = useState(() => new URLSearchParams(window.location.search).get('codigo') ?? '')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [conviteAberto, setConviteAberto] = useState(false)

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

  if (conviteAberto) {
    return (
      <InvitationPage
        codigo={codigo}
        onCodigoChange={setCodigo}
        onSubmit={handleSubmit}
        carregando={carregando}
        erro={erro}
        showLogin
      />
    )
  }

  return (
    <main className="opening-page">
      <div className="opening-wash" aria-hidden="true" />
      <img className="opening-flower opening-flower-left" src={flowerImage} alt="" aria-hidden="true" />
      <img className="opening-flower opening-flower-right" src={flowerImage} alt="" aria-hidden="true" />
      <section className="opening-card" aria-label="Abrir convite">
        <p className="opening-kicker">Um convite especial</p>
        <div className="opening-monogram">
          <img src={monogramImage} alt="Monograma de Jéssica e Nathan" />
        </div>
        <p className="opening-date">26 de dezembro de 2026</p>
        <h1>Jéssica <span>&amp;</span> Nathan</h1>
        <p className="opening-copy">Preparamos cada detalhe com carinho. Você está convidado a viver este dia com a gente.</p>
        <button className="opening-button" type="button" onClick={() => setConviteAberto(true)}>
          <span>abrir convite</span>
          <span aria-hidden="true">↗</span>
        </button>
        <p className="opening-hint">Toque para entrar</p>
      </section>
    </main>
  )
}

export default LoginPage