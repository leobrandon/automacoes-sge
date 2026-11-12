# Progresso — Escala de Proficiência

## Preflight e exploração

- Caminho confirmado pela UI e pelo catálogo SUE: **Configurações > Escala de Proficiência**.
- A listagem observada estava vazia. O formulário exige código numérico, descrição e composição; a nova escala começa ativa.
- O manual confirma no máximo uma escala ativa por composição. Os parâmetros têm faixa inicial/final de pontuação, idades, duas datas `dd/MM`, equivalência de saída e indicador de conclusão de correção de fluxo. As faixas não precisam cobrir todos os valores.
- A tela foi explorada no navegador interno após o usuário autenticar. Foi criado um registro temporário de código 261111 com um parâmetro válido; após aprovação do usuário, esse registro foi excluído pela UI. A mensagem de sucesso foi exibida e a consulta retornou `<Nenhum resultado>`.

## Implementação

- Factory e validações locais: `src/factories/escala-proficiencia.factory.ts`.
- Navegação e pesquisa: `src/helpers/navigation/escala-proficiencia.navigation.ts`.
- Actions de criação e exclusão: `src/actions/criar-escala-proficiencia.action.ts` e `src/actions/excluir-escala-proficiencia.action.ts`.
- Specs de criação, exclusão, ciclo completo e factory: `tests/Configurações/escala-de-proficiencia/`.
- A criação procura código numérico livre e para antes de criar se a composição já tiver escala ativa. A exclusão valida código, descrição QAAUTO e composição e remove somente o registro da execução.
- A massa JSON é técnica, identificada como QAAUTO; não representa uma escala pedagógica aprovada.

## Verificação

- `npx tsc --noEmit`: passou.
- As specs E2E ainda não foram executadas pelo runner local. A exploração e a limpeza foram feitas no navegador interno autenticado; o runner inicia outro contexto e usa o helper de autenticação configurado por variáveis de ambiente.
