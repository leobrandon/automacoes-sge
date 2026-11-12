# Componentes

Automação do caminho visível `Cadastro > Ensino > Componentes`, executada no ambiente definido em `BASE_URL`. A autenticação reutiliza `SGE_USUARIO` e `SGE_SENHA`.

## Arquivos

- `dados_componente.json`: quantidade e campos do formulário; nome, abreviação e código vazios são gerados pela factory.
- `dados_exclusao_componente.json`: `excluirTodasQAAUTO: true` remove pela interface todos os Componentes com nome iniciado por `QAAUTO`; com `false`, `nome` identifica um único registro QAAUTO.
- `criar_componente_action.spec.ts`: cria e mantém os registros para conferência.
- `excluir_componente_action.spec.ts`: exclui os Componentes QAAUTO em lote ou o nome exato indicado no JSON de exclusão.
- `criar_e_excluir_componente_action.spec.ts`: cria, consulta e remove apenas os registros gerados na própria execução.
- `componentes_factory.spec.ts`: cobre geração, limites dos campos e proteção do prefixo QAAUTO.

O fluxo feliz preenche os campos obrigatórios Nome, Abreviação, Código, Tipo e Componente Curricular do Educacenso. A criação mantém os controles opcionais desativados, evitando os campos dependentes de atividade complementar, itinerário e cor.

## Execução

```powershell
npx playwright test "tests/Cadastro/componentes" --project=regression --workers=1
```

Para excluir um registro isolado, defina `excluirTodasQAAUTO` como `false` e informe o nome completo em `dados_exclusao_componente.json`. O teste integrado não usa esse JSON: ele transmite à exclusão os nomes que acabou de criar.

## Snapshots do sandbox

Os snapshots de consulta e formulário estão em `.playwright-mcp/componentes-consulta-sandbox.yml` e `.playwright-mcp/componentes-form-sandbox.yml`. Eles registram as colunas da grade, os campos obrigatórios, os controles Select2 e as opções do formulário.
