import { supabase } from '../lib/supabaseClient'

export async function garantirSessao() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    return data.session
  }
  return session
}

export async function validarCodigo(code: string) {
  const { data, error } = await supabase.functions.invoke('validar-codigo', {
    body: { code },
  })
  if (error) throw error
  return data
}