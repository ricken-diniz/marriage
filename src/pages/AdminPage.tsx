import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { alterarCodigoConvidado, criarConvidado, verCodigoConvidado } from '../api/auth'
import '../App.css'

type Tab = 'convidados' | 'companhias' | 'presentes' | 'contribuicoes' | 'mensagens'
type FiltroTelefone = 'todos' | 'com-numero' | 'sem-numero'
type FiltroStatusConvite = 'todos' | 'recebido' | 'pendente'
type TipoBuscaConfirmacoes = 'nome' | 'abaixo' | 'acima'

type Convidado = {
  id: string
  nome: string
  telefone: string | null
  confirmacao_presenca: boolean | null
  recebeu_pre_convite: boolean
  recebeu_convite: boolean
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

type Mensagem = {
  id: string
  mensagem: string
  created_at: string
  convidado: { nome: string }[] | { nome: string } | null
}

type ExclusaoPendente = {
  tabela: 'convidados' | 'companhias' | 'presentes' | 'mensagens'
  id: string
  nome: string
  tipo: string
}

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const STORAGE_IMAGE_PREFIX = '/storage/v1/object/public/presentes/'

function AdminPage() {
  const [aba, setAba] = useState<Tab>('convidados')
  const [convidados, setConvidados] = useState<Convidado[]>([])
  const [companhias, setCompanhias] = useState<Companhia[]>([])
  const [presentes, setPresentes] = useState<Presente[]>([])
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([])
  const [contribuicoesLivres, setContribuicoesLivres] = useState<ContribuicaoLivre[]>([])
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [convidadoContribuicoes, setConvidadoContribuicoes] = useState<string | null>(null)
  const [convidadoEditando, setConvidadoEditando] = useState<string | null>(null)
  const [companhiaEditando, setCompanhiaEditando] = useState<string | null>(null)
  const [presenteEditando, setPresenteEditando] = useState<string | null>(null)
  const [presenteSelecionado, setPresenteSelecionado] = useState<Presente | null>(null)
  const [exclusaoPendente, setExclusaoPendente] = useState<ExclusaoPendente | null>(null)
  const [nomeConvidado, setNomeConvidado] = useState('')
  const [telefoneConvidado, setTelefoneConvidado] = useState('')
  const [codigoConvidado, setCodigoConvidado] = useState('')
  const [recebeuPreConvite, setRecebeuPreConvite] = useState(false)
  const [recebeuConvite, setRecebeuConvite] = useState(false)
  const [buscaConvidado, setBuscaConvidado] = useState('')
  const [filtroTelefone, setFiltroTelefone] = useState<FiltroTelefone>('todos')
  const [filtroPreConvite, setFiltroPreConvite] = useState<FiltroStatusConvite>('todos')
  const [filtroConvite, setFiltroConvite] = useState<FiltroStatusConvite>('todos')
  const [buscaCompanhia, setBuscaCompanhia] = useState('')
  const [buscaPresente, setBuscaPresente] = useState('')
  const [buscaConfirmacoes, setBuscaConfirmacoes] = useState('')
  const [tipoBuscaConfirmacoes, setTipoBuscaConfirmacoes] = useState<TipoBuscaConfirmacoes>('nome')
  const [nomeCompanhia, setNomeCompanhia] = useState('')
  const [convidadoDaCompanhia, setConvidadoDaCompanhia] = useState('')
  const [nomePresente, setNomePresente] = useState('')
  const [descricaoPresente, setDescricaoPresente] = useState('')
  const [valorPresente, setValorPresente] = useState('')
  const [valorCotaPresente, setValorCotaPresente] = useState('')
  const [imagemPresente, setImagemPresente] = useState('')
  const [imagemArquivo, setImagemArquivo] = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string | null>(null)
  const [imagemRemovida, setImagemRemovida] = useState(false)
  const imagemInputRef = useRef<HTMLInputElement>(null)
  const imagemPreviewRef = useRef<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [codigosConvidados, setCodigosConvidados] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string | null>(null)

  async function carregarDados() {
    const [convidadosResult, companhiasResult, presentesResult, contribuicoesResult, livresResult, mensagensResult] = await Promise.all([
      supabase
        .from('convidados')
        .select('id, nome, telefone, confirmacao_presenca, recebeu_pre_convite, recebeu_convite')
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
      supabase
        .from('mensagens')
        .select('id, mensagem, created_at, convidado:convidados(nome)')
        .order('created_at', { ascending: false }),
    ])

    const resultadoComErro = [convidadosResult, companhiasResult, presentesResult, contribuicoesResult, livresResult, mensagensResult].find(
      (resultado) => resultado.error,
    )

    if (resultadoComErro?.error) {
      setErro(resultadoComErro.error.message)
    } else {
      const convidadosCarregados = (convidadosResult.data ?? []) as Convidado[]
      setConvidados(convidadosCarregados)
      const codigos = await Promise.all(
        convidadosCarregados.map(async (convidado) => {
          try {
            return [convidado.id, await verCodigoConvidado(convidado.id)] as const
          } catch {
            return [convidado.id, 'Código não disponível'] as const
          }
        }),
      )
      setCodigosConvidados(Object.fromEntries(codigos))
      setCompanhias((companhiasResult.data ?? []) as Companhia[])
      setPresentes((presentesResult.data ?? []) as Presente[])
      setContribuicoes((contribuicoesResult.data ?? []) as Contribuicao[])
      setContribuicoesLivres((livresResult.data ?? []) as ContribuicaoLivre[])
      setMensagens((mensagensResult.data ?? []) as Mensagem[])
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

  useEffect(() => () => {
    if (imagemPreviewRef.current) URL.revokeObjectURL(imagemPreviewRef.current)
  }, [])

  function limparImagemPreview() {
    if (imagemPreviewRef.current) URL.revokeObjectURL(imagemPreviewRef.current)
    imagemPreviewRef.current = null
    setImagemPreview(null)
  }

  function limparFormularios() {
    setConvidadoEditando(null)
    setCompanhiaEditando(null)
    setPresenteEditando(null)
    setPresenteSelecionado(null)
    setNomeConvidado('')
    setTelefoneConvidado('')
    setCodigoConvidado('')
    setRecebeuPreConvite(false)
    setRecebeuConvite(false)
    setNomeCompanhia('')
    setConvidadoDaCompanhia('')
    setNomePresente('')
    setDescricaoPresente('')
    setValorPresente('')
    setValorCotaPresente('')
    setImagemPresente('')
    setImagemArquivo(null)
    limparImagemPreview()
    setImagemRemovida(false)
    if (imagemInputRef.current) imagemInputRef.current.value = ''
    setErro(null)
  }

  function selecionarImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0] ?? null
    if (!arquivo) return
    if (!IMAGE_TYPES.has(arquivo.type)) {
      setErro('Escolha uma imagem JPEG, PNG ou WebP.')
      event.target.value = ''
      return
    }
    if (arquivo.size > MAX_IMAGE_SIZE) {
      setErro('A imagem deve ter no máximo 5 MB.')
      event.target.value = ''
      return
    }
    if (imagemPreviewRef.current) URL.revokeObjectURL(imagemPreviewRef.current)
    const previewUrl = URL.createObjectURL(arquivo)
    imagemPreviewRef.current = previewUrl
    setImagemPreview(previewUrl)
    setImagemArquivo(arquivo)
    setImagemRemovida(false)
    setErro(null)
  }

  function removerImagemSelecionada() {
    setImagemArquivo(null)
    limparImagemPreview()
    setImagemPresente('')
    setImagemRemovida(true)
    if (imagemInputRef.current) imagemInputRef.current.value = ''
  }

  async function enviarImagem(arquivo: File) {
    const extensao = arquivo.type.split('/')[1] === 'jpeg' ? 'jpg' : arquivo.type.split('/')[1]
    const caminho = `presentes/${crypto.randomUUID()}.${extensao}`
    const { error: uploadError } = await supabase.storage.from('presentes').upload(caminho, arquivo, {
      cacheControl: '3600',
      contentType: arquivo.type,
      upsert: false,
    })
    if (uploadError) throw new Error(`Não foi possível enviar a imagem: ${uploadError.message}`)
    return { caminho, url: supabase.storage.from('presentes').getPublicUrl(caminho).data.publicUrl }
  }

  function caminhoDaImagem(url: string | null) {
    if (!url) return null
    const indice = url.indexOf(STORAGE_IMAGE_PREFIX)
    if (indice === -1) return null
    return decodeURIComponent(url.slice(indice + STORAGE_IMAGE_PREFIX.length))
  }

  async function removerImagemDoStorage(url: string | null) {
    const caminho = caminhoDaImagem(url)
    if (caminho) await supabase.storage.from('presentes').remove([caminho])
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
        .update({
          nome: nomeConvidado.trim(),
          telefone: telefoneConvidado.trim() || null,
          recebeu_pre_convite: recebeuPreConvite,
          recebeu_convite: recebeuConvite,
        })
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
        await criarConvidado(nomeConvidado.trim(), codigoConvidado.trim(), telefoneConvidado.trim() || null)
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
    const valorCota = valorCotaPresente.trim() ? Number(valorCotaPresente.replace(',', '.')) : valor
    if (!nomePresente.trim() || !Number.isFinite(valor) || valor < 0 || !Number.isFinite(valorCota) || valorCota <= 0) return

    setSalvando(true)
    setErro(null)
    const imagemAnterior = presenteEditando ? presentes.find((presente) => presente.id === presenteEditando)?.imagem_url ?? null : null
    let novaImagem: { caminho: string; url: string } | null = null

    try {
      if (imagemArquivo) novaImagem = await enviarImagem(imagemArquivo)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.')
      setSalvando(false)
      return
    }

    const dados = {
      nome: nomePresente.trim(),
      descricao: descricaoPresente.trim() || null,
      valor,
      valor_cota: valorCota,
      imagem_url: novaImagem?.url ?? (imagemRemovida ? null : imagemPresente.trim() || null),
      ...(presenteEditando ? {} : { visivel: true }),
    }
    const query = presenteEditando
      ? supabase.from('presentes').update(dados).eq('id', presenteEditando)
      : supabase.from('presentes').insert(dados)
    const { error: saveError } = await query

    if (saveError) {
      if (novaImagem) await removerImagemDoStorage(novaImagem.url)
      setErro(saveError.message)
    } else {
      if (imagemAnterior && imagemAnterior !== dados.imagem_url) await removerImagemDoStorage(imagemAnterior)
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
    const presenteExcluido = tabela === 'presentes' ? presentes.find((presente) => presente.id === id) : null
    setSalvando(true)
    setErro(null)
    const { error: deleteError } = await supabase.from(tabela).delete().eq('id', id)
    if (deleteError) setErro(deleteError.message)
    else {
      if (tabela === 'presentes') setPresenteSelecionado(null)
      setExclusaoPendente(null)
      if (presenteExcluido) await removerImagemDoStorage(presenteExcluido.imagem_url)
      await carregarDados()
    }
    setSalvando(false)
  }

  async function sair() {
    await supabase.auth.signOut()
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

  async function alternarStatusConvite(convidado: Convidado, campo: 'recebeu_pre_convite' | 'recebeu_convite') {
    const valor = !convidado[campo]
    setSalvando(true)
    setErro(null)
    const { error: saveError } = await supabase
      .from('convidados')
      .update({ [campo]: valor })
      .eq('id', convidado.id)

    if (saveError) setErro(saveError.message)
    else setConvidados((atuais) => atuais.map((atual) => atual.id === convidado.id ? { ...atual, [campo]: valor } : atual))
    setSalvando(false)
  }

  function mensagemConvite(convidado: Convidado) {
    const codigo = codigosConvidados[convidado.id] ?? ''
    const linkSite = `https://www.casamentojn.com/?${new URLSearchParams({ codigo }).toString()}`
    return `Querido(a) ${convidado.nome},
Nós pedimos para acalmar os corações e agora o momento finalmente chegou! ✨💙
Será uma alegria imensa ter você ao nosso lado celebrando o nosso casamento no dia 26/12/2026, às 18:30.

Para conferir todos os detalhes, basta abrir o arquivo em anexo e tocar nos ícones na tela para acessar a localização dos eventos e o nosso site.

Ao entrar no site para ver a lista de presentes ou confirmar sua presença, utilize a sua chave individual.
Código de acesso: ${codigo}
Solicitamos que confirme sua presença por lá até o dia 30/11/2026. Esperamos por você para vivermos esse dia juntos!

${linkSite}`
  }

  async function marcarConviteComoEnviado(convidado: Convidado) {
    if (convidado.recebeu_convite) return
    setSalvando(true)
    setErro(null)
    const { error: saveError } = await supabase
      .from('convidados')
      .update({ recebeu_convite: true })
      .eq('id', convidado.id)

    if (saveError) setErro(saveError.message)
    else setConvidados((atuais) => atuais.map((atual) => atual.id === convidado.id ? { ...atual, recebeu_convite: true } : atual))
    setSalvando(false)
  }

  function abrirConviteWhatsApp(event: MouseEvent<HTMLAnchorElement>, convidado: Convidado) {
    const telefone = somenteNumeros(convidado.telefone ?? '')
    if (salvando || !telefone) {
      event.preventDefault()
      if (!telefone) setErro('Cadastre um telefone para abrir o convite no WhatsApp.')
      return
    }
    void marcarConviteComoEnviado(convidado)
  }

  function nomeDoConvidado(id: string) {
    return convidados.find((convidado) => convidado.id === id)?.nome ?? 'Convidado não encontrado'
  }

  function valorDasContribuicoes(convidadoId: string) {
    const cotas = contribuicoes.filter((item) => item.convidado_id === convidadoId)
    const livres = contribuicoesLivres.filter((item) => item.convidado_id === convidadoId)
    return cotas.reduce((total, item) => total + (presentes.find((presente) => presente.id === item.presente_id)?.valor_cota ?? 0), 0)
      + livres.reduce((total, item) => total + item.valor_cota, 0)
  }

  function textoNormalizado(texto: string) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
  }

  function somenteNumeros(texto: string) {
    return texto.replace(/\D/g, '')
  }

  const convidadosFiltrados = convidados.filter((convidado) => {
    const buscaNormalizada = textoNormalizado(buscaConvidado)
    const telefoneBuscado = somenteNumeros(buscaConvidado)
    const correspondeAoTexto = textoNormalizado(convidado.nome).includes(buscaNormalizada)
      || (telefoneBuscado.length > 0 && somenteNumeros(convidado.telefone ?? '').includes(telefoneBuscado))
    const correspondeAoTelefone = filtroTelefone === 'todos'
      || (filtroTelefone === 'com-numero' && Boolean(convidado.telefone))
      || (filtroTelefone === 'sem-numero' && !convidado.telefone)
    const correspondeAoPreConvite = filtroPreConvite === 'todos'
      || (filtroPreConvite === 'recebido' && convidado.recebeu_pre_convite)
      || (filtroPreConvite === 'pendente' && !convidado.recebeu_pre_convite)
    const correspondeAoConvite = filtroConvite === 'todos'
      || (filtroConvite === 'recebido' && convidado.recebeu_convite)
      || (filtroConvite === 'pendente' && !convidado.recebeu_convite)
    return correspondeAoTexto && correspondeAoTelefone && correspondeAoPreConvite && correspondeAoConvite
  })
  const companhiasFiltradas = companhias.filter((companhia) => {
    const busca = textoNormalizado(buscaCompanhia)
    return textoNormalizado(companhia.nome).includes(busca) || textoNormalizado(nomeDoConvidado(companhia.convidado_id)).includes(busca)
  })
  const presentesFiltrados = presentes.filter((presente) => textoNormalizado(presente.nome).includes(textoNormalizado(buscaPresente)))
  const convidadosComContribuicoes = convidados.filter((convidado) => {
    if (!buscaConfirmacoes.trim()) return true
    if (tipoBuscaConfirmacoes === 'nome') return textoNormalizado(convidado.nome).includes(textoNormalizado(buscaConfirmacoes))

    const valorBusca = Number(buscaConfirmacoes.replace(',', '.'))
    if (!Number.isFinite(valorBusca)) return false
    const valorContribuicoes = valorDasContribuicoes(convidado.id)
    return tipoBuscaConfirmacoes === 'abaixo' ? valorContribuicoes < valorBusca : valorContribuicoes > valorBusca
  })

  function levarAoFormulario(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function editarConvidado(convidado: Convidado) {
    setAba('convidados')
    setConvidadoEditando(convidado.id)
    setNomeConvidado(convidado.nome)
    setTelefoneConvidado(convidado.telefone ?? '')
    setRecebeuPreConvite(convidado.recebeu_pre_convite)
    setRecebeuConvite(convidado.recebeu_convite)
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
    setImagemArquivo(null)
    limparImagemPreview()
    setImagemRemovida(false)
    if (imagemInputRef.current) imagemInputRef.current.value = ''
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
        <button className={aba === 'mensagens' ? 'active' : ''} type="button" onClick={() => setAba('mensagens')}>
          Mensagens <span>{mensagens.length}</span>
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
                <label>Nome<input value={nomeConvidado} onChange={(event) => setNomeConvidado(event.target.value)} placeholder="Ex.: Jéssica e Nathan" /></label>
                <label>Telefone<input type="tel" value={telefoneConvidado} onChange={(event) => setTelefoneConvidado(event.target.value)} placeholder="Ex.: (11) 99999-9999" /></label>
                {convidadoEditando && <div className="guest-status-fields"><label className="checkbox-label"><input type="checkbox" checked={recebeuPreConvite} onChange={(event) => setRecebeuPreConvite(event.target.checked)} />Recebeu pré-convite</label><label className="checkbox-label"><input type="checkbox" checked={recebeuConvite} onChange={(event) => setRecebeuConvite(event.target.checked)} />Recebeu convite</label></div>}
                {!convidadoEditando && <label>Código de acesso<input value={codigoConvidado} onChange={(event) => setCodigoConvidado(event.target.value)} placeholder="Ex.: CASAMENTO2026" minLength={6} required /><small className="field-help">O código será a senha de acesso do convidado. Anote-o para entregar presencialmente.</small></label>}
                {convidadoEditando && <label>Novo código de acesso (opcional)<input value={codigoConvidado} onChange={(event) => setCodigoConvidado(event.target.value)} placeholder="Deixe vazio para manter o atual" minLength={6} /><small className="field-help">O código atual aparece na listagem. Informe um novo código para substituí-lo.</small></label>}
                <div className="form-actions"><button className="button button-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : convidadoEditando ? 'Salvar alterações' : 'Adicionar'}</button>{convidadoEditando && <button className="button button-quiet" type="button" onClick={limparFormularios}>Cancelar</button>}</div>
              </form>
              <section className="cadastro-list-panel">
                <div className="presentes-list-heading"><div><span className="admin-kicker">Cadastro</span><h2>Convidados cadastrados</h2></div><span>{convidadosFiltrados.length} de {convidados.length} itens</span></div>
                <div className="list-search-controls"><label className="list-search"><span>Pesquisar convidados</span><input type="search" value={buscaConvidado} onChange={(event) => setBuscaConvidado(event.target.value)} placeholder="Nome ou número de telefone" /></label><label className="list-filter"><span>Telefone</span><select value={filtroTelefone} onChange={(event) => setFiltroTelefone(event.target.value as FiltroTelefone)}><option value="todos">Todos</option><option value="com-numero">Com número cadastrado</option><option value="sem-numero">Sem número cadastrado</option></select></label><label className="list-filter"><span>Pré-convite</span><select value={filtroPreConvite} onChange={(event) => setFiltroPreConvite(event.target.value as FiltroStatusConvite)}><option value="todos">Todos</option><option value="recebido">Recebido</option><option value="pendente">Pendente</option></select></label><label className="list-filter"><span>Convite</span><select value={filtroConvite} onChange={(event) => setFiltroConvite(event.target.value as FiltroStatusConvite)}><option value="todos">Todos</option><option value="recebido">Recebido</option><option value="pendente">Pendente</option></select></label></div>
                <div className="admin-list">
                  {convidadosFiltrados.map((convidado) => { const telefone = somenteNumeros(convidado.telefone ?? ''); return <article className="admin-row" key={convidado.id}><div><strong>{convidado.nome}</strong><span>{convidado.telefone ? `Telefone: ${convidado.telefone}` : 'Telefone não informado'}</span><div className="guest-status-actions"><button className={`guest-status-button${convidado.recebeu_pre_convite ? ' received' : ''}`} type="button" aria-pressed={convidado.recebeu_pre_convite} disabled={salvando} onClick={() => void alternarStatusConvite(convidado, 'recebeu_pre_convite')}>Pré-convite</button><a className={`guest-status-button${convidado.recebeu_convite ? ' received' : ''}`} href={telefone ? `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagemConvite(convidado))}` : undefined} target="_blank" rel="noreferrer" aria-disabled={salvando || !telefone} onClick={(event) => abrirConviteWhatsApp(event, convidado)}>Convite</a></div><span>{convidado.confirmacao_presenca === null ? 'Aguardando confirmação' : convidado.confirmacao_presenca ? 'Presença confirmada' : 'Não irá comparecer'}</span><code className="access-code">{codigosConvidados[convidado.id] ?? 'Carregando código...'}</code></div><div className="row-actions"><button type="button" onClick={() => editarConvidado(convidado)}>Editar</button><button type="button" onClick={() => solicitarExclusao('convidados', convidado.id, convidado.nome, 'convidado')}>Excluir</button></div></article> })}
                  {!convidadosFiltrados.length && <p className="empty-state">{convidados.length ? 'Nenhum convidado encontrado.' : 'Nenhum convidado cadastrado.'}</p>}
                </div>
              </section>
            </div>
          )}

          {aba === 'companhias' && (
            <div className="cadastro-admin-layout">
              <form className="crud-form" id="form-companhia" onSubmit={salvarCompanhia}>
                <div><span className="admin-kicker">Cadastro</span><h2>{companhiaEditando ? 'Editar companhia' : 'Nova companhia'}</h2><p>Associe cada companhia ao convidado responsável pelo acesso.</p></div>
                <label>Nome<input value={nomeCompanhia} onChange={(event) => setNomeCompanhia(event.target.value)} placeholder="Ex.: Slowan" /></label>
                <label>Convidado responsável<select value={convidadoDaCompanhia} onChange={(event) => setConvidadoDaCompanhia(event.target.value)}><option value="">Selecione um convidado</option>{convidados.map((convidado) => <option value={convidado.id} key={convidado.id}>{convidado.nome}</option>)}</select></label>
                <div className="form-actions"><button className="button button-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : companhiaEditando ? 'Salvar alterações' : 'Adicionar'}</button>{companhiaEditando && <button className="button button-quiet" type="button" onClick={limparFormularios}>Cancelar</button>}</div>
              </form>
              <section className="cadastro-list-panel">
                <div className="presentes-list-heading"><div><span className="admin-kicker">Cadastro</span><h2>Companhias cadastradas</h2></div><span>{companhiasFiltradas.length} de {companhias.length} itens</span></div>
                <label className="list-search"><span>Pesquisar companhias</span><input type="search" value={buscaCompanhia} onChange={(event) => setBuscaCompanhia(event.target.value)} placeholder="Nome da companhia ou convidado" /></label>
                <div className="admin-list">
                  {companhiasFiltradas.map((companhia) => <article className="admin-row" key={companhia.id}><div><strong>{companhia.nome}</strong><span>Com {nomeDoConvidado(companhia.convidado_id)}</span></div><div className="row-actions"><button type="button" onClick={() => editarCompanhia(companhia)}>Editar</button><button type="button" onClick={() => solicitarExclusao('companhias', companhia.id, companhia.nome, 'companhia')}>Excluir</button></div></article>)}
                  {!companhiasFiltradas.length && <p className="empty-state">{companhias.length ? 'Nenhuma companhia encontrada.' : 'Nenhuma companhia cadastrada.'}</p>}
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
                  Valor da cota (opcional)
                  <input inputMode="decimal" value={valorCotaPresente} onChange={(event) => setValorCotaPresente(event.target.value)} placeholder="0,00" />
                  <small className="field-help">Deixe vazio para usar o valor total como uma única cota.</small>
                </label>
                <label>
                  Imagem do presente (opcional)
                  <input ref={imagemInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selecionarImagem} />
                  <small className="field-help">JPEG, PNG ou WebP de até 5 MB. No celular, você pode escolher uma foto ou tirar uma nova.</small>
                  {(imagemPreview || imagemPresente) && <div className="image-upload-preview"><img src={imagemPreview ?? imagemPresente} alt="Prévia da imagem do presente" /><button className="button button-quiet" type="button" onClick={removerImagemSelecionada}>Remover imagem</button></div>}
                </label>
                <label>
                  URL da imagem (opcional)
                  <input type="url" value={imagemPresente} onChange={(event) => { setImagemPresente(event.target.value); setImagemRemovida(false) }} placeholder="https://..." disabled={Boolean(imagemArquivo)} />
                  <small className="field-help">Use este campo apenas para manter compatibilidade com imagens hospedadas externamente.</small>
                </label>
                <div className="form-actions">
                  <button className="button button-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Adicionar'}</button>
                </div>
              </form>
              <section className="presentes-list-panel">
                <div className="presentes-list-heading">
                  <div><span className="admin-kicker">Catálogo</span><h2>Presentes cadastrados</h2></div>
                  <span>{presentesFiltrados.length} de {presentes.length} itens</span>
                </div>
                <label className="list-search"><span>Pesquisar presentes</span><input type="search" value={buscaPresente} onChange={(event) => setBuscaPresente(event.target.value)} placeholder="Nome do presente" /></label>
                <div className="admin-list">
                  {presentesFiltrados.map((presente) => (
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
                  {!presentesFiltrados.length && <p className="empty-state">{presentes.length ? 'Nenhum presente encontrado.' : 'Nenhum presente cadastrado.'}</p>}
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
              <div className="confirmation-search-controls">
                <label className="list-search"><span>Pesquisar confirmações</span><input type={tipoBuscaConfirmacoes === 'nome' ? 'search' : 'number'} inputMode={tipoBuscaConfirmacoes === 'nome' ? 'text' : 'decimal'} min={tipoBuscaConfirmacoes === 'nome' ? undefined : '0'} step={tipoBuscaConfirmacoes === 'nome' ? undefined : '0.01'} value={buscaConfirmacoes} onChange={(event) => setBuscaConfirmacoes(event.target.value)} placeholder={tipoBuscaConfirmacoes === 'nome' ? 'Nome do convidado' : 'Valor em reais'} /></label>
                <label className="list-filter"><span>Pesquisar por</span><select value={tipoBuscaConfirmacoes} onChange={(event) => { setTipoBuscaConfirmacoes(event.target.value as TipoBuscaConfirmacoes); setBuscaConfirmacoes('') }}><option value="nome">Nome</option><option value="abaixo">Valores abaixo de</option><option value="acima">Valores acima de</option></select></label>
              </div>
              <div className="admin-list">
                {convidadosComContribuicoes.map((convidado) => {
                  const cotas = contribuicoes.filter((item) => item.convidado_id === convidado.id)
                  const livres = contribuicoesLivres.filter((item) => item.convidado_id === convidado.id)
                  return <button className="admin-row confirmation-row" type="button" key={convidado.id} onClick={() => setConvidadoContribuicoes(convidado.id)}>
                    <span><strong>{convidado.nome}</strong><span>{cotas.length + livres.length} {cotas.length + livres.length === 1 ? 'contribuição' : 'contribuições'}</span></span>
                    <span className="confirmation-summary">{moeda.format(valorDasContribuicoes(convidado.id))} <b>→</b></span>
                  </button>
                })}
                {!convidadosComContribuicoes.length && <p className="empty-state">{convidados.length ? 'Nenhum convidado encontrado.' : 'Nenhum convidado cadastrado.'}</p>}
              </div>
            </section>
          )}

          {aba === 'mensagens' && (
            <section className="messages-admin-section">
              <div className="section-intro">
                <span className="admin-kicker">Mural</span>
                <h2>Mensagens dos convidados</h2>
                <p>Consulte e remova mensagens publicadas no mural da celebração.</p>
              </div>
              <div className="admin-list">
                {mensagens.map((item) => {
                  const nome = Array.isArray(item.convidado) ? item.convidado[0]?.nome : item.convidado?.nome
                  return <article className="admin-row message-admin-row" key={item.id}><div><strong>{nome ?? 'Convidado'}</strong><p>{item.mensagem}</p><span>{new Date(item.created_at).toLocaleDateString('pt-BR')}</span></div><div className="row-actions"><button type="button" onClick={() => solicitarExclusao('mensagens', item.id, nome ?? 'mensagem', 'mensagem')}>Excluir</button></div></article>
                })}
                {!mensagens.length && <p className="empty-state">Nenhuma mensagem publicada.</p>}
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
              <label>Valor da cota (opcional)<input inputMode="decimal" value={valorCotaPresente} onChange={(event) => setValorCotaPresente(event.target.value)} /><small className="field-help">Deixe vazio para usar o valor total como uma única cota.</small></label>
              <label>Imagem do presente (opcional)<input ref={imagemInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={selecionarImagem} /><small className="field-help">Escolha uma nova imagem para substituir a atual.</small>{(imagemPreview || imagemPresente) && <div className="image-upload-preview"><img src={imagemPreview ?? imagemPresente} alt="Prévia da imagem do presente" /><button className="button button-quiet" type="button" onClick={removerImagemSelecionada}>Remover imagem</button></div>}</label>
              <label>URL da imagem (opcional)<input type="url" value={imagemPresente} onChange={(event) => { setImagemPresente(event.target.value); setImagemRemovida(false) }} disabled={Boolean(imagemArquivo)} /></label>
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
  const [buscaConfirmados, setBuscaConfirmados] = useState('')
  const [buscaNaoConfirmados, setBuscaNaoConfirmados] = useState('')
  const confirmados = [
    ...convidados.filter((convidado) => convidado.confirmacao_presenca === true).map((convidado) => ({ nome: convidado.nome, tipo: 'Convidado' })),
    ...companhias.filter((companhia) => companhia.confirmacao_presenca === true).map((companhia) => ({ nome: companhia.nome, tipo: `Companhia de ${nomeDoConvidado(companhia.convidado_id)}` })),
  ]
  const naoConfirmados = [
    ...convidados.filter((convidado) => convidado.confirmacao_presenca !== true).map((convidado) => ({ nome: convidado.nome, tipo: 'Convidado' })),
    ...companhias.filter((companhia) => companhia.confirmacao_presenca !== true).map((companhia) => ({ nome: companhia.nome, tipo: `Companhia de ${nomeDoConvidado(companhia.convidado_id)}` })),
  ]

  function tabela(titulo: string, pessoas: { nome: string; tipo: string }[], busca: string, alterarBusca: (valor: string) => void) {
    const buscaNormalizada = busca.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
    const pessoasFiltradas = pessoas.filter((pessoa) => pessoa.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().includes(buscaNormalizada))

    return <div className="presence-table-block">
      <div className="presence-table-heading"><h2>{titulo}</h2><span>{pessoasFiltradas.length}</span></div>
      <label className="list-search presence-table-search"><input type="search" aria-label={`Pesquisar ${titulo.toLocaleLowerCase()} por nome`} value={busca} onChange={(event) => alterarBusca(event.target.value)} placeholder="Nome da pessoa" /></label>
      <div className="presence-table" role="table" aria-label={titulo}>
        <div className="presence-table-row presence-table-header" role="row"><span role="columnheader">Nome</span><span role="columnheader">Tipo</span></div>
        {pessoasFiltradas.map((pessoa) => <div className="presence-table-row" role="row" key={`${pessoa.tipo}-${pessoa.nome}`}><strong role="cell">{pessoa.nome}</strong><span role="cell">{pessoa.tipo}</span></div>)}
        {!pessoasFiltradas.length && <p className="empty-state">{pessoas.length ? 'Nenhuma pessoa encontrada.' : 'Nenhuma pessoa nesta tabela.'}</p>}
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
      {tabela('Confirmados', confirmados, buscaConfirmados, setBuscaConfirmados)}
      {tabela('Não confirmados', naoConfirmados, buscaNaoConfirmados, setBuscaNaoConfirmados)}
    </div>
  </section>
}

export default AdminPage
