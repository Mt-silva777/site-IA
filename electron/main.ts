import { app, BrowserWindow, session, shell } from 'electron'
import path from 'node:path'
import { registerIpc } from './ipc'
import { stopPreview } from './previewService'

const DEV_URL = process.env.VITE_DEV_SERVER_URL // definido por scripts/dev.mjs
const isDev = !!DEV_URL

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    title: 'CodeMentor Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Links externos abrem no navegador do sistema, nunca dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    const allowed = isDev ? DEV_URL! : 'file://'
    if (!url.startsWith(allowed)) e.preventDefault()
  })

  if (isDev) void win.loadURL(DEV_URL!)
  else void win.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'))
}

app.whenReady().then(() => {
  // CSP restritiva apenas no app empacotado (em dev o Vite injeta scripts inline).
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
              "font-src 'self' data:; img-src 'self' data:; worker-src 'self' blob:; " +
              "connect-src 'self'; frame-src http://localhost:* http://127.0.0.1:* data: blob:",
          ],
        },
      })
    })
  }
  registerIpc(DEV_URL)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  void stopPreview()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
