import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../App.css'

type Presente = {
  id: string
  nome: string
  descricao: string | null
  valor: number
  valor_cota: number
  imagem_url: string | null
}

type Contribuicao = {
  id: string
  presente_id: string
}

type PresentesPageProps = {
  onHome: () => void
  onLogout: () => void
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function PresentesPage({ onHome, onLogout }: PresentesPageProps) {
  const [convidadoId, setConvidadoId] = useState<string | null>(null)
  const [presentes, setPresentes] = useState<Presente[]>([])
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([])
  const [presenteModal, setPresenteModal] = useState<Presente | null>(null)
  const [quantidadeModal, setQuantidadeModal] = useState(1)
  const [modalLivre, setModalLivre] = useState(false)
  const [valorLivre, setValorLivre] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDados() {
      const [convidadoResult, presentesResult] = await Promise.all([
        supabase.from('convidados').select('id').limit(1).maybeSingle(),
        supabase.from('presentes').select('id, nome, descricao, valor, valor_cota, imagem_url').order('nome'),
      ])

      if (convidadoResult.error || presentesResult.error) {
        setErro((convidadoResult.error ?? presentesResult.error)?.message ?? 'Não foi possível carregar os presentes.')
      } else {
        setConvidadoId(convidadoResult.data?.id ?? null)
        setPresentes((presentesResult.data ?? []) as Presente[])
        if (convidadoResult.data?.id) {
          const contribuicoesResult = await supabase
            .from('contribuicoes')
            .select('id, presente_id')
            .eq('convidado_id', convidadoResult.data.id)
          if (contribuicoesResult.error) setErro(contribuicoesResult.error.message)
          else setContribuicoes((contribuicoesResult.data ?? []) as Contribuicao[])
        }
      }
      setCarregando(false)
    }

    void carregarDados()
  }, [])

  function fecharModal() {
    setPresenteModal(null)
    setModalLivre(false)
    setValorLivre('')
    setQuantidadeModal(1)
  }

  function abrirPresente(presente: Presente) {
    const quantidade = contribuicoes.filter((item) => item.presente_id === presente.id).length
    setPresenteModal(presente)
    setQuantidadeModal(quantidade || 1)
    setMensagem(null)
    setErro(null)
  }

  async function salvarQuantidade(quantidade: number) {
    if (!convidadoId || !presenteModal) return
    setSalvando(true)
    setErro(null)
    const atuais = contribuicoes.filter((item) => item.presente_id === presenteModal.id)
    const diferenca = quantidade - atuais.length
    let saveError: { message: string } | null = null
    let novasContribuicoes: Contribuicao[] = []

    if (diferenca > 0) {
      const { data, error } = await supabase.from('contribuicoes').insert(
        Array.from({ length: diferenca }, () => ({ presente_id: presenteModal.id, convidado_id: convidadoId })),
      ).select('id, presente_id')
      saveError = error
      novasContribuicoes = (data ?? []) as Contribuicao[]
    } else if (diferenca < 0) {
      const idsParaRemover = atuais.slice(0, Math.abs(diferenca)).map((item) => item.id)
      const result = await supabase.from('contribuicoes').delete().in('id', idsParaRemover)
      saveError = result.error
    }

    if (saveError) setErro(saveError.message)
    else {
      const idsRemovidos = diferenca < 0 ? atuais.slice(0, Math.abs(diferenca)).map((item) => item.id) : []
      setContribuicoes((todos) => [
        ...todos.filter((item) => !idsRemovidos.includes(item.id)),
        ...novasContribuicoes,
      ])
      setMensagem('Suas cotas foram registradas com carinho.')
      fecharModal()
    }
    setSalvando(false)
  }

  async function escolherPresente() {
    const quantidade = Math.floor(Number(quantidadeModal))
    if (!Number.isFinite(quantidade) || quantidade < 1) {
      setErro('Informe pelo menos uma cota.')
      return
    }
    await salvarQuantidade(quantidade)
  }

  async function comprarPresenteTodo() {
    if (!presenteModal) return
    const quantidadeTotal = Math.ceil(presenteModal.valor / presenteModal.valor_cota)
    setQuantidadeModal(quantidadeTotal)
    await salvarQuantidade(quantidadeTotal)
  }

  async function removerContribuicoes(presenteId: string) {
    const ids = contribuicoes.filter((item) => item.presente_id === presenteId).map((item) => item.id)
    if (!ids.length) return
    setSalvando(true)
    setErro(null)
    const { error: deleteError } = await supabase.from('contribuicoes').delete().in('id', ids)
    if (deleteError) setErro(deleteError.message)
    else {
      setContribuicoes((atuais) => atuais.filter((item) => !ids.includes(item.id)))
      setMensagem('Suas cotas foram removidas.')
    }
    setSalvando(false)
  }

  async function contribuirLivre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!convidadoId) return
    const valor = Number(valorLivre.replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor válido e maior que zero.')
      return
    }

    setSalvando(true)
    setErro(null)
    const { error: saveError } = await supabase.from('contribuicoes_livres').insert({ convidado_id: convidadoId, valor_cota: valor })
    if (saveError) setErro(saveError.message)
    else {
      setMensagem('Sua contribuição foi registrada com carinho.')
      fecharModal()
    }
    setSalvando(false)
  }

  if (carregando) return <main className="guest-shell"><p className="guest-status">Carregando sua lista...</p></main>

  return (
    <main className="guest-shell">
      <header className="guest-header guest-header-with-actions">
        <div>
          <span className="admin-kicker">Lista de presentes</span>
          <h1>Um carinho para começar a nossa casa.</h1>
          <p>Escolha uma cota de presente ou contribua com o valor que fizer sentido para você.</p>
        </div>
        <div className="guest-header-actions"><button className="button button-quiet" type="button" onClick={onHome}>Início</button><button className="button button-quiet" type="button" onClick={onLogout}>Sair</button></div>
      </header>

      {(erro || mensagem) && <div className={erro ? 'guest-alert' : 'guest-success'} role="status">{erro ?? mensagem}</div>}

      <section className="guest-section">
        <div className="guest-section-heading">
          <div><span className="admin-kicker">Lista de presentes</span><h2>Escolha uma cota</h2></div>
          <span>{presentes.length} opções</span>
        </div>
        <div className="guest-gifts">
          {presentes.map((presente) => {
            return <article className="guest-gift" key={presente.id}>
              {presente.imagem_url ? <img src={presente.imagem_url} alt="" /> : <div className="gift-placeholder">P</div>}
              <div className="guest-gift-copy"><h3>{presente.nome}</h3><p>{moeda.format(presente.valor_cota)} por cota · {moeda.format(presente.valor)} total</p></div>
              <button type="button" disabled={salvando} onClick={() => abrirPresente(presente)}>Ver presente</button>
            </article>
          })}
        </div>
      </section>

      <section className="guest-section">
        <div className="guest-section-heading"><div><span className="admin-kicker">Suas escolhas</span><h2>Presentes que você escolheu</h2></div><span>{contribuicoes.length} presentes</span></div>
        <div className="my-contributions">
          {contribuicoes.map((contribuicao) => {
            const presente = presentes.find((item) => item.id === contribuicao.presente_id)
            if (!presente) return null
            const quantidade = contribuicoes.filter((item) => item.presente_id === presente.id).length
            if (contribuicao.id !== contribuicoes.find((item) => item.presente_id === presente.id)?.id) return null
            return <article className="my-contribution" key={contribuicao.id}><div><strong>{presente.nome}</strong><span>{quantidade} {quantidade === 1 ? 'cota' : 'cotas'} · {moeda.format(quantidade * presente.valor_cota)}</span></div><button type="button" disabled={salvando} onClick={() => void removerContribuicoes(presente.id)}>Remover cotas</button></article>
          })}
          {!contribuicoes.length && <p className="empty-state">Você ainda não escolheu nenhum presente.</p>}
        </div>
      </section>

      <section className="guest-section guest-free-form">
        <div><span className="admin-kicker">Contribuição livre</span><h2>Prefere escolher seu próprio valor?</h2><p>Todo gesto ajuda a construir este novo capítulo.</p></div>
        <button className="button button-primary" type="button" onClick={() => { setModalLivre(true); setMensagem(null); setErro(null) }}>Informar valor</button>
      </section>

      {(presenteModal || modalLivre) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) fecharModal() }}>
        <section className="contribution-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close" type="button" aria-label="Fechar" onClick={fecharModal}>×</button>
          {presenteModal ? <>
            <span className="admin-kicker">Sua escolha</span>
            <h2 id="modal-title">{presenteModal.nome}</h2>
            {presenteModal.descricao && <p>{presenteModal.descricao}</p>}
            <p>Uma cota custa {moeda.format(presenteModal.valor_cota)}. O valor total deste presente é {moeda.format(presenteModal.valor)}.</p>
            <label className="quantity-label" htmlFor="quantidade-cotas">Quantidade de cotas</label>
            <input id="quantidade-cotas" className="quantity-input" type="number" min="1" step="1" value={quantidadeModal} onChange={(event) => setQuantidadeModal(Number(event.target.value))} />
            <button className="button button-quiet modal-action" type="button" disabled={salvando} onClick={() => void comprarPresenteTodo()}>Comprar o presente todo!</button>
            <button className="button button-primary modal-action" type="button" disabled={salvando} onClick={() => void escolherPresente()}>{salvando ? 'Registrando...' : 'Confirmar escolha'}</button>
          </> : <>
            <span className="admin-kicker">Contribuição livre</span>
            <h2 id="modal-title">Escolha o seu valor</h2>
            <form onSubmit={contribuirLivre}>
              <label htmlFor="valor-livre">Valor da sua cota</label>
              <input id="valor-livre" inputMode="decimal" value={valorLivre} onChange={(event) => setValorLivre(event.target.value)} placeholder="0,00" autoFocus />
              <button className="button button-primary modal-action" type="submit" disabled={salvando || !valorLivre.trim()}>{salvando ? 'Registrando...' : 'Confirmar contribuição'}</button>
            </form>
          </>}
        </section>
      </div>}
    </main>
  )
}

export default PresentesPage