import { contextBridge, ipcRenderer } from 'electron'

// API restrita: apenas canais nomeados e validados no processo principal.
// Nenhum acesso genérico a ipcRenderer ou ao sistema de arquivos é exposto.
const call = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('codementor', {
  platform: process.platform,
  project: {
    open: () => call('project:open'),
    create: () => call('project:create'),
    tree: () => call('project:tree'),
  },
  fs: {
    read: (p: string) => call('fs:read', p),
    write: (p: string, content: string) => call('fs:write', p, content),
    createFile: (p: string) => call('fs:createFile', p),
    createDir: (p: string) => call('fs:createDir', p),
    rename: (from: string, to: string) => call('fs:rename', from, to),
    remove: (p: string) => call('fs:delete', p),
  },
})
