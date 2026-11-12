# Organizar módulos Playwright no projeto SGE — Plano

**Goal:** Colocar cada automação como pasta direta de `tests/` no projeto Automações SGE e manter disponível a skill oficial de geração.

**Architecture:** Os diretórios de módulo existentes serão movidos para `tests/<modulo>`, preservando arquivos de teste, dados, configurações e snapshots. O `src` compartilhado será copiado para o novo projeto e imports relativos serão ajustados para a nova profundidade. A skill Playwright será copiada para `.agents/skills` e referenciada por `AGENTS.md`.

**Tech Stack:** TypeScript, Playwright Test, PowerShell.

**Spec:** Pedido do usuário em 2026-10-02 para remover `tests/Playwright Iniciante`, expor cada módulo diretamente em `tests` e manter a skill de geração.

## Global Constraints

- `workers: 1`.
- Navegação do SGE apenas por menus e elementos visíveis.
- Registros de automação identificados com `QAAUTO`; limpeza limitada aos criados pela execução.
- Preservar JSONs, snapshots, specs e scripts existentes.
- Não copiar `.env`, credenciais nem `node_modules`.
- Não alterar o comportamento dos testes durante a reorganização.

## Review Focus

- Imports relativos ao `src` após achatar pastas — verificar que todos resolvem no novo projeto.
- Leitura de dados da automação Turma a partir do módulo Aluno — verificar que o caminho entre módulos permanece válido.
- Snapshots ocultos `.playwright-mcp` — preservar diretórios e arquivos ocultos usados pelos módulos.
- Skill de geração — verificar `SKILL.md` e `playwrightSKILL.md` no destino.
- Árvore final — verificar ausência de `tests/Playwright Iniciante` e presença de cada módulo diretamente em `tests/`.

### Task 1: Migrar e conferir módulos

**Files:** pastas `tests/<modulo>`, `src/`, `.playwright-mcp/`, `.agents/skills/gerar-script-playwright/`, `AGENTS.md`.

- [x] Copiar os módulos e seus arquivos auxiliares preservando ocultos e JSONs.
- [x] Normalizar imports de `src` para `../../src`.
- [x] Copiar o `src` compartilhado e a skill oficial.
- [x] Documentar no `AGENTS.md` como acionar a skill e as regras operacionais aplicáveis.
- [x] Conferir referências locais e contagens; só então remover os diretórios antigos.

