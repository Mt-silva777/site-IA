import './monacoSetup'
import * as monaco from 'monaco-editor'

const LANGS: Record<string, string> = {
  html: 'html', htm: 'html',
  css: 'css',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  json: 'json', md: 'markdown', svg: 'xml', xml: 'xml',
}

export function languageFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return LANGS[ext] ?? 'plaintext'
}

export const uriFor = (path: string) => monaco.Uri.from({ scheme: 'file', path: '/' + path })
export const pathFromUri = (uri: monaco.Uri) => uri.path.replace(/^\//, '')

/** Cria o modelo do arquivo se ainda não existir. Nunca sobrescreve texto já editado. */
export function ensureModel(path: string, content: string): monaco.editor.ITextModel {
  const uri = uriFor(path)
  return monaco.editor.getModel(uri) ?? monaco.editor.createModel(content, languageFor(path), uri)
}

export const getModel = (path: string) => monaco.editor.getModel(uriFor(path))
export const getModelValue = (path: string) => getModel(path)?.getValue() ?? null
export const disposeModel = (path: string) => getModel(path)?.dispose()
