import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { alterarCodigoConvidado, criarConvidado, verCodigoConvidado } from '../api/auth'
import '../App.css'

type Tab = 'convidados' | 'companhias' | 'presentes'

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
  valor: number
  imagem_url: string | null
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
  const [convidadoEditando, setConvidadoEditando] = useState<string | null>(null)
  const [companhiaEditando, setCompanhiaEditando] = useState<string | null>(null)
  const [presenteEditando, setPresenteEditando] = useState<string | null>(null)
  const [nomeConvidado, setNomeConvidado] = useState('')
  const [codigoConvidado, setCodigoConvidado] = useState('')
  const [nomeCompanhia, setNomeCompanhia] = useState('')
  const [convidadoDaCompanhia, setConvidadoDaCompanhia] = useState('')
  const [nomePresente, setNomePresente] = useState('')
  const [valorPresente, setValorPresente] = useState('')
  const [imagemPresente, setImagemPresente] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [consultandoCodigo, setConsultandoCodigo] = useState(false)
  const [codigoVisivel, setCodigoVisivel] = useState<{ id: string; code: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function carregarDados() {
    const [convidadosResult, companhiasResult, presentesResult] = await Promise.all([
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
        .select('id, nome, valor, imagem_url')
        .order('nome'),
    ])

    const resultadoComErro = [convidadosResult, companhiasResult, presentesResult].find(
      (resultado) => resultado.error,
    )

    if (resultadoComErro?.error) {
      setErro(resultadoComErro.error.message)
    } else {
      setConvidados((convidadosResult.data ?? []) as Convidado[])
      setCompanhias((companhiasResult.data ?? []) as Companhia[])
      setPresentes((presentesResult.data ?? []) as Presente[])
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
    setNomeConvidado('')
    setCodigoConvidado('')
    setNomeCompanhia('')
    setConvidadoDaCompanhia('')
    setNomePresente('')
    setValorPresente('')
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
    if (!nomePresente.trim() || !Number.isFinite(valor) || valor < 0) return

    setSalvando(true)
    setErro(null)
    const dados = {
      nome: nomePresente.trim(),
      valor,
      imagem_url: imagemPresente.trim() || null,
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

  async function excluir(tabela: 'convidados' | 'companhias' | 'presentes', id: string) {
    if (!window.confirm('Excluir este registro?')) return
    const { error: deleteError } = await supabase.from(tabela).delete().eq('id', id)
    if (deleteError) setErro(deleteError.message)
    else await carregarDados()
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

  function nomeDoConvidado(id: string) {
    return convidados.find((convidado) => convidado.id === id)?.nome ?? 'Convidado não encontrado'
  }

  function editarConvidado(convidado: Convidado) {
    setAba('convidados')
    setConvidadoEditando(convidado.id)
    setNomeConvidado(convidado.nome)
  }

  function editarCompanhia(companhia: Companhia) {
    setAba('companhias')
    setCompanhiaEditando(companhia.id)
    setNomeCompanhia(companhia.nome)
    setConvidadoDaCompanhia(companhia.convidado_id)
  }

  function editarPresente(presente: Presente) {
    setAba('presentes')
    setPresenteEditando(presente.id)
    setNomePresente(presente.nome)
    setValorPresente(String(presente.valor))
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
      </nav>

      {erro && <div className="admin-alert">{erro}</div>}
      {carregando ? (
        <p className="admin-status">Carregando dados...</p>
      ) : (
        <section className="admin-content">
          {aba === 'convidados' && (
            <CrudSection
              title={convidadoEditando ? 'Editar convidado' : 'Novo convidado'}
              description="Crie o convidado e defina o código que será entregue presencialmente."
              onSubmit={salvarConvidado}
              onCancel={limparFormularios}
              editing={Boolean(convidadoEditando)}
              saving={salvando}
            >
              <label>
                Nome
                <input value={nomeConvidado} onChange={(event) => setNomeConvidado(event.target.value)} placeholder="Ex.: Marina e João" />
              </label>
              {!convidadoEditando && (
                <label>
                  Código de acesso
                  <input
                    value={codigoConvidado}
                    onChange={(event) => setCodigoConvidado(event.target.value)}
                    placeholder="Ex.: CASAMENTO2026"
                    minLength={6}
                    required
                  />
                  <small className="field-help">O código será a senha de acesso do convidado. Anote-o para entregar presencialmente.</small>
                </label>
              )}
              {convidadoEditando && (
                <label>
                  Novo código de acesso (opcional)
                  <input
                    value={codigoConvidado}
                    onChange={(event) => setCodigoConvidado(event.target.value)}
                    placeholder="Deixe vazio para manter o atual"
                    minLength={6}
                  />
                  <small className="field-help">O código atual nunca é exibido. Informe um novo código para substituí-lo.</small>
                </label>
              )}
              <div className="admin-list">
                {convidados.map((convidado) => (
                  <article className="admin-row" key={convidado.id}>
                    <div>
                      <strong>{convidado.nome}</strong>
                      <span>{convidado.confirmacao_presenca === null ? 'Aguardando confirmação' : convidado.confirmacao_presenca ? 'Presença confirmada' : 'Não irá comparecer'}</span>
                      {codigoVisivel?.id === convidado.id && <code className="access-code">{codigoVisivel.code}</code>}
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => editarConvidado(convidado)}>Editar</button>
                      <button type="button" disabled={consultandoCodigo} onClick={() => void alternarCodigo(convidado.id)}>
                        {codigoVisivel?.id === convidado.id ? 'Ocultar código' : 'Ver código'}
                      </button>
                      <button type="button" onClick={() => void excluir('convidados', convidado.id)}>Excluir</button>
                    </div>
                  </article>
                ))}
              </div>
            </CrudSection>
          )}

          {aba === 'companhias' && (
            <CrudSection
              title={companhiaEditando ? 'Editar companhia' : 'Nova companhia'}
              description="Associe cada companhia ao convidado responsável pelo acesso."
              onSubmit={salvarCompanhia}
              onCancel={limparFormularios}
              editing={Boolean(companhiaEditando)}
              saving={salvando}
            >
              <label>
                Nome
                <input value={nomeCompanhia} onChange={(event) => setNomeCompanhia(event.target.value)} placeholder="Ex.: Pedro" />
              </label>
              <label>
                Convidado responsável
                <select value={convidadoDaCompanhia} onChange={(event) => setConvidadoDaCompanhia(event.target.value)}>
                  <option value="">Selecione um convidado</option>
                  {convidados.map((convidado) => <option value={convidado.id} key={convidado.id}>{convidado.nome}</option>)}
                </select>
              </label>
              <div className="admin-list">
                {companhias.map((companhia) => (
                  <article className="admin-row" key={companhia.id}>
                    <div>
                      <strong>{companhia.nome}</strong>
                      <span>Com {nomeDoConvidado(companhia.convidado_id)}</span>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => editarCompanhia(companhia)}>Editar</button>
                      <button type="button" onClick={() => void excluir('companhias', companhia.id)}>Excluir</button>
                    </div>
                  </article>
                ))}
              </div>
            </CrudSection>
          )}

          {aba === 'presentes' && (
            <CrudSection
              title={presenteEditando ? 'Editar presente' : 'Novo presente'}
              description="Defina o item, o valor e uma imagem opcional para a lista."
              onSubmit={salvarPresente}
              onCancel={limparFormularios}
              editing={Boolean(presenteEditando)}
              saving={salvando}
            >
              <label>
                Nome
                <input value={nomePresente} onChange={(event) => setNomePresente(event.target.value)} placeholder="Ex.: Jogo de cama" />
              </label>
              <label>
                Valor
                <input inputMode="decimal" value={valorPresente} onChange={(event) => setValorPresente(event.target.value)} placeholder="0,00" />
              </label>
              <label>
                URL da imagem
                <input type="url" value={imagemPresente} onChange={(event) => setImagemPresente(event.target.value)} placeholder="https://..." />
              </label>
              <div className="admin-list">
                {presentes.map((presente) => (
                  <article className="admin-row" key={presente.id}>
                    <div className="gift-row">
                      {presente.imagem_url ? <img src={presente.imagem_url} alt="" /> : <div className="gift-placeholder">P</div>}
                      <div>
                        <strong>{presente.nome}</strong>
                        <span>{moeda.format(presente.valor)}</span>
                      </div>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => editarPresente(presente)}>Editar</button>
                      <button type="button" onClick={() => void excluir('presentes', presente.id)}>Excluir</button>
                    </div>
                  </article>
                ))}
              </div>
            </CrudSection>
          )}
        </section>
      )}
    </main>
  )
}

type CrudSectionProps = {
  title: string
  description: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  editing: boolean
  saving: boolean
  children: React.ReactNode
}

function CrudSection({ title, description, onSubmit, onCancel, editing, saving, children }: CrudSectionProps) {
  return (
    <div className="crud-layout">
      <form className="crud-form" onSubmit={onSubmit}>
        <div>
          <span className="admin-kicker">Cadastro</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {children}
        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar'}
          </button>
          {editing && <button className="button button-quiet" type="button" onClick={onCancel}>Cancelar</button>}
        </div>
      </form>
    </div>
  )
}

export default AdminPage
