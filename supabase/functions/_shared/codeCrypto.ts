const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function getKey() {
  const secret = Deno.env.get('CODE_ENCRYPTION_KEY')
  if (!secret) throw new Error('CODE_ENCRYPTION_KEY não configurada.')
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptCode(code: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getKey(),
    encoder.encode(code),
  )
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`
}

export async function decryptCode(value: string) {
  const [encodedIv, encodedValue] = value.split('.')
  if (!encodedIv || !encodedValue) throw new Error('Código criptografado inválido.')
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(encodedIv) },
    await getKey(),
    base64ToBytes(encodedValue),
  )
  return decoder.decode(decrypted)
}
