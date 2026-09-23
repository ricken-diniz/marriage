import { useEffect, useState } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { garantirSessao, validarCodigo } from './auth'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [carregando, setCarregando] = useState(true)
  const [identificado, setIdentificado] = useState(false)
  const [usuario, setUsuario] = useState<User | null>(null)

  function atualizarUsuario(session: Session | null) {
    setIdentificado(Boolean(session))
    setUsuario(session?.user ?? null)
  }

  useEffect(() => {
    garantirSessao()
      .then(atualizarUsuario)
      .catch(() => atualizarUsuario(null))
      .finally(() => setCarregando(false))

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        atualizarUsuario(session)
      },
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  async function enviarCodigo(code: string) {
    const session = await validarCodigo(code)
    atualizarUsuario(session)
    return session
  }

  const ehAdmin = usuario?.app_metadata?.role === 'admin'

  return { carregando, identificado, ehAdmin, enviarCodigo }
}