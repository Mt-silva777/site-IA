import type { CodementorApi, Result } from '../types'

/** Chama a API do Electron e transforma {ok:false} em exceção. */
export async function call<T>(fn: (api: CodementorApi) => Promise<Result<T>>): Promise<T> {
  const api = window.codementor
  if (!api) throw new Error('A API do aplicativo desktop não está disponível. Abra o CodeMentor Studio pelo Electron.')
  const r = await fn(api)
  if (!r.ok) throw new Error(r.error)
  return r.data
}
