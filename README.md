# CodeMentor Studio

Ambiente desktop local para aprender a programar sites: editor, terminal, preview e uma IA professora (Gemini) que **ensina, não programa pelo aluno**.

## Estado atual: Etapa 1 (estrutura visual)

Funciona (escrito, ainda **não executado** — veja "Não verificado"):
- Janela Electron com `contextIsolation`, `nodeIntegration` desligado e `sandbox` ligado.
- Três painéis (Editor+Terminal | Professora | Preview) com divisórias arrastáveis, ocultar, maximizar e "Restaurar layout".
- Divisória vertical independente entre editor e terminal.
- Layout salvo em `localStorage` (migra para arquivo de configurações na Etapa 8).
- Editor Monaco local (sem CDN), tema escuro, rascunho HTML em memória.
- Preview: alternância desktop/tablet/mobile (largura do frame).

Ainda **não** implementado (placeholders explícitos na interface):
- Arquivos/projetos reais (Etapa 2), preview com Vite/HMR (3), terminal real (4), Gemini (5), pedagogia (6), monitoramento (7), configurações/safeStorage (8), tela de configurações.

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

## Não verificado
`npm install`, `vite`, Electron e a checagem completa de tipos **não foram executados** (sem acesso de rede no ambiente de desenvolvimento). Só foi validada a sintaxe de todos os arquivos TS/TSX/JS.
