# Plano — Automação de criação de Turma AEE

**Status: concluído após revisão.** Os ajustes de segurança e limpeza passaram em TypeScript, teste unitário e E2E.

## Objetivo e limites

Automatizar pela interface do SGE a criação de uma Turma AEE e a confirmação de sua persistência. Incluir exclusão individual e ciclo criar-consultar-excluir para permitir regressão repetível, sempre limitados ao registro `QAAUTO` criado pela própria execução e sem alunos ou modulações associados.

Fora do escopo inicial: alocar alunos, configurar atendimentos, registrar frequência, editar/cancelar/concluir/aprovar turmas, automatizar configuração da Turma AEE e criar cadastros de apoio. A exclusão em lote não será implementada.

## Evidências da análise da interface

- Homologação aberta no navegador interno após autenticação manual. Perfil observado: Secretaria de Educação; ano letivo 2026; tenant SECRETARIA MUNICIPAL BRANDÃO.
- A consulta de turmas é acessada pelo menu visível **Escola > Turma**. O botão **Adicionar** apresenta Escolarização, AEE, Diversificada e Alternativa. A opção **AEE** abriu o título **Criar Turma de AEE (Atendimento Educacional Especializado)**.
- Campos marcados como obrigatórios na tela: **Secretaria de Educação/Diretoria Regional**, **Cidade/Município**, **Unidade Escolar**, **Calendário Escolar**, **Descrição da Turma**, **Turno**, **Horário de Entrada**, **Horário de Saída**, **Dias de atendimento** e **Atividades de Atendimento Educacional Especializado - AEE**.
- Os campos de unidade, município, escola e calendário dependem da seleção anterior. No tenant observado, selecionar **DRE BRANDAO** disponibilizou **GOIÂNIA**; a escola **ESCOLA ESTADUAL DAS OLIVEIRAS - 52164801** foi preenchida após escolher o município; o calendário disponível observado foi **Calendário Escolar 2026 - Ensino Fundamental**. Selecionar **SECRETARIA MUNICIPAL DOS BRANDÃO** como primeira opção não apresentou municípios nessa tentativa. Esses valores são evidência do tenant atual, não defaults para codificar.
- As opções de turno observadas foram **Matutino/Manhã** e **Vespertino/Tarde**. Ao selecionar Matutino, a tela preencheu entrada **07:00** e saída **12:00**.
- Dias e atividades são listas com seleção. A lista de dias exibiu Domingo a Sábado; a lista de atividades exibiu 11 opções do catálogo de Atividades de AEE.
- A tela **Configurações > Turma AEE** é uma configuração por escola, não o cadastro da turma.
- A etapa de salvar oferece **Salvar Ativo** e **Salvar Rascunho**. Na exploração aprovada, **Salvar Ativo** produziu `Sucesso! Turma de AEE cadastrada com sucesso!`; a edição mostrou status **Ativa**, turno Matutino/Manhã, horários 07:00–12:00, Segunda-feira e Desenvolvimento de funções cognitivas.
- A escola selecionada no cadastro apareceu na edição como **COLÉGIO ESTADUAL OLIVEIRA - 52164801** e na grade como **ESCOLA ESTADUAL DAS OLIVEIRAS**. A automação deve tratar diferenças de rótulo entre os campos e a grade sem alterar a opção configurada.
- A aba **Alunos na Turma** confirmou `<Não possui alunos alocados>`.
- A duplicidade com mesma descrição, escola e calendário foi recusada com `Existe outra turma de AEE com essa mesma descrição nessa mesma escola!`.
- A exclusão individual pediu confirmação com `Deseja realmente excluir essa Turma de AEE? Esse processo é irreversível.`. Após confirmação explícita do responsável, a tela informou `A turma de AEE foi excluída!` e a pesquisa exata voltou `<Nenhum resultado>`.
- O registro exploratório `QAAUTO TURMA AEE AUTOMACAO 1` foi removido; nenhuma massa da exploração permanece.

## Regras de negócio que orientam o escopo

Conforme a documentação SUE consultada, Turma AEE usa entidade e fluxo próprios, distintos da turma regular. O cadastro exige pelo menos um dia de atendimento e uma atividade; a descrição deve ser única para a mesma combinação de tenant, escola e calendário. A documentação também informa os estados Rascunho, Ativa, Cancelada e Concluída e impede excluir turma com aluno ou modulação associado.

O formulário não exibe campo de situação; a situação é escolhida na etapa de salvamento. O modo será configurável em JSON, sem modificar a configuração do SGE. Referências: [Turma AEE no catálogo SUE](http://192.168.88.109:8081/ensino/conceitos/turma-aee.html) e [Atividades de AEE](http://192.168.88.109:8081/ensino/atividades-de-aee.html).

## Implementação

1. Exploração de criação, duplicidade, ausência de alunos e exclusão individual concluída na UI.
2. Factory determinística com validação de dados de apoio, dias, atividades, prefixo QAAUTO e status (`Ativo` ou `Rascunho`); config JSON do tenant observado; navegação/actions de criar e excluir; specs de criação isolada, exclusão segura da própria instância e ciclo completo; exports nos índices.
3. Reutilizada a navegação existente `navegarParaConsultaTurmas` / `navegarParaAdicionarTurma(page, 'AEE')`; adicionada busca da grade AEE com validação exata. Nenhum helper compartilhado existente foi modificado.
4. Select2/cascatas aguardam as opções e retornam erro acionável quando o apoio configurado não está disponível. A automação não cria escola, calendário, dias ou atividade de apoio.
5. Criação confirma a escolha Ativo/Rascunho, os campos persistidos e a linha AEE na grade. Exclusão recebe somente o objeto retornado pela criação, confere identidade/calendário/escola, exige a aba de alunos vazia e verifica remoção por nova pesquisa.

### Arquivos previstos

- `src/factories/turma-aee.factory.ts`
- `src/helpers/navigation/turma-aee.navigation.ts` (somente se a navegação existente não cobrir a consulta/grade AEE)
- `src/actions/criar-turma-aee.action.ts` e `src/actions/excluir-turma-aee.action.ts`
- Exports necessários em `src/actions/index.ts`, `src/factories/index.ts` e `src/helpers/navigation/index.ts`
- `tests/Escola/turma-aee/`: config, JSON de criação, teste unitário da factory e specs de criar, excluir e ciclo completo. A spec de exclusão cria e exclui a própria turma para não depender de massa preexistente.

## Validação

- `npx tsc --noEmit`: passou após a implementação.
- `npx playwright test --config=playwright.unit.config.ts --project=unit "tests/Escola/turma-aee/turma_aee_factory.spec.ts" --workers=1 --retries=0`: **3 passed**.
- A primeira execução no runner restrito falhou antes do login com `net::ERR_NAME_NOT_RESOLVED`. A execução posterior chegou à UI e identificou quatro ajustes: multiselect não é descendente de `.select2-container`, opções nativas ocultas duplicavam o texto da tag, o botão Salvar é irmão do formulário e o campo de status tem versões hidden/text. Os locators foram corrigidos.
- Um ciclo que falhou após salvar deixou `QAAUTO Turma AEE Ciclo 1`; a limpeza exata confirmou escola/calendário e aba de alunos vazia, removeu a turma e a pesquisa voltou sem resultado. A spec de ciclo também foi reforçada para limpar uma candidata da própria execução quando uma assertion falha após gravação.
- Ciclo E2E independente 1: `npx playwright test --project=regression "tests/Escola/turma-aee/criar_e_excluir_turma_aee_action.spec.ts" --workers=1 --retries=0` — **1 passed (21,7 s)**.
- Ciclo E2E independente 2, em outro comando e novo login — **1 passed (20,6 s)**.
- Os dois ciclos comprovaram criação ativa, persistência na consulta, ausência de alunos e exclusão da própria turma. Nenhuma turma QAAUTO da exploração ou das execuções finais permanece. Nenhuma suíte completa foi executada.

### Revisão de código posterior

- A propriedade da turma passou a ser registrada no ciclo somente após o toast de sucesso. Falhas do teste e da limpeza são combinadas em `AggregateError`.
- Select2 exige rótulo exato; a busca da grade exige descrição exata, evitando opções ou linhas com prefixos semelhantes.
- A spec isolada de exclusão limpa a turma registrada pela criação mesmo se uma assertion ou exclusão posterior falhar.
- `npx tsc --noEmit`: passou após os ajustes.
- Factory unitária: **3 passed**.
- Ciclo E2E após revisão: dois comandos independentes, **1 passed (22,2 s)** e **1 passed (20,5 s)**.
- Spec E2E isolada de exclusão: **1 passed (21,7 s)**.
- Nenhuma turma QAAUTO da exploração, limpeza intermediária ou validação final permanece.

Se uma gravação tiver sucesso mas a confirmação posterior falhar, o ciclo pesquisa a candidata registrada antes da execução e tenta limpar somente se houver exatamente uma linha; ambiguidades e vínculos de alunos interrompem a limpeza com falha explícita.

## Limitações

- Os dois ciclos E2E validaram o modo **Ativo**. A factory/config aceita **Rascunho**, mas esse modo ainda não teve execução E2E.
- A exclusão confere que a aba de alunos está vazia. A automação não cria modulações; se o SGE encontrar outro vínculo impeditivo, a exclusão deve falhar sem tentar remover esse vínculo.
