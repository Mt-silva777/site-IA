import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Workers empacotados localmente (nada de CDN: o app deve funcionar offline).
self.MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === 'json') return new JsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker()
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    return new EditorWorker()
  },
}

const STARTER = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Meu site</title>
  </head>
  <body>
    <h1>Olá, mundo!</h1>
  </body>
</html>
`

export function EditorPane() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!host.current) return
    const editor = monaco.editor.create(host.current, {
      value: STARTER,
      language: 'html',
      theme: 'vs-dark',
      automaticLayout: true, // acompanha o redimensionamento dos painéis
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      tabSize: 2,
      scrollBeyondLastLine: false,
      padding: { top: 8 },
    })
    return () => editor.dispose()
  }, [])

  return (
    <div className="editor-pane">
      <div className="tabs">
        <div className="tab active" title="Rascunho em memória — arquivos reais chegam na Etapa 2">
          rascunho.html
        </div>
      </div>
      <div ref={host} className="editor-host" />
    </div>
  )
}
