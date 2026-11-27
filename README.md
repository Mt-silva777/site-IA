# CodeMentor Studio

Ambiente desktop local para aprender a programar sites: editor, terminal, preview e uma IA professora (Gemini) que **ensina, não programa pelo aluno**.

## Estado atual: Etapas 1, 2 e 3 escritas (layout, projetos/arquivos, preview)

Funciona (escrito, ainda **não executado** — veja "Não verificado"):
- Janela Electron com `contextIsolation`, `nodeIntegration` desligado e `sandbox` ligado.
- Três painéis (Editor+Terminal | Professora | Preview) com divisórias arrastáveis, ocultar, maximizar e "Restaurar layout".
- Divisória vertical independente entre editor e terminal.
- Layout salvo em `localStorage` (migra para arquivo de configurações na Etapa 8).
- Editor Monaco local (sem CDN), tema escuro, rascunho HTML em memória.
- Preview: alternância desktop/tablet/mobile (largura do frame).
- **Etapa 2:** abrir/criar projeto (diálogo do sistema), explorador de arquivos, abas, criar/renomear/excluir arquivos e pastas (exclusão vai para a lixeira), salvamento automático (800 ms) + Ctrl+S + ao perder o foco, diagnósticos locais do Monaco (HTML/CSS/JS) com contagem de erros/avisos.
- **Etapa 3:** preview real. O processo principal sobe um servidor Vite (API `createServer`, HMR, `configFile: false` para nunca executar config do projeto do aluno) em `127.0.0.1:5174` servindo a pasta aberta; o painel direito exibe num iframe (sandbox). Erros do navegador (erros JS, promises rejeitadas, recursos que falham, `console.error`) voltam por `postMessage` e aparecem numa lista no preview. Botões: desktop/tablet/mobile, recarregar, abrir no navegador (só URLs do próprio servidor). O autosave grava o arquivo e o Vite atualiza o preview sem F5. O servidor encerra ao trocar de projeto e ao sair do app.
- Backend de arquivos (`electron/fsService.ts`) **testado de verdade** com um stub do Electron: bloqueio de `../`, caminhos absolutos e links simbólicos para fora do projeto, nomes inválidos, limites de tamanho, binários, rename sem sobrescrever.

Ainda **não** implementado (placeholders explícitos na interface):
- Terminal real (4), Gemini (5), pedagogia (6), monitoramento (7), configurações/safeStorage (8), tela de configurações.

## Requisitos
- Node.js 20+ (testado o ambiente com Node 22), npm, Git.

## Instalação e execução
```bash
npm install
npm run dev        # compila o Electron, sobe o Vite e abre o app
npm run typecheck  # checagem de tipos
npm run build && npx electron .   # versão empacotada localmente
```
As versões em `package.json` foram escolhidas sem acesso à internet; após o primeiro `npm install`, confira `npm outdated` e ajuste se algum intervalo não resolver.

## Chave Gemini (a partir da Etapa 5)
Copie `.env.example` para `.env` e preencha `GEMINI_API_KEY` apenas em desenvolvimento. `.env` está no `.gitignore`. Nunca publique a chave.

## Site de apresentação
A pasta `site/` contém uma página estática (HTML/CSS/JS, sem dependências) publicada na Vercel, com a pasta `site/` como diretório raiz do projeto. Não faz parte do app desktop.

## Não verificado
`npm install`, `vite`, Electron e a checagem completa de tipos **não foram executados** (sem acesso de rede no ambiente de desenvolvimento). Validado: sintaxe de todos os arquivos TS/TSX/JS, o backend de arquivos (testes acima) e a renderização da página `site/` (desktop e celular). **Não validado:** o preview da Etapa 3 (o Vite não está instalado aqui, então servidor, HMR e a ponte de erros nunca rodaram), a interface React da Etapa 2 rodando dentro do Electron (explorador, abas, autosave), o Monaco com múltiplos modelos e o diálogo de abrir pasta.
