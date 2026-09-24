import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { alterarCodigoConvidado, criarConvidado, verCodigoConvidado } from '../api/auth'
import '../App.css'

type Tab = 'convidados' | 'companhias' | 'presentes' | 'contribuicoes'

type Convidado = {
  id: string
  nome: string
  confirmacao_presenca: boolean | null
}

type Companhia = {
  id: string
  nome: string
  convidado_id: string
  confirmacao_presenca: boolean | null
}

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
  convidado_id: string
  presente_id: string
  confirmado: boolean
  created_at: string
}

type ContribuicaoLivre = {
  id: string
  convidado_id: string
  valor_cota: number
  confirmado: boolean
  created_at: string
}

type ExclusaoPendente = {
  tabela: 'convidados' | 'companhias' | 'presentes'
  id: string
  nome: string
  tipo: string
}

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function AdminPage() {
  const [aba, setAba] = useState<Tab>('convidados')
  const [convidados, setConvidados] = useState<Convidado[]>([])
  const [companhias, setCompanhias] = useState<Companhia[]>([])
  const [presentes, setPresentes] = useState<Presente[]>([])
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([])
  const [contribuicoesLivres, setContribuicoesLivres] = useState<ContribuicaoLivre[]>([])
  const [convidadoContribuicoes, setConvidadoContribuicoes] = useState<string | null>(null)
  const [convidadoEditando, setConvidadoEditando] = useState<string | null>(null)
  const [companhiaEditando, setCompanhiaEditando] = useState<string | null>(null)
  const [presenteEditando, setPresenteEditando] = useState<string | null>(null)
  const [presenteSelecionado, setPresenteSelecionado] = useState<Presente | null>(null)
  const [exclusaoPendente, setExclusaoPendente] = useState<ExclusaoPendente | null>(null)
  const [nomeConvidado, setNomeConvidado] = useState('')
  const [codigoConvidado, setCodigoConvidado] = useState('')
  const [nomeCompanhia, setNomeCompanhia] = useState('')
  const [convidadoDaCompanhia, setConvidadoDaCompanhia] = useState('')
  const [nomePresente, setNomePresente] = useState('')
  const [descricaoPresente, setDescricaoPresente] = useState('')
  const [valorPresente, setValorPresente] = useState('')
  const [valorCotaPresente, setValorCotaPresente] = useState('')
  const [imagemPresente, setImagemPresente] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [consultandoCodigo, setConsultandoCodigo] = useState(false)
  const [codigoVisivel, setCodigoVisivel] = useState<{ id: string; code: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function carregarDados() {
    const [convidadosResult, companhiasResult, presentesResult, contribuicoesResult, livresResult] = await Promise.all([
      supabase
        .from('convidados')
        .select('id, nome, confirmacao_presenca')
        .order('nome'),
      supabase
        .from('companhias')
        .select('id, nome, convidado_id, confirmacao_presenca')
        .order('nome'),
      supabase
        .from('presentes')
        .select('id, nome, descricao, valor, valor_cota, imagem_url, visivel')
        .order('nome'),
      supabase
        .from('contribuicoes')
        .select('id, convidado_id, presente_id, confirmado, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('contribuicoes_livres')
        .select('id, convidado_id, valor_cota, confirmado, created_at')
        .order('created_at', { ascending: false }),
    ])

    const resultadoComErro = [convidadosResult, companhiasResult, presentesResult, contribuicoesResult, livresResult].find(
      (resultado) => resultado.error,
    )

    if (resultadoComErro?.error) {
      setErro(resultadoComErro.error.message)
    } else {
      setConvidados((convidadosResult.data ?? []) as Convidado[])
      setCompanhias((companhiasResult.data ?? []) as Companhia[])
      setPresentes((presentesResult.data ?? []) as Presente[])
      setContribuicoes((contribuicoesResult.data ?? []) as Contribuicao[])
      setContribuicoesLivres((livresResult.data ?? []) as ContribuicaoLivre[])
    }

    setCarregando(false)
  }

  useEffect(() => {
    const carregarInicialmente = async () => {
      await Promise.resolve()
      void carregarDados()
    }

    void carregarInicialmente()
  }, [])

  function limparFormularios() {
    setConvidadoEditando(null)
    setCompanhiaEditando(null)
    setPresenteEditando(null)
    setPresenteSelecionado(null)
    setNomeConvidado('')
    setCodigoConvidado('')
    setNomeCompanhia('')
    setConvidadoDaCompanhia('')
    setNomePresente('')
    setDescricaoPresente('')
    setValorPresente('')
    setValorCotaPresente('')
    setImagemPresente('')
    setErro(null)
  }

  async function salvarConvidado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nomeConvidado.trim()) return

    setSalvando(true)
    setErro(null)
    let saveError: { message: string } | null = null

    if (convidadoEditando) {
      const result = await supabase
        .from('convidados')
        .update({ nome: nomeConvidado.trim() })
        .eq('id', convidadoEditando)
      saveError = result.error

      if (!saveError && codigoConvidado.trim()) {
        try {
          await alterarCodigoConvidado(convidadoEditando, codigoConvidado.trim())
        } catch (error) {
          saveError = error instanceof Error ? error : { message: 'Não foi possível alterar o código.' }
        }
      }
    } else if (codigoConvidado.trim().length < 6) {
      saveError = { message: 'O código precisa ter pelo menos 6 caracteres.' }
    } else {
      try {
        await criarConvidado(nomeConvidado.trim(), codigoConvidado.trim())
      } catch (error) {
        saveError = error instanceof Error ? error : { message: 'Não foi possível criar o convidado.' }
      }
    }

    if (saveError) setErro(saveError.message)
    else {
      limparFormularios()
      await carregarDados()
    }
    setSalvando(false)
  }

  async function salvarCompanhia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nomeCompanhia.trim() || !convidadoDaCompanhia) return

    setSalvando(true)
    setErro(null)
    const query = companhiaEditando
      ? supabase
          .from('companhias')
          .update({ nome: nomeCompanhia.trim(), convidado_id: convidadoDaCompanhia })
          .eq('id', companhiaEditando)
      : supabase.from('companhias').insert({
          nome: nomeCompanhia.trim(),
          convidado_id: convidadoDaCompanhia,
        })
    const { error: saveError } = await query

    if (saveError) setErro(saveError.message)
    else {
      limparFormularios()
      await carregarDados()
    }
    setSalvando(false)
  }

  async function salvarPresente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const valor = Number(valorPresente.replace(',', '.'))
    const valorCota = Number(valorCotaPresente.replace(',', '.'))
    if (!nomePresente.trim() || !Number.isFinite(valor) || valor < 0 || !Number.isFinite(valorCota) || valorCota <= 0) return

    setSalvando(true)
    setErro(null)
    const dados = {
      nome: nomePresente.trim(),
      descricao: descricaoPresente.trim() || null,
      valor,
      valor_cota: valorCota,
      imagem_url: imagemPresente.trim() || null,
      ...(presenteEditando ? {} : { visivel: true }),
    }
    const query = presenteEditando
      ? supabase.from('presentes').update(dados).eq('id', presenteEditando)
      : supabase.from('presentes').insert(dados)
    const { error: saveError } = await query

    if (saveError) setErro(saveError.message)
    else {
      limparFormularios()
      await carregarDados()
    }
    setSalvando(false)
  }

  function solicitarExclusao(tabela: ExclusaoPendente['tabela'], id: string, nome: string, tipo: string) {
    setExclusaoPendente({ tabela, id, nome, tipo })
  }

  async function confirmarExclusao() {
    if (!exclusaoPendente) return
    const { tabela, id } = exclusaoPendente
    setSalvando(true)
    setErro(null)
    const { error: deleteError } = await supabase.from(tabela).delete().eq('id', id)
    if (deleteError) setErro(deleteError.message)
    else {
      if (tabela === 'presentes') setPresenteSelecionado(null)
      setExclusaoPendente(null)
      await carregarDados()
    }
    setSalvando(false)
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  async function alternarCodigo(convidadoId: string) {
    if (codigoVisivel?.id === convidadoId) {
      setCodigoVisivel(null)
      return
    }

    setConsultandoCodigo(true)
    setErro(null)
    try {
      const code = await verCodigoConvidado(convidadoId)
      setCodigoVisivel({ id: convidadoId, code })
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível recuperar o código.')
    } finally {
      setConsultandoCodigo(false)
    }
  }

  async function alternarConfirmacao(tabela: 'contribuicoes' | 'contribuicoes_livres', id: string, confirmado: boolean) {
    setSalvando(true)
    setErro(null)
    const { error: saveError } = await supabase.from(tabela).update({ confirmado: !confirmado }).eq('id', id)
    if (saveError) setErro(saveError.message)
    else if (tabela === 'contribuicoes') {
      setContribuicoes((atuais) => atuais.map((item) => item.id === id ? { ...item, confirmado: !confirmado } : item))
    } else {
      setContribuicoesLivres((atuais) => atuais.map((item) => item.id === id ? { ...item, confirmado: !confirmado } : item))
    }
    setSalvando(false)
  }

  async function alternarVisibilidade(presente: Presente) {
    setSalvando(true)
    setErro(null)
    const visivel = !presente.visivel
    const { error: saveError } = await supabase.from('presentes').update({ visivel }).eq('id', presente.id)
    if (saveError) setErro(saveError.message)
    else {
      setPresentes((atuais) => atuais.map((item) => item.id === presente.id ? { ...item, visivel } : item))
      setPresenteSelecionado((atual) => atual?.id === presente.id ? { ...atual, visivel } : atual)
    }
    setSalvando(false)
  }

  function nomeDoConvidado(id: string) {
    return convidados.find((convidado) => convidado.id === id)?.nome ?? 'Convidado não encontrado'
  }

  function levarAoFormulario(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function editarConvidado(convidado: Convidado) {
    setAba('convidados')
    setConvidadoEditando(convidado.id)
    setNomeConvidado(convidado.nome)
    levarAoFormulario('form-convidado')
  }

  function editarCompanhia(companhia: Companhia) {
    setAba('companhias')
    setCompanhiaEditando(companhia.id)
    setNomeCompanhia(companhia.nome)
    setConvidadoDaCompanhia(companhia.convidado_id)
    levarAoFormulario('form-companhia')
  }

  function editarPresente(presente: Presente) {
    setAba('presentes')
    setPresenteSelecionado(presente)
    setPresenteEditando(presente.id)
    setNomePresente(presente.nome)
    setDescricaoPresente(presente.descricao ?? '')
    setValorPresente(String(presente.valor))
    setValorCotaPresente(String(presente.valor_cota))
    setImagemPresente(presente.imagem_url ?? '')
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="admin-kicker">Painel protegido</span>
          <h1>Organização do casamento</h1>
          <p>Cadastre convidados, companhias e presentes em um só lugar.</p>
        </div>
        <button className="button button-quiet" type="button" onClick={() => void sair()}>
          Sair
        </button>
      </header>

      <nav className="admin-tabs" aria-label="Seções administrativas">
        <button className={aba === 'convidados' ? 'active' : ''} type="button" onClick={() => setAba('convidados')}>
          Convidados <span>{convidados.length}</span>
        </button>
        <button className={aba === 'companhias' ? 'active' : ''} type="button" onClick={() => setAba('companhias')}>
          Companhias <span>{companhias.length}</span>
        </button>
        <button className={aba === 'presentes' ? 'active' : ''} type="button" onClick={() => setAba('presentes')}>
          Presentes <span>{presentes.length}</span>
        </button>
        <button className={aba === 'contribuicoes' ? 'active' : ''} type="button" onClick={() => setAba('contribuicoes')}>
          Confirmações <span>{convidados.length + companhias.length}</span>
        </button>
      </nav>

      {erro && <div className="admin-alert">{erro}</div>}
      {carregando ? (
        <p className="admin-status">Carregando dados...</p>
      ) : (
        <section className="admin-content">
          {aba === 'convidados' && (
            <div className="cadastro-admin-layout">
              <form className="crud-form" id="form-convidado" onSubmit={salvarConvidado}>
                <div>
                  <span className="admin-kicker">Cadastro</span>
                  <h2>{convidadoEditando ? 'Editar convidado' : 'Novo convidado'}</h2>
                  <p>Crie o convidado e defina o código que será entregue presencialmente.</p>
                </div>
                <label>Nome<input value={nomeConvidado} onChange={(event) => setNomeConvidado(event.target.value)} placeholder="Ex.: Marina e João" /></label>
                {!convidadoEditando && <label>Código de acesso<input value={codigoConvidado} onChange={(event) => setCodigoConvidado(event.target.value)} placeholder="Ex.: CASAMENTO2026" minLength={6} required /><small className="field-help">O código será a senha de acesso do convidado. Anote-o para entregar presencialmente.</small></label>}
                {convidadoEditando && <label>Novo código de acesso (opcional)<input value={codigoConvidado} onChange={(event) => setCodigoConvidado(event.target.value)} placeholder="Deixe vazio para manter o atual" minLength={6} /><small className="field-help">O código atual nunca é exibido. Informe um novo código para substituí-lo.</small></label>}
                <div className="form-actions"><button className="button button-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : convidadoEditando ? 'Salvar alterações' : 'Adicionar'}</button>{convidadoEditando && <button className="button button-quiet" type="button" onClick={limparFormularios}>Cancelar</button>}</div>
              </form>
              <section className="cadastro-list-panel">
                <div className="presentes-list-heading"><div><span className="admin-kicker">Cadastro</span><h2>Convidados cadastrados</h2></div><span>{convidados.length} itens</span></div>
                <div className="admin-list">
                  {convidados.map((convidado) => <article className="admin-row" key={convidado.id}><div><strong>{convidado.nome}</strong><span>{convidado.confirmacao_presenca === null ? 'Aguardando confirmação' : convidado.confirmacao_presenca ? 'Presença confirmada' : 'Não irá comparecer'}</span>{codigoVisivel?.id === convidado.id && <code className="access-code">{codigoVisivel.code}</code>}</div><div className="row-actions"><button type="button" onClick={() => editarConvidado(convidado)}>Editar</button><button type="button" disabled={consultandoCodigo} onClick={() => void alternarCodigo(convidado.id)}>{codigoVisivel?.id === convidado.id ? 'Ocultar código' : 'Ver código'}</button><button type="button" onClick={() => solicitarExclusao('convidados', convidado.id, convidado.nome, 'convidado')}>Excluir</button></div></article>)}
                  {!convidados.length && <p className="empty-state">Nenhum convidado cadastrado.</p>}
                </div>
              </section>
            </div>
          )}

          {aba === 'companhias' && (
            <div className="cadastro-admin-layout">
              <form className="crud-form" id="form-companhia" onSubmit={salvarCompanhia}>
                <div><span className="admin-kicker">Cadastro</span><h2>{companhiaEditando ? 'Editar companhia' : 'Nova companhia'}</h2><p>Associe cada companhia ao convidado responsável pelo acesso.</p></div>
                <label>Nome<input value={nomeCompanhia} onChange={(event) => setNomeCompanhia(event.target.value)} placeholder="Ex.: Pedro" /></label>
                <label>Convidado responsável<select value={convidadoDaCompanhia} onChange={(event) => setConvidadoDaCompanhia(event.target.value)}><option value="">Selecione um convidado</option>{convidados.map((convidado) => <option value={convidado.id} key={convidado.id}>{convidado.nome}</option>)}</select></label>
                <div className="form-actions"><button className="button button-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : companhiaEditando ? 'Salvar alterações' : 'Adicionar'}</button>{companhiaEditando && <button className="button button-quiet" type="button" onClick={limparFormularios}>Cancelar</button>}</div>
              </form>
              <section className="cadastro-list-panel">
                <div className="presentes-list-heading"><div><span className="admin-kicker">Cadastro</span><h2>Companhias cadastradas</h2></div><span>{companhias.length} itens</span></div>
                <div className="admin-list">
                  {companhias.map((companhia) => <article className="admin-row" key={companhia.id}><div><strong>{companhia.nome}</strong><span>Com {nomeDoConvidado(companhia.convidado_id)}</span></div><div className="row-actions"><button type="button" onClick={() => editarCompanhia(companhia)}>Editar</button><button type="button" onClick={() => solicitarExclusao('companhias', companhia.id, companhia.nome, 'companhia')}>Excluir</button></div></article>)}
                  {!companhias.length && <p className="empty-state">Nenhuma companhia cadastrada.</p>}
                </div>
              </section>
            </div>
          )}

          {aba === 'presentes' && (
            <div className="presentes-admin-layout">
              <form className="crud-form" onSubmit={salvarPresente}>
                <div>
                  <span className="admin-kicker">Cadastro</span>
                  <h2>Novo presente</h2>
                  <p>Defina o valor total do presente, o preço de cada cota e uma imagem opcional.</p>
                </div>
                <label>
                  Nome
                  <input value={nomePresente} onChange={(event) => setNomePresente(event.target.value)} placeholder="Ex.: Jogo de cama" />
                </label>
                <label>
                  Descrição
                  <textarea value={descricaoPresente} onChange={(event) => setDescricaoPresente(event.target.value)} placeholder="Conte um pouco sobre este presente" rows={4} />
                </label>
                <label>
                  Valor total do presente
                  <input inputMode="decimal" value={valorPresente} onChange={(event) => setValorPresente(event.target.value)} placeholder="0,00" />
                </label>
                <label>
                  Valor da cota
                  <input inputMode="decimal" value={valorCotaPresente} onChange={(event) => setValorCotaPresente(event.target.value)} placeholder="0,00" />
                </label>
                <label>
                  URL da imagem
                  <input type="url" value={imagemPresente} onChange={(event) => setImagemPresente(event.target.value)} placeholder="https://..." />
                </label>
                <div className="form-actions">
                  <button className="button button-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Adicionar'}</button>
                </div>
              </form>
              <section className="presentes-list-panel">
                <div className="presentes-list-heading">
                  <div><span className="admin-kicker">Catálogo</span><h2>Presentes cadastrados</h2></div>
                  <span>{presentes.length} itens</span>
                </div>
                <div className="admin-list">
                  {presentes.map((presente) => (
                    <article className="admin-row" key={presente.id}>
                      <div className="gift-list-item">
                        {presente.imagem_url ? <img src={presente.imagem_url} alt={`Foto de ${presente.nome}`} /> : <div className="gift-placeholder" aria-hidden="true">P</div>}
                        <div>
                          <strong>{presente.nome}</strong>
                          <span>{presente.visivel ? 'Visível para convidados' : 'Oculto para convidados'}</span>
                        </div>
                      </div>
                      <div className="row-actions">
                        <button type="button" onClick={() => setPresenteSelecionado(presente)}>Ver</button>
                      </div>
                    </article>
                  ))}
                  {!presentes.length && <p className="empty-state">Nenhum presente cadastrado.</p>}
                </div>
              </section>
            </div>
          )}

          {aba === 'contribuicoes' && (
            <section className="confirmation-section">
              <PresenceConfirmationTables convidados={convidados} companhias={companhias} nomeDoConvidado={nomeDoConvidado} />
              <div className="section-intro">
                <span className="admin-kicker">Recebimentos</span>
                <h2>Confirme o que já chegou</h2>
                <p>Escolha um convidado para conferir cada contribuição e marcar manualmente os valores recebidos.</p>
              </div>
              <div className="admin-list">
                {convidados.map((convidado) => {
                  const cotas = contribuicoes.filter((item) => item.convidado_id === convidado.id)
                  const livres = contribuicoesLivres.filter((item) => item.convidado_id === convidado.id)
                  return <button className="admin-row confirmation-row" type="button" key={convidado.id} onClick={() => setConvidadoContribuicoes(convidado.id)}>
                    <span><strong>{convidado.nome}</strong><span>{cotas.length + livres.length} {cotas.length + livres.length === 1 ? 'contribuição' : 'contribuições'}</span></span>
                    <span className="confirmation-summary">{moeda.format(cotas.reduce((total, item) => total + (presentes.find((presente) => presente.id === item.presente_id)?.valor_cota ?? 0), 0) + livres.reduce((total, item) => total + item.valor_cota, 0))} <b>→</b></span>
                  </button>
                })}
                {!convidados.length && <p className="empty-state">Nenhum convidado cadastrado.</p>}
              </div>
            </section>
          )}
        </section>
      )}

      {presenteSelecionado && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setPresenteSelecionado(null); setPresenteEditando(null) } }}>
        <section className="contribution-modal gift-admin-modal" role="dialog" aria-modal="true" aria-labelledby="gift-modal-title">
          <button className="modal-close" type="button" aria-label="Fechar" onClick={() => { setPresenteSelecionado(null); setPresenteEditando(null) }}>×</button>
          {presenteEditando ? <>
            <span className="admin-kicker">Editar presente</span>
            {presenteSelecionado.imagem_url ? <img className="gift-modal-image" src={presenteSelecionado.imagem_url} alt={`Foto de ${presenteSelecionado.nome}`} /> : <div className="gift-modal-placeholder" aria-hidden="true">P</div>}
            <h2 id="gift-modal-title">{presenteSelecionado.nome}</h2>
            <form className="gift-edit-form" onSubmit={salvarPresente}>
              <label>Nome<input value={nomePresente} onChange={(event) => setNomePresente(event.target.value)} /></label>
              <label>Descrição<textarea value={descricaoPresente} onChange={(event) => setDescricaoPresente(event.target.value)} rows={3} /></label>
              <label>Valor total<input inputMode="decimal" value={valorPresente} onChange={(event) => setValorPresente(event.target.value)} /></label>
              <label>Valor da cota<input inputMode="decimal" value={valorCotaPresente} onChange={(event) => setValorCotaPresente(event.target.value)} /></label>
              <label>URL da imagem<input type="url" value={imagemPresente} onChange={(event) => setImagemPresente(event.target.value)} /></label>
              <div className="form-actions"><button className="button button-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button><button className="button button-quiet" type="button" onClick={() => setPresenteEditando(null)}>Cancelar</button></div>
            </form>
          </> : <>
            <span className="admin-kicker">Detalhes do presente</span>
            {presenteSelecionado.imagem_url ? <img className="gift-modal-image" src={presenteSelecionado.imagem_url} alt={`Foto de ${presenteSelecionado.nome}`} /> : <div className="gift-modal-placeholder" aria-hidden="true">P</div>}
            <h2 id="gift-modal-title">{presenteSelecionado.nome}</h2>
            {presenteSelecionado.descricao && <p>{presenteSelecionado.descricao}</p>}
            <div className="gift-admin-summary">
              <div><span>Valor total</span><strong>{moeda.format(presenteSelecionado.valor)}</strong></div>
              <div><span>Valor estimado</span><strong>{moeda.format(contribuicoes.filter((item) => item.presente_id === presenteSelecionado.id).length * presenteSelecionado.valor_cota)}</strong></div>
              <div><span>Confirmado</span><strong>{moeda.format(contribuicoes.filter((item) => item.presente_id === presenteSelecionado.id && item.confirmado).length * presenteSelecionado.valor_cota)}</strong></div>
            </div>
            <p className="gift-visibility-status">{presenteSelecionado.visivel ? 'Visível para convidados e recebendo novas cotas.' : 'Oculto para convidados e sem novas cotas.'}</p>
            <div className="gift-modal-actions">
              <button className="button button-primary" type="button" onClick={() => editarPresente(presenteSelecionado)}>Editar</button>
              <button className="button button-quiet" type="button" disabled={salvando} onClick={() => void alternarVisibilidade(presenteSelecionado)}>{presenteSelecionado.visivel ? 'Ocultar' : 'Exibir'}</button>
              <button className="button button-danger" type="button" onClick={() => solicitarExclusao('presentes', presenteSelecionado.id, presenteSelecionado.nome, 'presente')}>Excluir</button>
            </div>
          </>}
        </section>
      </div>}

      {exclusaoPendente && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !salvando) setExclusaoPendente(null) }}>
        <section className="contribution-modal delete-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="delete-confirmation-icon" aria-hidden="true">!</div>
          <span className="admin-kicker">Excluir {exclusaoPendente.tipo}</span>
          <h2 id="delete-title">Excluir “{exclusaoPendente.nome}”?</h2>
          <p>Essa ação não poderá ser desfeita e os dados relacionados também poderão ser removidos.</p>
          <div className="delete-confirmation-actions">
            <button className="button button-quiet" type="button" disabled={salvando} onClick={() => setExclusaoPendente(null)}>Cancelar</button>
            <button className="button button-danger" type="button" disabled={salvando} onClick={() => void confirmarExclusao()}>{salvando ? 'Excluindo...' : 'Excluir definitivamente'}</button>
          </div>
        </section>
      </div>}

      {convidadoContribuicoes && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConvidadoContribuicoes(null) }}>
        <section className="contribution-modal admin-contributions-modal" role="dialog" aria-modal="true" aria-labelledby="contributions-title">
          <button className="modal-close" type="button" aria-label="Fechar" onClick={() => setConvidadoContribuicoes(null)}>×</button>
          <span className="admin-kicker">Contribuições</span>
          <h2 id="contributions-title">{nomeDoConvidado(convidadoContribuicoes)}</h2>
          <div className="admin-contribution-list">
            {contribuicoes.filter((item) => item.convidado_id === convidadoContribuicoes).map((item) => {
              const presente = presentes.find((registro) => registro.id === item.presente_id)
              return <div className="admin-contribution-item" key={item.id}><div><strong>{presente?.nome ?? 'Presente removido'}</strong><span>{moeda.format(presente?.valor_cota ?? 0)} · {new Date(item.created_at).toLocaleDateString('pt-BR')}</span></div><button type="button" disabled={salvando} onClick={() => void alternarConfirmacao('contribuicoes', item.id, item.confirmado)}>{item.confirmado ? 'Confirmada' : 'Não confirmada'}</button></div>
            })}
            {contribuicoesLivres.filter((item) => item.convidado_id === convidadoContribuicoes).map((item) => <div className="admin-contribution-item" key={item.id}><div><strong>Contribuição livre</strong><span>{moeda.format(item.valor_cota)} · {new Date(item.created_at).toLocaleDateString('pt-BR')}</span></div><button type="button" disabled={salvando} onClick={() => void alternarConfirmacao('contribuicoes_livres', item.id, item.confirmado)}>{item.confirmado ? 'Confirmada' : 'Não confirmada'}</button></div>)}
            {!contribuicoes.some((item) => item.convidado_id === convidadoContribuicoes) && !contribuicoesLivres.some((item) => item.convidado_id === convidadoContribuicoes) && <p className="empty-state">Este convidado ainda não fez contribuições.</p>}
          </div>
        </section>
      </div>}
    </main>
  )
}

type PresenceConfirmationTablesProps = {
  convidados: Convidado[]
  companhias: Companhia[]
  nomeDoConvidado: (id: string) => string
}

function PresenceConfirmationTables({ convidados, companhias, nomeDoConvidado }: PresenceConfirmationTablesProps) {
  const confirmados = [
    ...convidados.filter((convidado) => convidado.confirmacao_presenca === true).map((convidado) => ({ nome: convidado.nome, tipo: 'Convidado' })),
    ...companhias.filter((companhia) => companhia.confirmacao_presenca === true).map((companhia) => ({ nome: companhia.nome, tipo: `Companhia de ${nomeDoConvidado(companhia.convidado_id)}` })),
  ]
  const naoConfirmados = [
    ...convidados.filter((convidado) => convidado.confirmacao_presenca !== true).map((convidado) => ({ nome: convidado.nome, tipo: 'Convidado' })),
    ...companhias.filter((companhia) => companhia.confirmacao_presenca !== true).map((companhia) => ({ nome: companhia.nome, tipo: `Companhia de ${nomeDoConvidado(companhia.convidado_id)}` })),
  ]

  function tabela(titulo: string, pessoas: { nome: string; tipo: string }[]) {
    return <div className="presence-table-block">
      <div className="presence-table-heading"><h2>{titulo}</h2><span>{pessoas.length}</span></div>
      <div className="presence-table" role="table" aria-label={titulo}>
        <div className="presence-table-row presence-table-header" role="row"><span role="columnheader">Nome</span><span role="columnheader">Tipo</span></div>
        {pessoas.map((pessoa) => <div className="presence-table-row" role="row" key={`${pessoa.tipo}-${pessoa.nome}`}><strong role="cell">{pessoa.nome}</strong><span role="cell">{pessoa.tipo}</span></div>)}
        {!pessoas.length && <p className="empty-state">Nenhuma pessoa nesta tabela.</p>}
      </div>
    </div>
  }

  return <section className="presence-confirmation-section">
    <div className="section-intro">
      <span className="admin-kicker">Presença</span>
      <h2>Confirmações de presença</h2>
      <p>Confira quem já respondeu ao convite e quem ainda não confirmou.</p>
    </div>
    <div className="presence-tables">
      {tabela('Confirmados', confirmados)}
      {tabela('Não confirmados', naoConfirmados)}
    </div>
  </section>
}

export default AdminPage
