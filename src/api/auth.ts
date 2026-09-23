import { supabase } from '../lib/supabaseClient'

export async function garantirSessao() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function validarCodigo(code: string) {
  const { data, error } = await supabase.functions.invoke('validar-codigo', {
    body: { code },
  })
  if (error) throw error

  const { access_token: accessToken, refresh_token: refreshToken } = data ?? {}
  if (!accessToken || !refreshToken) {
    throw new Error('A função de validação não retornou uma sessão válida.')
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (sessionError) throw sessionError

  return sessionData.session
}

export async function criarConvidado(nome: string, code: string) {
  const { data, error } = await supabase.functions.invoke('admin-criar-convidado', {
    body: { nome, code },
  })
  if (error) throw error
  return data
}

export async function alterarCodigoConvidado(convidadoId: string, code: string) {
  const { data, error } = await supabase.functions.invoke('admin-alterar-codigo', {
    body: { convidado_id: convidadoId, code },
  })
  if (error) throw error
  return data
}

export async function verCodigoConvidado(convidadoId: string) {
  const { data, error } = await supabase.functions.invoke('admin-ver-codigo', {
    body: { convidado_id: convidadoId },
  })
  if (error) throw error
  return data.code as string
}