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
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Método não permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return response({ error: 'Variáveis de ambiente do Supabase não configuradas.' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return response({ error: 'Sessão administrativa obrigatória.' }, 401)

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || userData.user?.app_metadata?.role !== 'admin') {
    return response({ error: 'Acesso administrativo não autorizado.' }, 403)
  }

  try {
    const { convidado_id: convidadoId, code } = await request.json()
    const codigoNormalizado = typeof code === 'string' ? code.trim() : ''
    if (typeof convidadoId !== 'string' || codigoNormalizado.length < 6) {
      return response({ error: 'Convidado e código com pelo menos 6 caracteres são obrigatórios.' }, 400)
    }

    const { data: existingCode, error: lookupError } = await admin
      .from('access_codes')
      .select('auth_user_id, login_email')
      .eq('convidado_id', convidadoId)
      .eq('active', true)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (!existingCode) return response({ error: 'Código ativo não encontrado para este convidado.' }, 404)

    const newHash = await hashCode(codigoNormalizado)
    const encryptedCode = await encryptCode(codigoNormalizado)
    const { data: duplicateCode, error: duplicateError } = await admin
      .from('access_codes')
      .select('id')
      .eq('code_hash', newHash)
      .maybeSingle()

    if (duplicateError) throw duplicateError
    if (duplicateCode) return response({ error: 'Esse código já está sendo usado por outro convidado.' }, 409)

    const { error: passwordError } = await admin.auth.admin.updateUserById(
      existingCode.auth_user_id,
      { password: codigoNormalizado },
    )
    if (passwordError) throw passwordError

    const { error: codeError } = await admin
      .from('access_codes')
      .update({ code_hash: newHash, codigo_criptografado: encryptedCode })
      .eq('convidado_id', convidadoId)
      .eq('active', true)

    if (codeError) throw codeError
    return response({ ok: true })
  } catch (error) {
    console.error('admin-alterar-codigo:', error)
    return response({ error: 'Não foi possível alterar o código.' }, 500)
  }
})
