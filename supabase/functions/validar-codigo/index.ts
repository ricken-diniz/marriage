import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  try {
    const { code } = await request.json()
    if (typeof code !== 'string' || !code.trim()) {
      return response({ error: 'Código obrigatório.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const publishableKey =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')

    if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
      throw new Error('Variáveis de ambiente do Supabase não configuradas.')
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const codeHash = await hashCode(code.trim())
    const { data: accessCode, error: lookupError } = await admin
      .from('access_codes')
      .select('login_email')
      .eq('code_hash', codeHash)
      .eq('active', true)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (!accessCode) {
      return response({ error: 'Código inválido.' }, 401)
    }

    const auth = createClient(supabaseUrl, publishableKey)
    const { data, error: signInError } = await auth.auth.signInWithPassword({
      email: accessCode.login_email,
      password: code.trim(),
    })

    if (signInError || !data.session) {
      console.error('validar-codigo signIn:', signInError)
      return response({ error: 'Não foi possível criar a sessão.' }, 401)
    }

    return response({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch (error) {
    console.error('validar-codigo:', error)
    return response({ error: 'Erro ao validar o código.' }, 500)
  }
})
