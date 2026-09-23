import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encryptCode } from '../_shared/codeCrypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function hashCode(code: string) {
  const bytes = new TextEncoder().encode(code)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return response({ error: 'Método não permitido.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return response({ error: 'Variáveis de ambiente do Supabase não configuradas.' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const authorization = request.headers.get('Authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return response({ error: 'Sessão administrativa obrigatória.' }, 401)

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || userData.user?.app_metadata?.role !== 'admin') {
    return response({ error: 'Acesso administrativo não autorizado.' }, 403)
  }

  let convidadoId: string | null = null
  let authUserId: string | null = null

  try {
    const { nome, code } = await request.json()
    const nomeNormalizado = typeof nome === 'string' ? nome.trim() : ''
    const codigoNormalizado = typeof code === 'string' ? code.trim() : ''

    if (!nomeNormalizado || codigoNormalizado.length < 6) {
      return response({ error: 'Nome obrigatório e código com pelo menos 6 caracteres.' }, 400)
    }

    const codeHash = await hashCode(codigoNormalizado)
    const { data: existingCode, error: lookupError } = await admin
      .from('access_codes')
      .select('id')
      .eq('code_hash', codeHash)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (existingCode) return response({ error: 'Esse código já está sendo usado por outro convidado.' }, 409)

    const emailInterno = `convidado-${crypto.randomUUID()}@login.internal`
    const encryptedCode = await encryptCode(codigoNormalizado)
    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: emailInterno,
      password: codigoNormalizado,
      email_confirm: true,
    })

    if (createUserError || !createdUser.user) throw createUserError ?? new Error('Usuário não criado.')
    authUserId = createdUser.user.id

    const { data: guest, error: guestError } = await admin
      .from('convidados')
      .insert({ nome: nomeNormalizado })
      .select('id')
      .single()

    if (guestError || !guest) throw guestError ?? new Error('Convidado não criado.')
    convidadoId = guest.id

    const { error: codeError } = await admin.from('access_codes').insert({
      code_hash: codeHash,
      codigo_criptografado: encryptedCode,
      login_email: emailInterno,
      auth_user_id: authUserId,
      convidado_id: convidadoId,
    })

    if (codeError) throw codeError

    return response({ convidado_id: convidadoId })
  } catch (error) {
    if (convidadoId) await admin.from('convidados').delete().eq('id', convidadoId)
    if (authUserId) await admin.auth.admin.deleteUser(authUserId)
    console.error('admin-criar-convidado:', error)
    return response({ error: 'Não foi possível criar o convidado e seu acesso.' }, 500)
  }
})
