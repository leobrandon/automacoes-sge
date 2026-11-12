# Testes Playwright organizados por módulo do menu

As pastas espelham o caminho visível do menu lateral do SGE (`Menu > Submenu > Item`):

- `Cadastro/Colaborador/` (ex.: `cargo`), `Cadastro/Ensino/` (ex.: `ano-escolar`, `conceito`, `Tipo de Registro Pedagógico`), `Cadastro/Ponto/` (ex.: `escala`, `horarios`) e itens diretos de `Cadastro/` (`categoria-da-turma`, `motivos-de-concessao`, `Tipo de Ocorrência Escolar`).
- `Alimentação Escolar/Cadastros Básicos/`: `medida-caseira` e `motivo-alteracao`.
- `Configurações/escala-de-proficiencia/`: cadastro da escala e seus parâmetros por composição de ensino.
- `Aluno/cadastro/` (Aluno > Cadastro), `Colaborador/cadastro/` (Colaborador > Cadastro) e `Escola/turma/` (Escola > Turma).

Cada pasta de módulo ou entidade mantém suas specs, dados e configurações relacionadas.

O Test Explorer usa `playwright.config.ts` para exibir os cenários de regressão (`*action.spec.ts` e `*fixture.spec.ts`). Specs de factory são unitárias e ficam fora dessa árvore; para executá-las, use `npm run test:unit`, que utiliza `playwright.unit.config.ts`.
