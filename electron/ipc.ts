import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { shell } from 'electron'
import * as fsService from './fsService'
import * as preview from './previewService'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

/** Registra os canais IPC. Cada canal valida a origem do chamador e devolve {ok,data}|{ok,error}. */
export function registerIpc(devUrl: string | undefined): void {
  const trusted = (e: IpcMainInvokeEvent): boolean => {
    if (e.senderFrame !== e.sender.mainFrame) return false // ignora subframes (ex.: preview)
    const url = e.senderFrame?.url ?? ''
    return url.startsWith('file://') || (!!devUrl && url.startsWith(devUrl))
  }

  function handle<A extends unknown[], T>(channel: string, fn: (e: IpcMainInvokeEvent, ...args: A) => Promise<T>): void {
    ipcMain.handle(channel, async (e, ...args): Promise<Result<T>> => {
      if (!trusted(e)) return { ok: false, error: 'Origem não autorizada.' }
      try {
        return { ok: true, data: await fn(e, ...(args as A)) }
      } catch (err) {
        return { ok: false, error: fsService.friendlyError(err) }
      }
    })
  }

  const parent = (e: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(e.sender) ?? undefined

  handle('project:open', async (e) => {
    const win = parent(e)
    const opts = { title: 'Abrir pasta do projeto', properties: ['openDirectory' as const] }
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (r.canceled || r.filePaths.length === 0) return { canceled: true as const }
    await fsService.setRoot(r.filePaths[0])
    return { canceled: false as const, name: fsService.projectName()! }
  })

  handle('project:create', async (e) => {
    const win = parent(e)
    const opts = {
      title: 'Escolha ou crie uma pasta VAZIA para o novo projeto',
      properties: ['openDirectory' as const, 'createDirectory' as const],
    }
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (r.canceled || r.filePaths.length === 0) return { canceled: true as const }
    if (!(await fsService.isEmptyDir(r.filePaths[0]))) {
      throw new Error('A pasta escolhida não está vazia. Escolha uma pasta vazia ou use "Abrir projeto".')
    }
    await fsService.setRoot(r.filePaths[0])
    await fsService.scaffoldIfEmpty()
    return { canceled: false as const, name: fsService.projectName()! }
  })

  handle('preview:start', async () => {
    const root = fsService.getRoot()
    if (!root) throw new Error('Nenhum projeto aberto.')
    return preview.startPreview(root)
  })
  handle('preview:stop', async () => preview.stopPreview())
  handle('preview:openExternal', async (_e, url: unknown) => {
    const base = preview.previewUrl()
    // Só abre URLs do próprio servidor de preview (nunca endereços arbitrários).
    if (typeof url !== 'string' || !base || !(url === base || url.startsWith(base + '/'))) throw new Error('URL não autorizada.')
    await shell.openExternal(url)
  })

  handle('project:tree', async () => fsService.listTree())
  handle('fs:read', async (_e, p: unknown) => fsService.readFile(p))
  handle('fs:write', async (_e, p: unknown, content: unknown) => fsService.writeFile(p, content))
  handle('fs:createFile', async (_e, p: unknown) => fsService.createFile(p))
  handle('fs:createDir', async (_e, p: unknown) => fsService.createDir(p))
  handle('fs:rename', async (_e, from: unknown, to: unknown) => fsService.renamePath(from, to))
  handle('fs:delete', async (_e, p: unknown) => fsService.removePath(p))
}
