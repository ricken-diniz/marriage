import { useEffect, useRef, useState, type SubmitEventHandler } from 'react'
import cameraIcon from '../assets/i00000.png'
import cakeIcon from '../assets/i000.png'
import confirmationIcon from '../assets/i090.png'
import locationIcon from '../assets/i00.png'
import receptionIcon from '../assets/i0.svg'
import punctualityIcon from '../assets/i0008.png'
import silenceIcon from '../assets/i0000.png'
import guestIcon from '../assets/i999000.png'
import weddingHomeIcon from '../assets/i9090900.png'
import dressCodeIcon from '../assets/i0909.png'
import messageIcon from '../assets/i.png'
import flowerImage from '../assets/s.png'
import frameImage from '../assets/p00.png'
import monogramImage from '../assets/IMG_5339.PNG'
import firstPhoto from '../assets/x.jpeg'
import finalPhoto from '../assets/xxxx.jpeg'

interface InvitationPageProps {
  codigo?: string
  onCodigoChange?: (codigo: string) => void
  onSubmit?: SubmitEventHandler<HTMLFormElement>
  carregando?: boolean
  erro?: string | null
  showLogin?: boolean
}

const guestInstructions = [
  { icon: confirmationIcon, text: 'Confirmar presença até dia 30/11' },
  { icon: guestIcon, text: 'Convidado não convida' },
  { icon: punctualityIcon, text: 'Não se atrase, seja pontual' },
  { icon: cameraIcon, text: 'Não atrapalhe os fotógrafos' },
  { icon: silenceIcon, text: 'Deixe o seu celular no silencioso' },
  { icon: weddingHomeIcon, text: 'Aguarde a liberação da mesa de doces' },
  { icon: messageIcon, text: 'Não faça comentários negativos' },
  { icon: cakeIcon, text: 'Aproveite bastante' },
  { icon: confirmationIcon, text: 'Não saia sem se despedir dos noivos' },
  { icon: dressCodeIcon, text: 'Dress code: esporte fino' },
]

const weddingPalette = ['#000080', '#91a8d0', '#b0cddd', '#ca2c92', '#7c0606', '#e9e6c3']

const weddingDate = new Date('2026-12-26T18:30:00-03:00')

function getCountdown() {
  const difference = Math.max(0, weddingDate.getTime() - Date.now())
  const totalSeconds = Math.floor(difference / 1000)

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export function InvitationPage({ codigo = '', onCodigoChange, onSubmit, carregando = false, erro = null, showLogin = false }: InvitationPageProps) {
  const pageRef = useRef<HTMLElement>(null)
  const autoScrollRef = useRef(false)
  const [countdown, setCountdown] = useState(getCountdown)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    const stopAutoScroll = () => {
      autoScrollRef.current = false
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) stopAutoScroll()
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) autoScrollRef.current = false

    window.addEventListener('wheel', stopAutoScroll, { passive: true })
    window.addEventListener('touchstart', stopAutoScroll, { passive: true })
    window.addEventListener('keydown', handleKeyDown)

    let frameId = 0
    let lastTimestamp = 0
    const scroll = (timestamp: number) => {
      if (autoScrollRef.current && pageRef.current && document.documentElement.scrollHeight > window.innerHeight) {
        const elapsed = lastTimestamp ? timestamp - lastTimestamp : 0
        if (elapsed < 100) window.scrollBy(0, elapsed * 0.012)
        lastTimestamp = timestamp
        frameId = window.requestAnimationFrame(scroll)
      }
    }
    frameId = window.requestAnimationFrame(scroll)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('wheel', stopAutoScroll)
      window.removeEventListener('touchstart', stopAutoScroll)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => setCountdown(getCountdown()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <main ref={pageRef} className="invitation-page">
      {showLogin && onSubmit && <a className="invitation-login-link" href="#convite-login" onClick={(event) => {
        event.preventDefault()
        autoScrollRef.current = false
        document.getElementById('convite-login')?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start',
        })
      }}>Entrar</a>}
      <section className="invitation-hero">
        <img className="invitation-hero-flower" src={flowerImage} alt="" aria-hidden="true" />
        <p className="invitation-kicker">O nosso grande dia</p>
        <img className="invitation-monogram" src={monogramImage} alt="Monograma J e N" />
        <p className="invitation-date">26 <span>•</span> 12 <span>•</span> 2026</p>
        <h1>Jéssica <em>&amp;</em> Nathan</h1>
        <p className="invitation-intro">“E, acima de tudo, tenham amor, pois o amor une perfeitamente todas as coisas.”</p>
        <p className="invitation-intro">Colossenses 3:14</p>
        <p className="invitation-intro">Com a benção de Deus e de seus pais</p>
        <span className="scroll-mark" aria-hidden="true">↓</span>
      </section>

      <section className="invitation-story invitation-section">
        <div className="story-copy">
          <p className="invitation-kicker">Uma nova história</p>
          <h2>O amor nos trouxe até aqui.</h2>
          <p>Depois de tantos caminhos compartilhados, chegou a hora de reunir as pessoas que fazem parte da nossa história para celebrar este novo capítulo.</p>
          <p>Será um dia leve, cheio de afeto e de memórias que vamos guardar para sempre.</p>
        </div>
        <figure className="story-frame">
          <div className="story-frame-art"><img src={firstPhoto} alt="Jéssica e Nathan juntos ao ar livre" /><img className="story-frame-overlay" src={frameImage} alt="" aria-hidden="true" /></div>
          <figcaption>onde tudo fica mais bonito quando estamos juntos</figcaption>
          <div className="invitation-countdown" aria-label="Contagem regressiva para o casamento">
            <p className="countdown-heading">Realizar-se no dia</p>
            <p className="countdown-date">26 <span>|</span> 12 <span>|</span> 2026</p>
            <p className="countdown-weekday">Sábado às 18:30</p>
            <div className="countdown-panel">
              <p className="countdown-caption">O nosso “para sempre” começa em...</p>
              <div className="countdown-values">
                <span><strong>{countdown.days}</strong><small>DIAS</small></span>
                <i aria-hidden="true">:</i>
                <span><strong>{String(countdown.hours).padStart(2, '0')}</strong><small>HORAS</small></span>
                <i aria-hidden="true">:</i>
                <span><strong>{String(countdown.minutes).padStart(2, '0')}</strong><small>MINUTOS</small></span>
                <i aria-hidden="true">:</i>
                <span><strong>{String(countdown.seconds).padStart(2, '0')}</strong><small>SEGUNDOS</small></span>
              </div>
            </div>
          </div>
        </figure>
      </section>

      <section className="invitation-instructions invitation-section">
        <div className="instructions-heading">
          <p className="invitation-kicker">Um carinho para este dia</p>
          <h2>Manual do convidado</h2>
          <p>Alguns lembretes para que todos possam aproveitar a celebração com leveza.</p>
        </div>
        <div className="instruction-grid">
          {guestInstructions.map((instruction) => <article className="instruction-item" key={instruction.text}><img src={instruction.icon} alt="" aria-hidden="true" /><p>{instruction.text}</p></article>)}
        </div>
      </section>

      <section className="invitation-details invitation-section">
        <div className="details-copy">
          <p className="invitation-kicker">Um lembrete importante</p>
          <h2>Detalhes do convite</h2>
          <p className="details-comfort">O importante é estar confortável para aproveitar a<br />festa do início ao fim!</p>
          <p className="details-colors">Só uma ajudinha com as cores: deixem o branco,<br />marfim e bege para a noiva, e evitem azul<br />(principalmente marinho e serenity), fúcsia/pink e<br />marsala/vinho, que são cores especiais do nosso altar.</p>
          <div className="details-palette" aria-label="Paleta de cores do casamento">
            {weddingPalette.map((color) => <span key={color} style={{ backgroundColor: color }} aria-label={color} />)}
          </div>
        </div>
      </section>

      <section className="invitation-final invitation-section">
        <div className="final-photo">
          <div className="final-photo-frame">
            <img className="final-photo-image" src={finalPhoto} alt="Jéssica e Nathan em frente a uma construção histórica" />
            <img className="final-photo-overlay" src={frameImage} alt="" aria-hidden="true" />
            <img className="final-photo-flower final-photo-flower-left" src={flowerImage} alt="" aria-hidden="true" />
            <img className="final-photo-flower final-photo-flower-right" src={flowerImage} alt="" aria-hidden="true" />
          </div>
        </div>
        <div className="final-copy">
          <p className="invitation-kicker">Esperamos por você</p>
          <h2>Até lá!</h2>
          <p>Que a nossa alegria também se torne parte da sua.</p>
          <div className="final-locations">
            <article className="final-location"><img src={locationIcon} alt="" aria-hidden="true" /><div><span>Localização da cerimônia</span><strong>Paróquia São José</strong></div></article>
            <article className="final-location"><img src={receptionIcon} alt="" aria-hidden="true" /><div><span>Localização da recepção</span><strong>Dubay Recepções</strong></div></article>
          </div>
        </div>
      </section>

      {showLogin && onSubmit && <section id="convite-login" className="invitation-login invitation-section" aria-label="Acesso ao convite">
        <div><p className="invitation-kicker">Seu acesso reservado</p><h2>Agora, entre para continuar.</h2><p>Use o código que enviamos especialmente para você.</p></div>
        <form onSubmit={onSubmit} className="invitation-form">
          <label htmlFor="codigo">Código do convite</label>
          <input id="codigo" type="text" value={codigo} onChange={(event) => onCodigoChange?.(event.target.value)} placeholder="Ex.: ABC123" disabled={carregando} autoFocus autoComplete="one-time-code" spellCheck="false" />
          {erro && <span className="codigo-erro" role="alert">{erro}</span>}
          <button type="submit" disabled={carregando || !codigo.trim()}>{carregando ? 'Conferindo...' : 'Continuar'}</button>
          <small>O código diferencia letras maiúsculas e minúsculas.</small>
        </form>
      </section>}
    </main>
  )
}

export default InvitationPage