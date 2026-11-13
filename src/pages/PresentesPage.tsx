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

type PagamentoCotasModal =
  | { tipo: 'presente'; presente: Presente; quantidade: number }
  | { tipo: 'livre'; contribuicao: ContribuicaoLivre }

type PresentesPageProps = {
  onHome: () => void
  onLogout: () => void
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const valorMinimoContribuicaoLivre = 100

function PresentesPage({ onHome, onLogout }: PresentesPageProps) {
  const [convidadoId, setConvidadoId] = useState<string | null>(null)
  const [presentes, setPresentes] = useState<Presente[]>([])
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([])
  const [contribuicoesLivres, setContribuicoesLivres] = useState<ContribuicaoLivre[]>([])
  const [presenteModal, setPresenteModal] = useState<Presente | null>(null)
  const [pagamentoCotasModal, setPagamentoCotasModal] = useState<PagamentoCotasModal | null>(null)
  const [confirmacaoCompra, setConfirmacaoCompra] = useState<PagamentoCotasModal | null>(null)
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
  const [buscaPresente, setBuscaPresente] = useState('')

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
    setPagamentoCotasModal(null)
    setConfirmacaoCompra(null)
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

  function abrirPagamentoCotas(presente: Presente, quantidade: number) {
    setPagamentoCotasModal({ tipo: 'presente', presente, quantidade })
    setErro(null)
  }

  function abrirPagamentoContribuicaoLivre(contribuicao: ContribuicaoLivre) {
    setPagamentoCotasModal({ tipo: 'livre', contribuicao })
    setErro(null)
  }

  function textoNormalizado(texto: string) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
  }

  async function salvarQuantidade(presente: Presente, quantidade: number) {
    if (!convidadoId) return false
    const atuais = contribuicoes.filter((item) => item.presente_id === presente.id)
    const diferenca = quantidade - atuais.length
    if (diferenca < 0) {
      setErro('Para remover cotas, use o botão "Remover cotas".')
      return false
    }
    if (!presente.visivel && diferenca > 0) {
      setErro('Este presente não está mais recebendo novas cotas.')
      return false
    }
    setSalvando(true)
    setErro(null)
    let saveError: { message: string } | null = null
    let novasContribuicoes: Contribuicao[] = []

    if (diferenca > 0) {
      const { data, error } = await supabase.from('contribuicoes').insert(
        Array.from({ length: diferenca }, () => ({ presente_id: presente.id, convidado_id: convidadoId })),
      ).select('id, presente_id, confirmado')
      saveError = error
      novasContribuicoes = (data ?? []) as Contribuicao[]
    } else if (diferenca < 0) {
      const idsParaRemover = atuais.slice(0, Math.abs(diferenca)).map((item) => item.id)
      const result = await supabase.from('contribuicoes').delete().in('id', idsParaRemover)
      saveError = result.error
    }

    if (saveError) {
      setErro(saveError.message)
    } else {
      const idsRemovidos = diferenca < 0 ? atuais.slice(0, Math.abs(diferenca)).map((item) => item.id) : []
      setContribuicoes((todos) => [
        ...todos.filter((item) => !idsRemovidos.includes(item.id)),
        ...novasContribuicoes,
      ])
      setMensagem('Suas cotas foram registradas com carinho.')
      setPresenteModal(null)
      setQuantidadeModal(1)
    }
    setSalvando(false)
    return !saveError
  }

  async function escolherPresente() {
    if (!presenteModal) return
    const quantidade = Math.floor(Number(quantidadeModal))
    if (!Number.isFinite(quantidade) || quantidade < 1) {
      setErro('Informe pelo menos uma cota.')
      return
    }
    const salvou = await salvarQuantidade(presenteModal, quantidade)
    if (salvou) abrirPagamentoCotas(presenteModal, quantidade)
  }

  async function comprarPresenteTodo() {
    if (!presenteModal) return
    const quantidadeTotal = Math.ceil(presenteModal.valor / presenteModal.valor_cota)
    setQuantidadeModal(quantidadeTotal)
    const salvou = await salvarQuantidade(presenteModal, quantidadeTotal)
    if (salvou) abrirPagamentoCotas(presenteModal, quantidadeTotal)
  }

  function confirmarPagamento() {
    if (!pagamentoCotasModal) return
    setPagamentoCotasModal(null)
    setConfirmacaoCompra(pagamentoCotasModal)
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
    if (!Number.isFinite(valor) || valor < valorMinimoContribuicaoLivre) {
      setErro(`Informe um valor válido de pelo menos ${moeda.format(valorMinimoContribuicaoLivre)}.`)
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
      const contribuicao = data as ContribuicaoLivre
      setContribuicoesLivres((atuais) => [contribuicao, ...atuais])
      setMensagem('Sua contribuição foi registrada com carinho.')
      fecharModal()
      abrirPagamentoContribuicaoLivre(contribuicao)
    }
    setSalvando(false)
  }

  if (carregando) return <main className="guest-shell"><p className="guest-status">Carregando sua lista...</p></main>

  const presentesVisiveis = presentes.filter((presente) => {
    const jaEscolhido = contribuicoes.some((item) => item.presente_id === presente.id)
    return (presente.visivel || jaEscolhido) && textoNormalizado(presente.nome).includes(textoNormalizado(buscaPresente))
  })
  const valorLivreNumerico = Number(valorLivre.replace(',', '.'))
  const valorLivreInvalido = valorLivre.trim() !== '' && (!Number.isFinite(valorLivreNumerico) || valorLivreNumerico < valorMinimoContribuicaoLivre)

  return (
    <main className="guest-shell">
      <header className="guest-header guest-header-with-actions">
        <div>
          <span className="admin-kicker">Lista de presentes</span>
          <h1>Um carinho para começar a nossa casa.</h1>
          <p>Para facilitar, dividimos nossos presentes em cotas. Você pode presentear com uma ou mais cotas (ou até o item completo, se desejar!), sinta-se livre para escolher o que for melhor.</p>
        </div>
        <div className="guest-header-actions"><button className="button button-quiet" type="button" onClick={onHome}>Início</button><button className="button button-quiet" type="button" onClick={onLogout}>Sair</button></div>
      </header>

      {(erro || mensagem) && <div className={erro ? 'guest-alert' : 'guest-success'} role="status">{erro ?? mensagem}</div>}

      <section className="guest-section">
        <div className="guest-section-heading">
          <div><span className="admin-kicker">Lista de presentes</span><h2>Escolha como nos abençoar</h2></div>
          <span>{presentesVisiveis.length} opções</span>
        </div>
        <label className="list-search guest-gift-search"><span>Pesquisar presentes</span><input type="search" aria-label="Pesquisar presentes por nome" value={buscaPresente} onChange={(event) => setBuscaPresente(event.target.value)} placeholder="Nome do presente" /></label>
        <div className="guest-gifts">
          {presentesVisiveis.map((presente) => {
            return <article className="guest-gift" key={presente.id}>
              {presente.imagem_url ? <img src={presente.imagem_url} alt="" /> : <div className="gift-placeholder">P</div>}
              <div className="guest-gift-details"><div className="guest-gift-copy"><h3>{presente.nome}</h3><p>{moeda.format(presente.valor_cota)} por cota · {moeda.format(presente.valor)} total</p></div><button type="button" disabled={salvando} onClick={() => abrirPresente(presente)}>{presente.visivel ? 'Ver presente' : 'Cotas encerradas'}</button></div>
            </article>
          })}
          {!presentesVisiveis.length && <p className="empty-state">Nenhum presente encontrado.</p>}
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
            return <article className="my-contribution" key={contribuicao.id}><div><strong>{presente.nome}</strong><span>{quantidade} {quantidade === 1 ? 'cota' : 'cotas'} · {moeda.format(quantidade * presente.valor_cota)}{cotasConfirmadas ? ` · ${cotasConfirmadas} confirmada${cotasConfirmadas === 1 ? '' : 's'}` : ''}</span></div><div className="my-contribution-actions"><button className="pay-contributions-button" type="button" disabled={salvando} onClick={() => abrirPagamentoCotas(presente, quantidade)}>Pagar as cotas</button>{cotasNaoConfirmadas ? <button type="button" disabled={salvando} onClick={() => { setPresenteRemocaoModal(presente); setQuantidadeRemocao(1); setErro(null) }}>Remover cotas</button> : <span className="confirmed-contribution-label">Cotas confirmadas</span>}</div></article>
          })}
          {contribuicoesLivres.map((contribuicao) => <article className="my-contribution" key={contribuicao.id}><div><strong>Contribuição livre</strong><span>{moeda.format(contribuicao.valor_cota)}{contribuicao.confirmado ? ' · Confirmada' : ' · Aguardando confirmação'}</span></div>{contribuicao.confirmado ? <span className="confirmed-contribution-label">Valor confirmado</span> : <div className="my-contribution-actions"><button className="pay-contributions-button" type="button" disabled={salvando} onClick={() => abrirPagamentoContribuicaoLivre(contribuicao)}>Pagar a contribuição</button><button type="button" disabled={salvando} onClick={() => { setContribuicaoLivreRemocaoModal(contribuicao); setErro(null) }}>Remover contribuição</button></div>}</article>)}
          {!contribuicoes.length && !contribuicoesLivres.length && <p className="empty-state">Seu carrinho de carinho está vazio por enquanto.</p>}
        </div>
      </section>

      <section className="guest-section guest-free-form">
        <div><span className="admin-kicker">Contribuição livre</span><h2>Quer presentear com outro valor?</h2><p>Se preferir definir o valor da sua contribuição com toda a liberdade, fique super à vontade. Cada gesto de carinho é especial para nós!</p></div>
        <button className="button button-primary" type="button" onClick={() => { setModalLivre(true); setMensagem(null); setErro(null) }}>Escolher meu valor</button>
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
              <input id="valor-livre" className={valorLivreInvalido ? 'input-invalid' : undefined} inputMode="decimal" min={valorMinimoContribuicaoLivre} step="0.01" aria-describedby="valor-livre-hint" value={valorLivre} onChange={(event) => setValorLivre(event.target.value)} placeholder="100,00" autoFocus />
              <p id="valor-livre-hint" className={valorLivreInvalido ? 'contribution-field-hint contribution-field-error' : 'contribution-field-hint'}>O valor mínimo é {moeda.format(valorMinimoContribuicaoLivre)}.</p>
              <button className="button button-primary modal-action" type="submit" disabled={salvando || !valorLivre.trim()}>{salvando ? 'Registrando...' : 'Confirmar contribuição'}</button>
            </form>
          </>}
        </section>
      </div>}

      {pagamentoCotasModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) fecharModal() }}>
        <section className="contribution-modal gift-payment-modal" role="dialog" aria-modal="true" aria-labelledby="gift-payment-title">
          <button className="modal-close" type="button" aria-label="Fechar" disabled={salvando} onClick={fecharModal}>×</button>
          <span className="admin-kicker">{pagamentoCotasModal.tipo === 'presente' ? 'Pagamento das cotas' : 'Pagamento da contribuição'}</span>
          <h2 id="gift-payment-title">Que bom que você pretende participar da nossa história!</h2>
          <p>Para isso, esses são os meios de pagamento das cotas:</p>
          <ul className="gift-payment-options">
            <li>Envie um pix no valor {pagamentoCotasModal.tipo === 'presente' ? 'total de ' : 'de '}<strong>{moeda.format(pagamentoCotasModal.tipo === 'presente' ? pagamentoCotasModal.quantidade * pagamentoCotasModal.presente.valor_cota : pagamentoCotasModal.contribuicao.valor_cota)}</strong> para a chave <strong>84999372625</strong> no nome de Jéssica Letícia.</li>
            <li>Caso esteja comprando o presente inteiro, você pode levá-lo no casamento ou entregar aos noivos entrando em contato!</li>
            <li>Caso queira pagar com crédito, entre em contato com Jéssica por meio do contato: <strong><a href='https://wa.me/5584991858272'>84991858272</a></strong>.</li>
          </ul>
          <button className="button button-primary modal-action" type="button" onClick={confirmarPagamento}>OK, entendi!</button>
        </section>
      </div>}

      {confirmacaoCompra && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) fecharModal() }}>
        <section className="contribution-modal gift-purchase-confirmation" role="dialog" aria-modal="true" aria-labelledby="purchase-confirmation-title">
          <button className="modal-close" type="button" aria-label="Fechar" disabled={salvando} onClick={fecharModal}>×</button>
          <div className="gift-purchase-confirmation-mark" aria-hidden="true">♥</div>
          <span className="admin-kicker">Um gesto muito especial</span>
          <h2 id="purchase-confirmation-title">Obrigado pelo carinho!</h2>
          <p className="gift-purchase-confirmation-message">Muito obrigado(a) pelo carinho!<br />Seu presente já faz parte do nosso sonho e do início da nossa vida juntos. Saber que temos o seu apoio deixa tudo ainda mais especial. Mal podemos esperar para te dar um abraço bem apertado no nosso grande dia!</p>
          <p className="gift-purchase-summary">{confirmacaoCompra.tipo === 'presente' ? `${confirmacaoCompra.quantidade} ${confirmacaoCompra.quantidade === 1 ? 'cota' : 'cotas'} de ${confirmacaoCompra.presente.nome}` : `Contribuição livre de ${moeda.format(confirmacaoCompra.contribuicao.valor_cota)}`}</p>
          <div className="gift-purchase-confirmation-actions">
            <button className="button button-primary" type="button" onClick={fecharModal}>Voltar</button>
          </div>
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