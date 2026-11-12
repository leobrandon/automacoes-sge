# Motivo de Alteração

Modo: regressão automatizada em homologação, na Visão de Secretaria da Educação.
Navegação via Alimentação Escolar > Cadastros Básicos > Motivo de Alteração.

O campo visível chama-se `Motivo` e aceita até 100 caracteres. A criação inicia
como Ativo; a opção Inativo é aplicada pelo controle Sim/Não na edição.
As consultas desmarcam o filtro Apenas ativos pela UI para incluir inativos.
Cada action confirma a persistência/remoção na grade. A fixture encerra com
teardown no finally. Nenhum dado sem prefixo QAAUTO pode ser criado ou excluído.

`dados_motivo_alteracao.json` aceita quantidade de 1 a 30, descrição opcional
e situação Ativo/Inativo. A descrição vazia usa a factory com timestamp e sequência.
Uma descrição customizada precisa começar com QAAUTO. A exclusão em lote recebe
somente os nomes dos registros criados pela execução; não limpa outros testes.

Credenciais locais: `SGE_USUARIO` e `SGE_SENHA` no ambiente usado por `loginSge`.

```powershell
npx playwright test motivo-alteracao/motivo_alteracao_factory.spec.ts --project=unit --workers=1
npx playwright test motivo-alteracao --project=regression --workers=1
```

## Validação em 30/09/2026

- 5/5 testes unitários passaram com um worker.
- Actions compiladas e executadas via Playwright MCP: criação, consulta,
  edição para Inativo e exclusão confirmadas para os dois estados.
- A execução MCP usa uma cópia compilada das actions, empacotada em
  `scratch/motivo-alteracao-mcp/validar-mcp.js`; não substitui a execução dos
  quatro specs E2E pelo runner local.
- Compilação isolada das novas actions aprovada.
- Compilação global: oito erros preexistentes de exports de Medida Caseira,
  cujos arquivos navigation e factory estavam vazios antes desta implementação.
