import { contextBridge } from 'electron'

// API mínima e somente-leitura. Novas capacidades (arquivos, terminal, IA)
// entram nas próximas etapas como canais IPC validados, nunca como acesso livre.
contextBridge.exposeInMainWorld('codementor', {
  platform: process.platform,
})
