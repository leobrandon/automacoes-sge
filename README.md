# Automações SGE

Testes end-to-end (E2E) com [Playwright](https://playwright.dev/) e TypeScript para o **SGE (Ponto iD)**, executados contra o ambiente de homologação: <https://homologa-sge.pontoid.com.br/>.

Cada cadastro do SGE tem automações de **criar**, **excluir** e **criar + excluir**, cobrindo módulos como Alimentação Escolar, Aluno, Cadastro, Colaborador, Configurações, Conselho Tutelar, Ensino, Escola, Financeiro, Infraestrutura e Transporte Escolar.

## Pré-requisitos

- Node.js 18 ou superior
- Google Chrome instalado (o projeto de regressão usa `channel: 'chrome'`)
- Acesso ao ambiente de homologação do SGE

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` na raiz a partir do modelo:

```bash
cp .env.example .env
```

| Variável | Descrição |
| --- | --- |
| `SGE_USUARIO` / `SGE_SENHA` | Credenciais do usuário principal |
| `SGE_USUARIO_UNIDADE` / `SGE_SENHA_UNIDADE` | Credenciais do usuário de unidade |
| `BASE_URL` | URL do ambiente (padrão: homologação) |

O `.env` está no `.gitignore`. **Nunca versione credenciais.** Para ver o navegador durante a execução, defina `HEADLESS=false`.

## Executando os testes

```bash
# Regressão E2E (specs *_action.spec.ts e *_fixture.spec.ts)
npm run test:regression

# Testes unitários das factories (*.factory.spec.ts)
npm run test:unit

# Um spec específico
npx playwright test "tests/Cadastro/Tipo de Ocorrência Escolar/criar_tipo_ocorrencia_escolar_action.spec.ts" --project=regression
```

A execução usa `workers: 1` para evitar conflito de sessão no SGE.

## Estrutura

```
src/
  actions/     # Fluxos reutilizáveis de criar/excluir cada entidade
  factories/   # Geração de dados de teste
  fixtures/    # Fixtures Playwright (ex.: paginaLogada)
  helpers/     # Navegação por menu, datepicker, select2, geradores (CPF, CNPJ, etc.)
  pages/       # Page Objects (ex.: LoginPage)
tests/         # Specs organizados por menu do SGE e por entidade
docs/          # Planos e registros de bugs encontrados
planejamento/  # Planejamentos de automações
.claude/skills # Skill do Claude Code para criar e manter os testes
```

Cada entidade em `tests/<Menu>/<entidade>/` costuma ter:

- `criar_<entidade>_action.spec.ts`, `excluir_<entidade>_action.spec.ts` e `criar_e_excluir_<entidade>_action.spec.ts`
- `dados_<entidade>.json`: dados configuráveis do cadastro
- `dados_exclusao_<entidade>.json`: critérios para a exclusão

## Convenções

- **Navegação apenas pela UI**: menus, botões e controles visíveis, sem rotas internas forçadas nem chamadas de API simuladas.
- **Dados de teste** criados pela automação usam o prefixo `QAAUTO`.
- **Exclusão** apenas de registros criados pela própria execução, salvo configuração explícita e restrita à busca `QAAUTO`.
- **Dados configuráveis** ficam em `dados_<entidade>.json`.

## Desenvolvimento com Claude Code

O arquivo [`CLAUDE.md`](CLAUDE.md) e a skill [`playwright-e2e-engineer`](.claude/skills/playwright-e2e-engineer/SKILL.md) orientam a criação, correção e estabilização dos testes: exploração da UI, implementação e validação.
