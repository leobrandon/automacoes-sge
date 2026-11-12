# Composição de Ensino

Automação do caminho visível `Cadastro > Ensino > Composição De Ensino`, executada no ambiente definido em `BASE_URL`. A autenticação reutiliza `SGE_USUARIO` e `SGE_SENHA`.

## Arquivos

- `criar_composicao_ensino_action.spec.ts`: cria a quantidade informada e mantém os registros para conferência.
- `excluir_composicao_ensino_action.spec.ts`: exclui todos os registros QAAUTO do cadastro ou uma composição QAAUTO indicada pelo nome exato.
- `criar_e_excluir_composicao_ensino_action.spec.ts`: cria, consulta e exclui somente os registros criados pela própria execução.
- `dados_composicao_ensino.json`: quantidade e dados do formulário. Campos vazios são gerados pela factory; a descrição recebe sufixos sequenciais começando em 1.
- `dados_exclusao_composicao_ensino.json`: define limpeza QAAUTO em lote ou exclusão por descrição exata.

Os campos gerados usam nomes de modalidades escolares, abreviações compatíveis com o limite da tela e códigos dentro dos limites exibidos. A factory escolhe combinações temáticas e a automação seleciona as opções pelo texto visível. Para “Educação Fundamental”, a fase também é preenchida quando gerada. Os switches são acionados pelo toggle visual.

## Execução

```powershell
npx playwright test "tests/Cadastro/composicao-de-ensino" --project=regression --workers=1
```

O JSON de exclusão vem configurado para `excluirTodasQAAUTO: true`, conforme o padrão da automação de Categoria da Turma. Isso apaga todos os registros desse cadastro cuja descrição contém `QAAUTO`; para excluir apenas um, defina `excluirTodasQAAUTO` como `false` e preencha `descricao` com o nome exato iniciado por `QAAUTO`.

## Snapshots usados

Os snapshots MCP gerados no sandbox durante a inspeção estão em `.playwright-mcp/` na raiz do projeto. Eles registram a consulta/listagem, o formulário e as opções dos campos select2:

- `page-2026-10-01T17-18-37-364Z.yml`: tela de consulta e caminho dos menus;
- `page-2026-10-01T17-18-45-938Z.yml`: formulário de inclusão;
- `page-2026-10-01T17-18-59-618Z.yml`: opções de Nível de Ensino;
- `page-2026-10-01T17-19-18-175Z.yml`: opções de Modalidade de Ensino;
- `page-2026-10-01T17-20-26-209Z.yml`: opções de Fase de Ensino.
