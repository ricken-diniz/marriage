import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptCode } from '../_shared/codeCrypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { convidado_id: convidadoId } = await request.json()
    if (typeof convidadoId !== 'string') return response({ error: 'Convidado obrigatório.' }, 400)

    const { data: accessCode, error: lookupError } = await admin
      .from('access_codes')
      .select('codigo_criptografado')
      .eq('convidado_id', convidadoId)
      .eq('active', true)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (!accessCode?.codigo_criptografado) {
      return response({ error: 'Código não disponível. Defina um novo código para este convidado.' }, 404)
    }

    return response({ code: await decryptCode(accessCode.codigo_criptografado) })
  } catch (error) {
    console.error('admin-ver-codigo:', error)
    return response({ error: 'Não foi possível recuperar o código.' }, 500)
  }
})
