import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const envLocal = await readFile('.env.local', 'utf8').catch(() => '')
for (const line of envLocal.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
}

const csvPath = process.argv[2]
const adminCode = process.env.ADMIN_CODE ?? process.argv[3]
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY

if (!csvPath) {
  console.error('Uso: npm run importar:convidados -- caminho/para/convidados_com_codigo.csv CODIGO_ADMIN')
  process.exit(1)
}

if (!supabaseUrl || !supabaseKey || !adminCode) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local e informe o código administrativo.')
  process.exit(1)
}

function parseCsvLine(line) {
  const columns = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const nextCharacter = line[index + 1]

    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      columns.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }

  columns.push(value.trim())
  return columns
}

function parseGuests(csv) {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  const header = parseCsvLine(lines.shift() ?? '')

  if (header.length !== 3 || header[0] !== 'Nome' || header[2] !== 'Código') {
    throw new Error('CSV inválido. Esperado o cabeçalho: Nome,Número de telefone,Código')
  }

  return lines.map((line, index) => {
    const [nome, telefone, code] = parseCsvLine(line)
    if (!nome || !code) throw new Error(`Linha ${index + 2}: nome e código são obrigatórios.`)
    if (code.length < 6) throw new Error(`Linha ${index + 2}: o código precisa ter pelo menos 6 caracteres.`)

    return { nome, telefone: telefone || null, code }
  })
}

const csv = await readFile(csvPath, 'utf8')
const convidados = parseGuests(csv)
const supabase = createClient(supabaseUrl, supabaseKey)

const { data: sessionData, error: loginError } = await supabase.functions.invoke('validar-codigo', {
  body: { code: adminCode.trim() },
})

if (loginError) {
  throw new Error(`Não foi possível validar o código administrativo: ${loginError.message}`)
}

const { access_token: accessToken, refresh_token: refreshToken } = sessionData ?? {}
if (!accessToken || !refreshToken) {
  throw new Error('A função de validação não retornou uma sessão válida.')
}

const { error: sessionError } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
})

if (sessionError) {
  throw new Error(`Não foi possível iniciar a sessão administrativa: ${sessionError.message}`)
}

const { data: currentSession } = await supabase.auth.getSession()
const sessionAccessToken = currentSession.session?.access_token
if (!sessionAccessToken) throw new Error('A sessão administrativa não possui token de acesso.')

async function mensagemDoErro(error) {
  if (error?.context instanceof Response) {
    const body = await error.context.clone().json().catch(() => null)
    if (body?.error) return body.error
  }
  return error?.message ?? 'Erro desconhecido.'
}

let importados = 0
const falhas = []

for (const convidado of convidados) {
  const { error } = await supabase.functions.invoke('admin-criar-convidado', {
    body: convidado,
    headers: { Authorization: `Bearer ${sessionAccessToken}` },
  })

  if (error) {
    const mensagem = await mensagemDoErro(error)
    falhas.push(`${convidado.nome}: ${mensagem}`)
    console.error(`Falhou: ${convidado.nome} (${mensagem})`)
  } else {
    importados += 1
    console.log(`Criado: ${convidado.nome}`)
  }
}

await supabase.auth.signOut()
console.log(`\nResultado: ${importados} criados, ${falhas.length} falhas, ${convidados.length} total.`)

if (falhas.length) process.exit(1)
