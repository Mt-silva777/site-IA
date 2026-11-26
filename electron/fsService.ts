import fs from 'node:fs/promises'
import path from 'node:path'
import { shell } from 'electron'

export interface TreeNode {
  name: string
  /** Caminho relativo à raiz do projeto, sempre com "/". */
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
}

const IGNORED = new Set(['node_modules', '.git', '.DS_Store'])
const MAX_READ = 2 * 1024 * 1024
const MAX_WRITE = 5 * 1024 * 1024
const MAX_ENTRIES = 5000
const MAX_DEPTH = 8

// A raiz só é definida pelo processo principal (via diálogo do sistema).
// O renderer nunca consegue escolher a raiz sozinho.
let root: string | null = null
let realRoot: string | null = null

export async function setRoot(dir: string): Promise<void> {
  root = path.resolve(dir)
  realRoot = await fs.realpath(root)
}

/** Traduz erros do sistema de arquivos em mensagens curtas, sem expor caminhos absolutos. */
export function friendlyError(err: unknown): string {
  const code = (err as NodeJS.ErrnoException)?.code
  switch (code) {
    case 'EEXIST': return 'Já existe um item com esse nome.'
    case 'ENOENT': return 'Arquivo ou pasta não encontrado.'
    case 'EACCES':
    case 'EPERM': return 'Sem permissão para essa operação.'
    case 'ENOTDIR': return 'O caminho não é uma pasta.'
    case 'EISDIR': return 'O caminho é uma pasta, não um arquivo.'
    case 'ENOTEMPTY': return 'A pasta não está vazia.'
    case 'ENOSPC': return 'Sem espaço em disco.'
    default: return err instanceof Error ? err.message : String(err)
  }
}

export function projectName(): string | null {
  return root ? path.basename(root) : null
}

const inside = (base: string, target: string): boolean => {
  const r = path.relative(base, target)
  return r === '' || (r !== '..' && !r.startsWith('..' + path.sep) && !path.isAbsolute(r))
}

/** Converte um caminho relativo vindo do renderer em absoluto, garantindo que fica dentro do projeto. */
async function resolveSafe(rel: unknown, allowRoot = false): Promise<string> {
  if (!root || !realRoot) throw new Error('Nenhum projeto aberto.')
  if (typeof rel !== 'string' || rel.length > 1024 || rel.includes('\0')) throw new Error('Caminho inválido.')
  const abs = path.resolve(root, rel)
  if (!inside(root, abs)) throw new Error('Caminho fora do projeto.')
  if (abs === root && !allowRoot) throw new Error('Operação não permitida na raiz do projeto.')

  // Protege contra links simbólicos que apontem para fora do projeto.
  let probe = abs
  for (;;) {
    try {
      const real = await fs.realpath(probe)
      if (!inside(realRoot, real)) throw new Error('Caminho fora do projeto.')
      break
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
      const parent = path.dirname(probe)
      if (parent === probe) throw e
      probe = parent
    }
  }
  return abs
}

export function validateName(name: unknown): string {
  if (typeof name !== 'string') throw new Error('Nome inválido.')
  const n = name.trim()
  if (!n || n.length > 255) throw new Error('Nome inválido.')
  if (n === '.' || n === '..') throw new Error('Nome inválido.')
  if (/[\\/\0<>:"|?*]/.test(n)) throw new Error('O nome não pode conter / \\ : * ? " < > |')
  return n
}

async function walk(dirAbs: string, relPosix: string, depth: number, counter: { n: number }): Promise<TreeNode[]> {
  if (depth > MAX_DEPTH) return []
  const entries = await fs.readdir(dirAbs, { withFileTypes: true })
  const nodes: TreeNode[] = []
  for (const e of entries) {
    if (IGNORED.has(e.name) || e.isSymbolicLink()) continue
    if (counter.n++ >= MAX_ENTRIES) break
    const rel = relPosix ? `${relPosix}/${e.name}` : e.name
    if (e.isDirectory()) {
      nodes.push({ name: e.name, path: rel, type: 'dir', children: await walk(path.join(dirAbs, e.name), rel, depth + 1, counter) })
    } else if (e.isFile()) {
      nodes.push({ name: e.name, path: rel, type: 'file' })
    }
  }
  nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
  return nodes
}

export async function listTree(): Promise<TreeNode[]> {
  const abs = await resolveSafe('', true)
  return walk(abs, '', 0, { n: 0 })
}

export async function readFile(rel: unknown): Promise<{ binary: boolean; content: string }> {
  const abs = await resolveSafe(rel)
  const st = await fs.stat(abs)
  if (!st.isFile()) throw new Error('Não é um arquivo.')
  if (st.size > MAX_READ) throw new Error('Arquivo grande demais para o editor (limite de 2 MB).')
  const buf = await fs.readFile(abs)
  if (buf.subarray(0, 8000).includes(0)) return { binary: true, content: '' }
  return { binary: false, content: buf.toString('utf8') }
}

export async function writeFile(rel: unknown, content: unknown): Promise<void> {
  if (typeof content !== 'string') throw new Error('Conteúdo inválido.')
  if (Buffer.byteLength(content, 'utf8') > MAX_WRITE) throw new Error('Conteúdo grande demais (limite de 5 MB).')
  const abs = await resolveSafe(rel)
  const st = await fs.stat(abs).catch(() => null)
  if (st && !st.isFile()) throw new Error('Não é um arquivo.')
  // Escrita em arquivo temporário + rename, para não deixar o arquivo pela metade em caso de falha.
  const tmp = `${abs}.cm-tmp`
  try {
    await fs.writeFile(tmp, content, 'utf8')
    await fs.rename(tmp, abs)
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => undefined)
    throw e
  }
}

export async function createFile(rel: unknown): Promise<void> {
  const abs = await resolveSafe(rel)
  validateName(path.basename(abs))
  await fs.writeFile(abs, '', { flag: 'wx' }) // falha se já existir
}

export async function createDir(rel: unknown): Promise<void> {
  const abs = await resolveSafe(rel)
  validateName(path.basename(abs))
  await fs.mkdir(abs) // não recursivo: falha se já existir
}

export async function renamePath(from: unknown, to: unknown): Promise<void> {
  const a = await resolveSafe(from)
  const b = await resolveSafe(to)
  validateName(path.basename(b))
  if (await fs.access(b).then(() => true, () => false)) throw new Error('Já existe um item com esse nome.')
  await fs.rename(a, b)
}

/** Exclusão recuperável: envia para a lixeira do sistema, nunca apaga definitivamente. */
export async function removePath(rel: unknown): Promise<void> {
  const abs = await resolveSafe(rel)
  await shell.trashItem(abs)
}

const STARTER: Record<string, string> = {
  'index.html': `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meu site</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Olá, mundo!</h1>
    <script src="script.js"></script>
  </body>
</html>
`,
  'style.css': `body {
  font-family: system-ui, sans-serif;
}
`,
  'script.js': `console.log('Olá do script.js!')
`,
}

/** Cria os arquivos iniciais numa pasta vazia. */
export async function scaffoldIfEmpty(): Promise<boolean> {
  const abs = await resolveSafe('', true)
  const entries = await fs.readdir(abs)
  if (entries.length > 0) return false
  for (const [name, content] of Object.entries(STARTER)) {
    await fs.writeFile(path.join(abs, name), content, { flag: 'wx' })
  }
  return true
}

export async function isEmptyDir(dir: string): Promise<boolean> {
  return (await fs.readdir(dir)).length === 0
}
