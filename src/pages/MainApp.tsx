import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import PresentesPage from './PresentesPage'
import '../App.css'

type Convidado = {
    id: string
    nome: string
    confirmacao_presenca: boolean | null
}

type Companhia = {
    id: string
    nome: string
    confirmacao_presenca: boolean | null
}

type Mensagem = {
    id: string
    mensagem: string
    created_at: string
    convidado_id: string
}

function MainApp() {
    const [pagina, setPagina] = useState<'inicio' | 'presentes'>('inicio')
    const [convidado, setConvidado] = useState<Convidado | null>(null)
    const [companhias, setCompanhias] = useState<Companhia[]>([])
    const [mensagens, setMensagens] = useState<Mensagem[]>([])
    const [mensagemNova, setMensagemNova] = useState('')
    const [modalCompanhias, setModalCompanhias] = useState(false)
    const [carregando, setCarregando] = useState(true)
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    async function carregarDados() {
        const [convidadoResult, companhiasResult, mensagensResult] = await Promise.all([
            supabase.from('convidados').select('id, nome, confirmacao_presenca').limit(1).maybeSingle(),
            supabase.from('companhias').select('id, nome, confirmacao_presenca').order('nome'),
            supabase.from('mensagens').select('id, mensagem, created_at, convidado_id').order('created_at', { ascending: false }),
        ])

        const resultadoComErro = [convidadoResult, companhiasResult, mensagensResult].find((resultado) => resultado.error)
        if (resultadoComErro?.error) setErro(resultadoComErro.error.message)
        else {
            setConvidado(convidadoResult.data as Convidado | null)
            setCompanhias((companhiasResult.data ?? []) as Companhia[])
            setMensagens((mensagensResult.data ?? []) as Mensagem[])
        }
        setCarregando(false)
    }

    useEffect(() => {
        const carregarInicialmente = async () => {
            await Promise.resolve()
            await carregarDados()
        }

        void carregarInicialmente()
    }, [])

    async function confirmarPresenca(confirmacao: boolean) {
        if (!convidado) return
        setSalvando(true)
        setErro(null)
        const { error: saveError } = await supabase
            .from('convidados')
            .update({ confirmacao_presenca: confirmacao })
            .eq('id', convidado.id)
        if (saveError) setErro(saveError.message)
        else setConvidado({ ...convidado, confirmacao_presenca: confirmacao })
        setSalvando(false)
    }

    async function confirmarCompanhia(companhia: Companhia, confirmacao: boolean) {
        setSalvando(true)
        setErro(null)
        const { error: saveError } = await supabase
            .from('companhias')
            .update({ confirmacao_presenca: confirmacao })
            .eq('id', companhia.id)
        if (saveError) setErro(saveError.message)
        else setCompanhias((atuais) => atuais.map((atual) => atual.id === companhia.id ? { ...atual, confirmacao_presenca: confirmacao } : atual))
        setSalvando(false)
    }

    async function registrarMensagem(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!convidado || !mensagemNova.trim()) return
        setSalvando(true)
        setErro(null)
        const { data, error: saveError } = await supabase
            .from('mensagens')
            .insert({ convidado_id: convidado.id, mensagem: mensagemNova.trim() })
            .select('id, mensagem, created_at, convidado_id')
            .single()
        if (saveError) setErro(saveError.message)
        else {
            setMensagens((atuais) => [data as Mensagem, ...atuais])
            setMensagemNova('')
        }
        setSalvando(false)
    }

    async function sair() {
        await supabase.auth.signOut()
    }

    if (pagina === 'presentes') {
        return <PresentesPage onHome={() => setPagina('inicio')} onLogout={() => void sair()} />
    }

    if (carregando) return <main className="guest-shell"><p className="guest-status">Carregando seu convite...</p></main>

    return (
        <main className="guest-shell">
            <header className="guest-header home-header">
                <div>
                    <span className="admin-kicker">Nosso dia</span>
                    <h1>Que alegria ter você com a gente, {convidado?.nome}.</h1>
                    <p>Este é o cantinho da nossa celebração. Confirme sua presença, deixe uma mensagem e participe da nossa lista de presentes.</p>
                </div>
                <button className="button button-quiet" type="button" onClick={() => void sair()}>Sair</button>
            </header>

            {erro && <div className="guest-alert" role="alert">{erro}</div>}

            <section className="home-actions" aria-label="Ações do convite">
                <div className="home-action-copy"><span className="admin-kicker">Presença</span><h2>{convidado?.confirmacao_presenca === true ? 'Você confirmou presença.' : 'Você vem celebrar com a gente?'}</h2></div>
                <div className="home-action-buttons">
                    <button className="button button-primary" type="button" disabled={salvando || convidado?.confirmacao_presenca === true} onClick={() => void confirmarPresenca(true)}>Vou comparecer</button>
                    <button className="button button-quiet" type="button" disabled={salvando || convidado?.confirmacao_presenca === false} onClick={() => void confirmarPresenca(false)}>Não poderei ir</button>
                </div>
            </section>

            <section className="home-grid">
                <div className="home-message-section">
                    <div className="guest-section-heading"><div><span className="admin-kicker">Mural</span><h2>Mensagens para os noivos</h2></div><span>{mensagens.length} mensagens</span></div>
                    <form className="message-form" onSubmit={registrarMensagem}>
                        <label htmlFor="nova-mensagem">Deixe uma mensagem</label>
                        <textarea id="nova-mensagem" value={mensagemNova} onChange={(event) => setMensagemNova(event.target.value)} placeholder="Escreva algo especial para Marina e João..." rows={4} maxLength={500} />
                        <button className="button button-primary" type="submit" disabled={salvando || !mensagemNova.trim()}>{salvando ? 'Enviando...' : 'Publicar mensagem'}</button>
                    </form>
                    <div className="message-list">
                        {mensagens.map((item) => <article className="message-item" key={item.id}><p>{item.mensagem}</p><span>{item.convidado_id === convidado?.id ? 'Você' : 'Convidado'} · {new Date(item.created_at).toLocaleDateString('pt-BR')}</span></article>)}
                        {!mensagens.length && <p className="empty-state">Ainda não há mensagens. Seja o primeiro a escrever.</p>}
                    </div>
                </div>

                <aside className="home-side-actions">
                    <button className="home-navigation-button" type="button" onClick={() => setPagina('presentes')}><span><small>Lista de presentes</small><strong>Escolha uma cota</strong></span><b aria-hidden="true">→</b></button>
                    <button className="home-navigation-button" type="button" onClick={() => setModalCompanhias(true)}><span><small>Seu convite</small><strong>Ver companhias ({companhias.length})</strong></span><b aria-hidden="true">+</b></button>
                </aside>
            </section>

            {modalCompanhias && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalCompanhias(false) }}>
                <section className="contribution-modal companions-modal" role="dialog" aria-modal="true" aria-labelledby="companions-title">
                    <button className="modal-close" type="button" aria-label="Fechar" onClick={() => setModalCompanhias(false)}>×</button>
                    <span className="admin-kicker">Seu convite</span>
                    <h2 id="companions-title">Quem vem com você?</h2>
                    <div className="companions-list">
                        {companhias.map((companhia) => <div className="companion-item" key={companhia.id}><div><strong>{companhia.nome}</strong><span>{companhia.confirmacao_presenca === true ? 'Presença confirmada' : companhia.confirmacao_presenca === false ? 'Não poderá comparecer' : 'Aguardando confirmação'}</span></div><button type="button" disabled={salvando || companhia.confirmacao_presenca === true} onClick={() => void confirmarCompanhia(companhia, true)}>{companhia.confirmacao_presenca === true ? 'Confirmada' : 'Confirmar'}</button></div>)}
                        {!companhias.length && <p className="empty-state">Você não possui companhias neste convite.</p>}
                    </div>
                </section>
            </div>}
        </main>
    )
}

export default MainApp