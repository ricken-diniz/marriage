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
  visivel: boolean
}

type Contribuicao = {
  id: string
  presente_id: string
  confirmado: boolean
}

type ContribuicaoLivre = {
  id: string
  valor_cota: number
  confirmado: boolean
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
  const [contribuicoesLivres, setContribuicoesLivres] = useState<ContribuicaoLivre[]>([])
  const [presenteModal, setPresenteModal] = useState<Presente | null>(null)
  const [presenteRemocaoModal, setPresenteRemocaoModal] = useState<Presente | null>(null)
  const [contribuicaoLivreRemocaoModal, setContribuicaoLivreRemocaoModal] = useState<ContribuicaoLivre | null>(null)
  const [quantidadeModal, setQuantidadeModal] = useState(1)
  const [quantidadeRemocao, setQuantidadeRemocao] = useState(1)
  const [modalLivre, setModalLivre] = useState(false)
  const [valorLivre, setValorLivre] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDados() {
      const [convidadoResult, presentesResult] = await Promise.all([
        supabase.rpc('obter_convidado_atual').maybeSingle(),
        supabase.from('presentes').select('id, nome, descricao, valor, valor_cota, imagem_url, visivel').order('nome'),
      ])

      if (convidadoResult.error || presentesResult.error) {
        setErro((convidadoResult.error ?? presentesResult.error)?.message ?? 'Não foi possível carregar os presentes.')
      } else {
        const convidadoAtual = convidadoResult.data as { id: string } | null
        setConvidadoId(convidadoAtual?.id ?? null)
        setPresentes((presentesResult.data ?? []) as Presente[])
        if (convidadoAtual?.id) {
          const [contribuicoesResult, livresResult] = await Promise.all([
            supabase
              .from('contribuicoes')
              .select('id, presente_id, confirmado')
              .eq('convidado_id', convidadoAtual.id),
            supabase
              .from('contribuicoes_livres')
              .select('id, valor_cota, confirmado')
              .eq('convidado_id', convidadoAtual.id)
              .order('created_at', { ascending: false }),
          ])
          if (contribuicoesResult.error || livresResult.error) setErro((contribuicoesResult.error ?? livresResult.error)?.message ?? 'Não foi possível carregar suas contribuições.')
          else {
            setContribuicoes((contribuicoesResult.data ?? []) as Contribuicao[])
            setContribuicoesLivres((livresResult.data ?? []) as ContribuicaoLivre[])
          }
        }
      }
      setCarregando(false)
    }

    void carregarDados()
  }, [])

  function fecharModal() {
    setPresenteModal(null)
    setPresenteRemocaoModal(null)
    setContribuicaoLivreRemocaoModal(null)
    setModalLivre(false)
    setValorLivre('')
    setQuantidadeModal(1)
    setQuantidadeRemocao(1)
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
    const atuais = contribuicoes.filter((item) => item.presente_id === presenteModal.id)
    const diferenca = quantidade - atuais.length
    if (diferenca < 0) {
      setErro('Para remover cotas, use o botão "Remover cotas".')
      return
    }
    if (!presenteModal.visivel && diferenca > 0) {
      setErro('Este presente não está mais recebendo novas cotas.')
      return
    }
    setSalvando(true)
    setErro(null)
    let saveError: { message: string } | null = null
    let novasContribuicoes: Contribuicao[] = []

    if (diferenca > 0) {
      const { data, error } = await supabase.from('contribuicoes').insert(
        Array.from({ length: diferenca }, () => ({ presente_id: presenteModal.id, convidado_id: convidadoId })),
      ).select('id, presente_id, confirmado')
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

  async function removerContribuicoes(presenteId: string, quantidade: number) {
    const ids = contribuicoes
      .filter((item) => item.presente_id === presenteId && !item.confirmado)
      .slice(0, quantidade)
      .map((item) => item.id)
    if (!Number.isInteger(quantidade) || quantidade < 1 || !ids.length || ids.length !== quantidade) {
      setErro('Informe uma quantidade válida de cotas não confirmadas.')
      return
    }
    setSalvando(true)
    setErro(null)
    const { error: deleteError } = await supabase.from('contribuicoes').delete().in('id', ids)
    if (deleteError) setErro(deleteError.message)
    else {
      setContribuicoes((atuais) => atuais.filter((item) => !ids.includes(item.id)))
      setMensagem('Suas cotas foram removidas.')
      setPresenteRemocaoModal(null)
    }
    setSalvando(false)
  }

  async function removerContribuicaoLivre(contribuicao: ContribuicaoLivre) {
    if (contribuicao.confirmado) return
    setSalvando(true)
    setErro(null)
    const { error: deleteError } = await supabase.from('contribuicoes_livres').delete().eq('id', contribuicao.id)
    if (deleteError) setErro(deleteError.message)
    else {
      setContribuicoesLivres((atuais) => atuais.filter((item) => item.id !== contribuicao.id))
      setMensagem('Sua contribuição livre foi removida.')
      setContribuicaoLivreRemocaoModal(null)
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
    const { data, error: saveError } = await supabase
      .from('contribuicoes_livres')
      .insert({ convidado_id: convidadoId, valor_cota: valor })
      .select('id, valor_cota, confirmado')
      .single()
    if (saveError) setErro(saveError.message)
    else {
      setContribuicoesLivres((atuais) => [data as ContribuicaoLivre, ...atuais])
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
            const jaEscolhido = contribuicoes.some((item) => item.presente_id === presente.id)
            if (!presente.visivel && !jaEscolhido) return null
            return <article className="guest-gift" key={presente.id}>
              {presente.imagem_url ? <img src={presente.imagem_url} alt="" /> : <div className="gift-placeholder">P</div>}
              <div className="guest-gift-details"><div className="guest-gift-copy"><h3>{presente.nome}</h3><p>{moeda.format(presente.valor_cota)} por cota · {moeda.format(presente.valor)} total</p></div><button type="button" disabled={salvando} onClick={() => abrirPresente(presente)}>{presente.visivel ? 'Ver presente' : 'Cotas encerradas'}</button></div>
            </article>
          })}
        </div>
      </section>

      <section className="guest-section">
        <div className="guest-section-heading"><div><span className="admin-kicker">Suas escolhas</span><h2>Presentes que você escolheu</h2></div><span>{contribuicoes.length + contribuicoesLivres.length} contribuições</span></div>
        <div className="my-contributions">
          {contribuicoes.map((contribuicao) => {
            const presente = presentes.find((item) => item.id === contribuicao.presente_id)
            if (!presente) return null
            const contribuicoesDoPresente = contribuicoes.filter((item) => item.presente_id === presente.id)
            const quantidade = contribuicoesDoPresente.length
            const cotasNaoConfirmadas = contribuicoesDoPresente.filter((item) => !item.confirmado).length
            const cotasConfirmadas = quantidade - cotasNaoConfirmadas
            if (contribuicao.id !== contribuicoes.find((item) => item.presente_id === presente.id)?.id) return null
            return <article className="my-contribution" key={contribuicao.id}><div><strong>{presente.nome}</strong><span>{quantidade} {quantidade === 1 ? 'cota' : 'cotas'} · {moeda.format(quantidade * presente.valor_cota)}{cotasConfirmadas ? ` · ${cotasConfirmadas} confirmada${cotasConfirmadas === 1 ? '' : 's'}` : ''}</span></div>{cotasNaoConfirmadas ? <button type="button" disabled={salvando} onClick={() => { setPresenteRemocaoModal(presente); setQuantidadeRemocao(1); setErro(null) }}>Remover cotas</button> : <span className="confirmed-contribution-label">Cotas confirmadas</span>}</article>
          })}
          {contribuicoesLivres.map((contribuicao) => <article className="my-contribution" key={contribuicao.id}><div><strong>Contribuição livre</strong><span>{moeda.format(contribuicao.valor_cota)}{contribuicao.confirmado ? ' · Confirmada' : ' · Aguardando confirmação'}</span></div>{contribuicao.confirmado ? <span className="confirmed-contribution-label">Valor confirmado</span> : <button type="button" disabled={salvando} onClick={() => { setContribuicaoLivreRemocaoModal(contribuicao); setErro(null) }}>Remover contribuição</button>}</article>)}
          {!contribuicoes.length && !contribuicoesLivres.length && <p className="empty-state">Você ainda não escolheu nenhum presente.</p>}
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
            {presenteModal.imagem_url ? <img className="gift-modal-image" src={presenteModal.imagem_url} alt={`Foto de ${presenteModal.nome}`} /> : <div className="gift-modal-placeholder" aria-hidden="true">P</div>}
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

      {presenteRemocaoModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) fecharModal() }}>
        <section className="contribution-modal" role="dialog" aria-modal="true" aria-labelledby="remocao-title">
          <button className="modal-close" type="button" aria-label="Fechar" onClick={fecharModal}>×</button>
          <span className="admin-kicker">Remover cotas</span>
          <h2 id="remocao-title">{presenteRemocaoModal.nome}</h2>
          <p>Escolha quantas cotas não confirmadas deseja remover. Cotas já confirmadas não podem ser removidas.</p>
          <label className="quantity-label" htmlFor="quantidade-remocao">Quantidade de cotas</label>
          <input
            id="quantidade-remocao"
            className="quantity-input"
            type="number"
            min="1"
            max={contribuicoes.filter((item) => item.presente_id === presenteRemocaoModal.id && !item.confirmado).length}
            step="1"
            value={quantidadeRemocao}
            onChange={(event) => setQuantidadeRemocao(Number(event.target.value))}
          />
          <button className="button button-primary modal-action" type="button" disabled={salvando} onClick={() => void removerContribuicoes(presenteRemocaoModal.id, quantidadeRemocao)}>{salvando ? 'Removendo...' : 'Remover cotas selecionadas'}</button>
        </section>
      </div>}

      {contribuicaoLivreRemocaoModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) setContribuicaoLivreRemocaoModal(null) }}>
        <section className="contribution-modal delete-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="free-contribution-delete-title">
          <div className="delete-confirmation-icon" aria-hidden="true">!</div>
          <span className="admin-kicker">Remover contribuição</span>
          <h2 id="free-contribution-delete-title">Remover esta contribuição livre?</h2>
          <p>O valor de {moeda.format(contribuicaoLivreRemocaoModal.valor_cota)} será retirado das suas escolhas. Essa ação não poderá ser desfeita.</p>
          <div className="delete-confirmation-actions">
            <button className="button button-quiet" type="button" disabled={salvando} onClick={() => setContribuicaoLivreRemocaoModal(null)}>Cancelar</button>
            <button className="button button-danger" type="button" disabled={salvando} onClick={() => void removerContribuicaoLivre(contribuicaoLivreRemocaoModal)}>{salvando ? 'Removendo...' : 'Remover contribuição'}</button>
          </div>
        </section>
      </div>}
    </main>
  )
}

export default PresentesPage