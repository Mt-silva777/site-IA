export interface TreeNode {
  name: string
  /** Caminho relativo à raiz do projeto, com "/". */
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string }
export type OpenResult = { canceled: true } | { canceled: false; name: string }

export interface CodementorApi {
  platform: string
  project: {
    open(): Promise<Result<OpenResult>>
    create(): Promise<Result<OpenResult>>
    tree(): Promise<Result<TreeNode[]>>
  }
  fs: {
    read(path: string): Promise<Result<{ binary: boolean; content: string }>>
    write(path: string, content: string): Promise<Result<void>>
    createFile(path: string): Promise<Result<void>>
    createDir(path: string): Promise<Result<void>>
    rename(from: string, to: string): Promise<Result<void>>
    remove(path: string): Promise<Result<void>>
  }
}
