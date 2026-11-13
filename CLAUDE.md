# Projeto Automações SGE

## Ambientes
- Quando o usuário pedir para abrir a homologação, abra https://homologa-sge.pontoid.com.br/ (navegador integrado).

## Regras de negócio
- Antes de automatizar um fluxo cuja regra de negócio você não conhece (validações, limites, dependências entre cadastros, mensagens de recusa), consulte as fontes abaixo, nesta ordem, em vez de deduzir pela tela:
  1. Manual do dev do SUE (http://192.168.88.109:8081/): use as tools `mcp__sue-regras-negocio__*` (`buscar_documentacao`, `ler_documento`). É a fonte mais precisa e cita as regras por ID (ex.: MOD-MAG-004).
  2. Base de conhecimento local: `E:\Projetos Agentes IA\Projeto Ponto iD\base_de_conhecimento` (playbooks e manuais por módulo; use Grep/Glob pelo assunto).
  3. Wiki Ponto iD (releases, perguntas frequentes, guias e manuais): https://wiki.pontoid.com.br/
- Use as regras para definir o que a automação deve provar (aceites e recusas, com a mensagem exata do SGE). Se a documentação divergir da UI real, vale a UI: documente a divergência no relato final em vez de ajustar o esperado.

## Geração e manutenção de automações
- Para criar, corrigir, estabilizar ou investigar testes Playwright/E2E, use a skill `playwright-e2e-engineer` (`.claude/skills/playwright-e2e-engineer/SKILL.md`) e os recursos relacionados dela.
- Identifique o cenário e siga os requisitos de preflight, exploração da UI, implementação e validação descritos pela skill.
- Para explorar a UI, priorize o navegador do MCP Playwright (`mcp__playwright__*`): primeiro verifique se já há um aberto (`browser_tabs`) e reutilize-o; só abra um novo se não houver. Use o navegador interno (`mcp__Claude_Browser__*`) apenas em último caso, quando o MCP Playwright estiver indisponível.
- No MCP Playwright, evite `browser_snapshot` da página inteira: use `target` para capturar só o trecho de interesse (menu, formulário, grade) ou `browser_evaluate` devolvendo apenas os dados necessários.
- Navegue no SGE apenas por menus, botões e controles visíveis; não force rotas internas nem simule chamadas de API.
- Execute Playwright com `workers: 1` para evitar concorrência de sessão.
- Use o prefixo `QAAUTO` nos dados criados pela automação e exclua somente registros criados pela própria execução, salvo configuração explícita e restrita à busca QAAUTO.
- Mantenha dados configuráveis em `dados_<entidade>.json`; não grave credenciais em arquivos versionados.
