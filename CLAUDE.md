# Projeto Automações SGE

## Ambientes
- Quando o usuário pedir para abrir a homologação, abra https://homologa-sge.pontoid.com.br/ (navegador integrado).

## Geração e manutenção de automações
- Para criar, corrigir, estabilizar ou investigar testes Playwright/E2E, use a skill `playwright-e2e-engineer` (`.claude/skills/playwright-e2e-engineer/SKILL.md`) e os recursos relacionados dela.
- Identifique o cenário e siga os requisitos de preflight, exploração da UI, implementação e validação descritos pela skill.
- Para explorar a UI, priorize o navegador do MCP Playwright (`mcp__playwright__*`): primeiro verifique se já há um aberto (`browser_tabs`) e reutilize-o; só abra um novo se não houver. Use o navegador interno (`mcp__Claude_Browser__*`) apenas em último caso, quando o MCP Playwright estiver indisponível.
- No MCP Playwright, evite `browser_snapshot` da página inteira: use `target` para capturar só o trecho de interesse (menu, formulário, grade) ou `browser_evaluate` devolvendo apenas os dados necessários.
- Navegue no SGE apenas por menus, botões e controles visíveis; não force rotas internas nem simule chamadas de API.
- Execute Playwright com `workers: 1` para evitar concorrência de sessão.
- Use o prefixo `QAAUTO` nos dados criados pela automação e exclua somente registros criados pela própria execução, salvo configuração explícita e restrita à busca QAAUTO.
- Mantenha dados configuráveis em `dados_<entidade>.json`; não grave credenciais em arquivos versionados.
