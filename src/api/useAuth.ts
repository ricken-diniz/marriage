import { useEffect, useState } from 'react'
import { garantirSessao, validarCodigo } from './auth'

export function useAuth() {
  const [carregando, setCarregando] = useState(true)
  const [identificado, setIdentificado] = useState(false)

  useEffect(() => {
    garantirSessao().finally(() => setCarregando(false))
  }, [])

  async function enviarCodigo(code: string) {
    const resultado = await validarCodigo(code)
    setIdentificado(true)
    return resultado
  }

  return { carregando, identificado, enviarCodigo }
}