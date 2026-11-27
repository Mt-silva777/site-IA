import type { ViteDevServer } from 'vite'
import { BRIDGE_SCRIPT } from './previewBridge'

const PORT = 5174 // o app usa 5173; o projeto do usuário usa 5174 (ou a próxima livre)

// Vite 7 é ESM; o processo principal é CommonJS. import() dinâmico "de verdade":
const dynamicImport = new Function('s', 'return import(s)') as (s: string) => Promise<typeof import('vite')>

let server: ViteDevServer | null = null
let current: { url: string; root: string } | null = null

export interface PreviewInfo {
  url: string
}

export async function stopPreview(): Promise<void> {
  const s = server
  server = null
  current = null
  if (s) await s.close()
}

export function previewUrl(): string | null {
  return current?.url ?? null
}

/** Sobe um servidor Vite (com HMR) servindo a pasta do projeto. Substitui o anterior, se houver. */
export async function startPreview(root: string): Promise<PreviewInfo> {
  await stopPreview()
  const { createServer } = await dynamicImport('vite')
  const s = await createServer({
    root,
    configFile: false, // nunca executa um vite.config do projeto do usuário
    clearScreen: false,
    logLevel: 'warn',
    server: { host: '127.0.0.1', port: PORT, strictPort: false, open: false },
    plugins: [
      {
        name: 'codementor-error-bridge',
        transformIndexHtml: () => [{ tag: 'script', children: BRIDGE_SCRIPT, injectTo: 'head-prepend' as const }],
      },
    ],
  })
  await s.listen()
  const addr = s.httpServer?.address()
  if (!addr || typeof addr === 'string') {
    await s.close()
    throw new Error('Não foi possível iniciar o servidor de preview.')
  }
  server = s
  current = { url: `http://127.0.0.1:${addr.port}`, root }
  return { url: current.url }
}
