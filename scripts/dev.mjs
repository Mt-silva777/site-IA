// Orquestra o desenvolvimento sem dependências extras:
// 1) compila o código do Electron, 2) sobe o Vite, 3) abre o Electron apontando para ele.
import { spawn } from 'node:child_process'
import net from 'node:net'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const PORT = 5173

const run = (cmd, args, opts = {}) =>
  spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })

function waitForPort(port, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const s = net.connect(port, '127.0.0.1')
      s.once('connect', () => { s.destroy(); resolve() })
      s.once('error', () => {
        s.destroy()
        if (Date.now() - start > timeoutMs) reject(new Error('Vite não iniciou a tempo'))
        else setTimeout(attempt, 300)
      })
    }
    attempt()
  })
}

const tsc = run(npx, ['tsc', '-p', 'tsconfig.electron.json'])
await new Promise((res, rej) => tsc.on('exit', (c) => (c === 0 ? res() : rej(new Error('Falha ao compilar o Electron')))))

const vite = run(npx, ['vite'])
await waitForPort(PORT)

const electronBin = require('electron') // caminho do executável
const electron = spawn(electronBin, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_DEV_SERVER_URL: `http://localhost:${PORT}` },
})

const shutdown = () => { vite.kill(); electron.kill() }
electron.on('exit', () => { vite.kill(); process.exit(0) })
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
