# Arquitetura do projeto e como executar

Leia este arquivo ao criar uma entidade nova ou ao decidir onde um código novo
deve ficar. Referência canônica de um módulo completo: **Atividades de AEE**
(`src/factories/atividade-aee.factory.ts`, `src/helpers/navigation/atividade-aee.navigation.ts`,
`src/actions/{criar,excluir}-atividade-aee.action.ts`, `tests/Cadastro/Ensino/atividades-aee/`).
Confira sempre o estado atual desses arquivos; eles podem ter evoluído.

## Camadas (de baixo para cima)

| Camada | Local | Responsabilidade |
| --- | --- | --- |
| Factory | `src/factories/<entidade>.factory.ts` | Tipos, listas de opções, `build<Entidade>(options, sequencia)` determinístico, `is<Entidade>QAAuto`. Sem Playwright. |
| Navegação | `src/helpers/navigation/<entidade>.navigation.ts` | Menu até a consulta/cadastro, `pesquisar<Entidade>`, `linha<Entidade>`, confirmações de modal. |
| Action | `src/actions/criar-<entidade>.action.ts`, `excluir-<entidade>.action.ts` | Preenche o formulário, salva e **prova a persistência** pela grade; exclusão pela lixeira e prova de remoção. |
| Config de spec | `tests/<Modulo>/<entidade>/<entidade>_config.ts` | Lê e valida `dados_<entidade>.json` e `dados_exclusao_<entidade>.json`. |
| Spec | `tests/<Modulo>/<entidade>/*.spec.ts` | Orquestra: lê config, login, chama actions, assertions finais. |
| Fixture (opcional) | `src/fixtures/<entidade>.fixture.ts` | Cria antes e exclui depois (`try/finally`) para outros testes que precisem do registro. |

Registre exports em `src/actions/index.ts` (e `src/helpers/index.ts` /
`src/helpers/navigation/index.ts` / `src/factories/index.ts` quando o padrão do
módulo vizinho fizer isso). Uma action nova sem export no índice quebra os imports
das specs, que usam `from '../../../src/actions'`.

## Nomes e pastas

- A raiz do projeto Playwright é a raiz do repositório (onde estão `playwright.config.ts` e `package.json`); `src/` e `tests/` são relativos a ela.
- `src/`: slug com hífen, singular (`tipo-recurso.factory.ts`, `criar-tipo-recurso.action.ts`).
- Specs/JSON/config em `tests/`: underscore (`criar_tipo_recurso_action.spec.ts`, `dados_tipo_recurso.json`, `tipo_recurso_config.ts`).
- Pasta em `tests/`: `tests/<Menu>/<Submenu>/.../<entidade-em-hífen>/` espelhando o caminho visível do menu do SGE (ex.: `tests/Cadastro/Ensino/atividades-aee/`, `tests/Cadastro/Ponto/escala/`, `tests/Cadastro/Colaborador/cargo/`, `tests/Alimentação Escolar/Cadastros Básicos/medida-caseira/`). Itens diretamente sob o menu ficam sem subpasta intermediária. Em imports de `src/`, conte um `../` por nível de pasta.
- Prefixo de dados: `QAAUTO <nome da entidade ou atividade semântica>`; a sequência é acrescentada pela factory.
- Índices (`src/actions/index.ts` etc.): abra-os; exporte nos que já listam entidades semelhantes.
- Se o código do vizinho divergir do texto desta skill, prevalece o código em vigor para estrutura/nomes e a skill para as proibições de qualidade; se o vizinho tiver uma dívida listada abaixo, siga a estrutura e corrija a dívida só no código novo.
- O campo `url` retornado pelas actions serve de evidência de que a spec terminou no ambiente esperado (`origin`), não de navegação.
- `maxlength`: leia o atributo no formulário durante a exploração; na ausência, teste o limite pela UI.

## Arquivos de spec e o projeto `regression`

O projeto `regression` (`playwright.config.ts`) só descobre
`**/*action.spec.ts` e `**/*fixture.spec.ts`, e ignora `**/*factory.spec.ts` e
`**/estudos/**`. Nomeie assim:

- `criar_<entidade>_action.spec.ts` — cria e **mantém** o registro (conferência manual no sandbox).
- `excluir_<entidade>_action.spec.ts` — exclui por JSON (individual exato ou lote `QAAUTO`).
- `criar_e_excluir_<entidade>_action.spec.ts` — ciclo completo; é o que serve de regressão repetível.
- `<entidade>_fixture.spec.ts` — valida a fixture.
- `<entidade>_factory.spec.ts` — teste unitário puro da factory/config; roda só no projeto `unit`.

Um arquivo fora desses sufixos resulta em **zero testes descobertos**.

## Comandos

```bash
# E2E (projeto regression, workers=1, sem retry)
npx playwright test --project=regression "tests/Cadastro/Ensino/atividades-aee/criar_e_excluir_atividade_aee_action.spec.ts" --workers=1 --retries=0

# Unitário de factory/config (não acessa o SGE)
npx playwright test --config=playwright.unit.config.ts --project=unit "tests/Cadastro/Ensino/atividades-aee/atividade_aee_factory.spec.ts" --workers=1 --retries=0
```

Scripts do `package.json`: `npm run test:regression -- <caminho>` e `npm run test:unit -- <caminho>`.
Acrescente `--retries=0` explicitamente. O `playwright.config.ts` usa
`channel: 'chrome'`; se o Chrome não estiver instalado, é problema de ambiente.
Use `HEADLESS=false` para depurar visualmente. Com caminhos que têm espaços ou
acentos (ex.: `tests/Alimentação Escolar/...`), use aspas.

## Ambiente e credenciais

Variáveis em `.env` (não versionado; nunca imprimir valores): `SGE_USUARIO`,
`SGE_SENHA`, `BASE_URL`.

- `loginSge(page, { baseUrl })` abre o formulário oficial `/Acesso/Entrar` e autentica. É a **única** navegação direta por URL aceita.
- Homologação (`homologa-sge`) e sandbox rodam o mesmo SGE, com logins e versões diferentes; o sandbox é uma produção usada para testes. O ambiente é escolhido pelo `.env` (`BASE_URL`), não pelo código.
- Todos os módulos leem somente `BASE_URL` (fallback homologação); é nela que se define o ambiente testado. Em código novo, **não** adicione guard de hostname: o usuário descartou essa trava. As funções `validarUrlSandbox` continuam só validando que a URL é válida.
- Os valores dos `dados_*.json` que referenciam outros cadastros (composição, ano escolar, turma, tipo de turma) dependem do **tenant** e da versão do ambiente: o mesmo SGE tem opções e nomes de menu diferentes entre sandbox e homologação (ex.: "1° ANO W" só no sandbox; "1º ANO" na homologação; submenu "Servidor" vs "Colaborador"). Ao falhar por opção ausente, leia as opções listadas no erro antes de mudar código e ajuste o JSON. Digite o caractere exato da UI (`º` ≠ `°`).
- Para entidade nova, siga a variável do módulo vizinho. Se o pedido não deixar claro qual ambiente usar, pergunte antes de executar.

## Ciclo completo: padrão obrigatório

1. `quantidade` vem do JSON (vazio ⇒ 1); `test.setTimeout(Math.max(180000, quantidade * 120000))`.
2. Loop `sequencia = 1..quantidade`, acumulando em `criadas[]` somente o que a action confirmou.
3. `try { criar } finally { excluir em ordem reversa }`, coletando falhas em um array.
4. Ao final, se houver falhas, `throw new AggregateError(falhas, mensagem)`. A limpeza nunca engole erro.
5. Exclusão individual compara o retorno da action com o alvo; exclusão em lote só aceita o termo `QAAUTO`.

## Segunda execução independente

Em ciclo criar+excluir, a segunda execução é trivial (cada uma limpa a própria massa).
Em spec "só criar", cada execução deixa novos registros `QAAUTO`; isso é esperado e
deve ser informado. Não exclua para "limpar" sem cenário explícito. A limpeza geral
fica nas specs de exclusão em lote com `excluirTodasQAAUTO: true`
(ex.: `limpar_escalas_qaauto_action.spec.ts`).

## Dívidas conhecidas do código existente (não copiar)

Os módulos antigos contêm padrões que a skill proíbe: `.catch(() => false)` em
decisões de fluxo, `xpath=ancestor::li`, `.first()`/`.nth()` em tabelas,
`test.skip` condicional, `console.log` como evidência, `force`/Escape engolidos
no `Select2Helper`. Eles funcionam hoje, mas em código novo prefira locators por
papel/rótulo escopados em `#main`, falha explícita e `expect` em vez de log. Ao
tocar um helper compartilhado, examine os consumidores antes de endurecer algo.
