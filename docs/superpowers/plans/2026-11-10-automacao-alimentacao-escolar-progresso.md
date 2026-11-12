# Progresso — automação Alimentação Escolar

Plano: `2026-11-10-automacao-alimentacao-escolar.md` (mesma pasta).
Atualizar ao fim de cada módulo e antes de qualquer pergunta ao usuário.
Status permitidos: `Pendente` · `Em andamento` · `Implementado — aguardando execução` · `Em correção` · `Concluído` (só após o responsável informar 2 execuções do ciclo passando) · `Parcial` · `Bloqueado` · `Aguardando decisão`.

## Fase 0 — Preflight

- Status: Parcial; sessão MCP autenticada e verificações de leitura concluídas; execução de regressão bloqueada por infraestrutura de rede.
- Visão ativa: Secretaria de Educação, ano letivo 2026, no navegador interno.
- Menu Alimentação Escolar observado: itens principais, Cadastros Básicos, os 12 Relatórios e Teste de Aceitabilidade correspondem ao plano; Remessa e Cotação de Preços não aparecem nesta visão.
- Linha de base `npx tsc --noEmit`: passou, saída sem erros, em 10/11/2026.
- Pré-condições observadas: as consultas de Resoluções, Tipos de Refeição, Grupos de Anos Escolares e Alimentos exibiram `<Nenhum resultado>` antes da exploração; o formulário de Resoluções ofereceu somente o ano letivo 2026.
- Evidência: o navegador da ferramenta Playwright listou apenas `about:blank`. O inventário do computador mostrou uma janela do Chrome intitulada `Sistema de Gestão Escolar - PontoiD Technology - Google Chrome`; ao selecioná-la, a ferramenta informou: `Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.` A existência de uma sessão autenticada não foi confirmada.

## Painel

| # | Fase | Tela | Slug | Classe | Status | Última atualização |
| - | --- | --- | --- | --- | --- | --- |
| 1 | 1 | Resoluções | resolucao | A/B | Concluído | 10/11/2026: criação, exclusão e dois ciclos passaram |
| 2 | 1 | Tipo de Refeição | tipo-refeicao | A/B | Concluído | 10/11/2026: criação, exclusão e dois ciclos passaram |
| 3 | 2 | Grupo de Anos Escolares | grupo-anos-escolares | B | Concluído | 10/11/2026: criação, exclusão e dois ciclos passaram |
| 4 | 2 | Projetos e Ações Pedagógicas | projeto-acao-pedagogica | B | Concluído | 10/11/2026: criação, exclusão e dois ciclos passaram na unidade |
| 5 | 2 | Teste de Aceitabilidade > Definição de Escalas | definicao-escala-aceitabilidade | B | Fora do escopo | 10/11/2026: responsável optou por não automatizar |
| 6 | 3 | Alimentos | alimento | B | Adiado | 10/11/2026: responsável pediu pular temporariamente após falha da tela |
| 7 | 4 | Necessidades Nutricionais | necessidade-nutricional | B | Concluído | 10/11/2026: criação, exclusão e dois ciclos passaram; apoios e ID 56 removidos |
| 8 | 4 | Cardápio | cardapio | B/C | Pendente | |
| 9 | 4 | Teste de Aceitabilidade > Configuração | configuracao-teste-aceitabilidade | B | Pendente | |
| 10 | 4 | Mapeamento de Fornecedores | mapeamento-fornecedor | B | Pendente | |
| 11 | 4 | Chamada Pública - Agricultura Familiar | chamada-publica | B/C | Pendente | |
| 12 | 5 | Agendamento de Cardápios | | C | Pendente | |
| 13 | 5 | Listagem de Cardápio | | C | Pendente | |
| 14 | 5 | Teste de Aceitabilidade > Cadastro | | C | Pendente | |
| 15 | 5 | Ficha de Aquisição de Alimentos | | C | Pendente | |
| 16 | 6 | Painel da Alimentação Escolar | | D | Pendente | |
| 17 | 6 | Relatórios (12 itens — detalhar abaixo) | | D | Pendente | |
| 18 | extra | Ensino > Ano Letivo | ano-letivo | B | Concluído | 11/11/2026: criação, exclusão e ciclos passaram (fora do plano de Alimentação Escolar) |
| 19 | extra | Servidor > Modulação Escolar > Administrativo | modulacao-administrativa | B | Concluído | 11/11/2026: criação, exclusão e três ciclos passaram (fora do plano de Alimentação Escolar) |

## Ficha por módulo (copiar o bloco para cada tela)

### Modulação Administrativa (`modulacao-administrativa`) — menu Servidor (ou Colaborador) > Modulação Escolar > Administrativo

- Status: Concluído. `npx tsc --noEmit` sem erros. Fora do sandbox, `--project=regression --workers=1 --retries=0`: criar passou (17,6 s), excluir passou (9,5 s), ciclo completo passou em três comandos separados (19,7 s, 19,4 s e 20,8 s).
- Regras observadas: a tela exige o filtro Turno para listar as vagas (sem ele a tabela fica vazia; o ano letivo fica em branco porque a diretriz não tem ano). Ordem do formulário: Unidade, Turno, Função, Cargo, Colaborador, Contrato, Carregar Vagas, Departamento, Data início, Observação, vaga (checkbox) e Modular. Duplicidade (mesma diretriz para o contrato) recusada com `Já existe uma modulação para esta diretriz: '<função>'.`; por isso não há `quantidade`. O aviso `Modulação realizada com sucesso.` é um swal que fecha sozinho (não serve de assertion): a prova é a resposta do POST de gravação, o formulário limpo e a linha na grade com status Normal. Servidor sem modulação não aparece na grade (`Nenhuma modulação encontrada.`): tratado como zero linhas. A grade é uma árvore (servidor > matrícula > unidade > linha). Exclusão pela lixeira da linha, com `Essa ação deletará a modulação desse colaborador.` (Sim).
- Manifesto: `src/factories/modulacao-administrativa.factory.ts`, `src/helpers/navigation/modulacao-administrativa.navigation.ts`, `src/actions/criar-modulacao-administrativa.action.ts`, `src/actions/excluir-modulacao-administrativa.action.ts`, e em `tests/Colaborador/Modulação Escolar/administrativa/`: `modulacao_administrativa_config.ts`, `dados_modulacao_administrativa.json`, `dados_exclusao_modulacao_administrativa.json`, `criar_modulacao_administrativa_action.spec.ts`, `excluir_modulacao_administrativa_action.spec.ts`, `criar_e_excluir_modulacao_administrativa_action.spec.ts`. Alterado `src/actions/index.ts` (dois exports).
- Pré-condições (a spec NÃO cria): servidor com `QAAUTO` no nome (atual: `ENZO GABRIEL XAVIER QAAUTO`, criado pelo responsável), contrato ativo (matrícula 225365) no cargo `Administrativo Secretaria`, e diretriz escolar (Servidor > Diretriz Escolar > Administrativo) com vaga no turno Matutino (diretriz 26456, 50 vagas). Servidor, cargo e demais alvos são trocados no JSON (o nome precisa conter QAAUTO); o JSON de exclusão tem os mesmos campos de alvo. Falha de pré-condição imprime bloco `PRÉ-CONDIÇÃO NÃO ATENDIDA` no console com o que cadastrar.
- Limpeza: modulações órfãs de uma execução falha e da exploração no MCP foram removidas pela spec de exclusão. Nenhuma modulação QAAUTO remanescente; servidor e diretriz permanecem como dados de apoio.
- Limitações: edição, substituição, transferência, encerramento em lote, excedente, vínculos com turma/estudante e critério do Diretor não cobertos.

### Ano Letivo (`ano-letivo`) — menu Ensino > Ano Letivo

- Status: Concluído. `npx tsc --noEmit` sem erros; criação, exclusão e ciclos completos passaram fora do sandbox, `--project=regression --workers=1 --retries=0`.
- Regras: o registro não tem campo de nome para o prefixo QAAUTO; a segurança vem de usar ano futuro (a factory exige ano maior que o corrente; autorizado o ano 2027) e de excluir somente o ano criado pela própria execução. Falha rápida se o ano já existir. Metas: aproveitamento com centavos (`70,00`) e média com uma casa (`7,0`), ambas com máscara (digitar os dígitos). A action usa o callback `aoCriar`, para a limpeza ocorrer mesmo se a verificação falhar. A grade tem 13 colunas; as metas são conferidas por valor de célula. Exclusão por `#btn_excluir`, com `Tem certeza que deseja excluir?` (Sim).
- Manifesto: `src/factories/ano-letivo.factory.ts`, `src/helpers/navigation/ano-letivo.navigation.ts`, `src/actions/criar-ano-letivo.action.ts`, `src/actions/excluir-ano-letivo.action.ts`, e em `tests/Ensino/ano-letivo/`: `ano_letivo_config.ts`, `dados_ano_letivo.json` (ano 2027), `dados_exclusao_ano_letivo.json`, `criar_ano_letivo_action.spec.ts`, `excluir_ano_letivo_action.spec.ts`, `criar_e_excluir_ano_letivo_action.spec.ts`. Alterado `src/actions/index.ts` (dois exports).
- Limpeza: um 2027 órfão de uma criação falha foi removido pela spec de exclusão. Nenhuma massa remanescente.
- Limitações: o ano é um só (definido no JSON); criar vários anos exigiria uma lista de anos autorizados (não implementado). Edição não coberta.

### Necessidades Nutricionais (`necessidade-nutricional`)

- Status: Concluído. `npx tsc --noEmit` sem erros. Fora do sandbox, `--project=regression --workers=1 --retries=0`: criar passou (11,6 s), excluir passou (10,6 s), ciclo completo passou em dois comandos separados (14,6 s e 15,0 s). Uma primeira criação falhou só na assertion de células (proteínas e gorduras com o mesmo valor, célula ambígua); corrigida para checar as colunas por posição, e o registro daquela tentativa foi removido pela spec de exclusão.
- Máscara numérica (resolvida, NÃO é defeito do produto): os campos usam máscara de centavos. Digitar os dígitos (`50000`) produz `500,00`; `fill('500')` contorna a máscara e o servidor grava valor errado (era o `0,01` visto na exploração). A action usa `pressSequentially` com os dígitos e confere o valor mascarado antes de salvar. Persistência confirmada: após salvar, edição e grade mostram `500,00`, `10,00 - 20,00`, `5,00 - 10,00`, `5,00 - 10,00`. Campo Calorias maxlength 9, demais 6.
- Regras observadas: obrigatórios = Resolução, Grupo de Anos Escolares, Atendimento (depende do grupo), Calorias e mínimo/máximo de carboidratos, proteínas e gorduras. Duplicidade (mesma resolução+grupo+atendimento) recusada com `Já existe uma necessidade nutricional cadastrada com essas informações.`; por isso não há `quantidade` (combinação única). Criação mostra `Necessidade nutricional adicionada` e abre a edição; exclusão pede `Tem certeza que deseja excluir essa necessidade nutricional?` (Sim) e confirma `Necessidade nutricional excluída.`. A grade não tem nome: o registro é identificado por resolução + grupo + atendimento.
- Manifesto: `src/factories/necessidade-nutricional.factory.ts`, `src/helpers/navigation/necessidade-nutricional.navigation.ts`, `src/actions/criar-necessidade-nutricional.action.ts`, `src/actions/excluir-necessidade-nutricional.action.ts`, e em `tests/Alimentação Escolar/necessidade-nutricional/`: `necessidade_nutricional_config.ts`, `dados_necessidade_nutricional.json`, `dados_exclusao_necessidade_nutricional.json`, `criar_necessidade_nutricional_action.spec.ts`, `excluir_necessidade_nutricional_action.spec.ts`, `criar_e_excluir_necessidade_nutricional_action.spec.ts`. Alterado `src/actions/index.ts` (dois exports).
- Pré-condições: a spec NÃO cria os apoios; exigem `QAAUTO Resolução 1` e `QAAUTO Grupo de Anos Escolares 1` (rodar antes as specs de criação de Resolução e de Grupo de Anos Escolares) e atendimento `Parcial (20%)` disponível no grupo. Falha rápida com mensagem acionável se a opção não existir.
- Limpeza: ID 56 excluído na exploração (UI confirmou); depois, com as specs de exclusão existentes, excluídos `QAAUTO Grupo de Anos Escolares 1` e `QAAUTO Resolução 1` (ambas passaram). Não há massa remanescente deste módulo.
- Limitações: edição não automatizada; seleção de alimentos individuais não coberta; Alimentos continua adiado (nenhuma tela exigiu alimento até aqui).

### Grupo de Anos Escolares (`grupo-anos-escolares`)

- Status: Concluído. `npx tsc --noEmit` sem erros. Após corrigir erro inicial da factory (`valor.trim is not a function`, causado por quantidade), criação e exclusão passaram (16,1 s e 11,5 s); duas execuções independentes do ciclo passaram (22,9 s e 16,3 s); 1 teste em cada comando, `--project=regression --workers=1 --retries=0`, fora do sandbox.
- Regras: dados de apoio e critérios configurados no JSON; apenas quantidade 1, pois critérios iguais geram interseção. Duplicado recusado com `Já existe outro grupo de anos escolares com o mesmo nome.`; outro nome com os mesmos critérios recusado por interseção com o grupo de exploração. UI confirmou adição e exclusão; pesquisa posterior retornou `<Nenhum resultado>`. Nenhuma massa remanescente. Edição não exercitada na exploração; escopo dos testes é criação, consulta e exclusão.
- Criados: `src/factories/grupo-anos-escolares.factory.ts`, `src/helpers/navigation/grupo-anos-escolares.navigation.ts`, `src/actions/criar-grupo-anos-escolares.action.ts`, `src/actions/excluir-grupo-anos-escolares.action.ts`; na pasta `tests/Alimentação Escolar/Cadastros Básicos/grupo-anos-escolares/`: `grupo_anos_escolares_config.ts`, `dados_grupo_anos_escolares.json`, `dados_exclusao_grupo_anos_escolares.json`, `criar_grupo_anos_escolares_action.spec.ts`, `excluir_grupo_anos_escolares_action.spec.ts`, `criar_e_excluir_grupo_anos_escolares_action.spec.ts`. Alterado `src/actions/index.ts` com dois exports. Divergências com documentação: nenhuma confirmada.

### Tipo de Refeição (`tipo-refeicao`)

- Status: Concluído; `npx tsc --noEmit` sem erros. `criar_tipo_refeicao_action.spec.ts`, `excluir_tipo_refeicao_action.spec.ts` e duas execuções separadas de `criar_e_excluir_tipo_refeicao_action.spec.ts` passaram, respectivamente em 11,4 s, 12,9 s, 15,0 s e 15,6 s; todos fora do sandbox, `--project=regression --workers=1 --retries=0`.
- UI/documentação: nome obrigatório, maxlength 100; nasce ativo; duplicado recusado com `Já existe outro tipo de refeição com o mesmo nome.`; edição e inativação confirmadas. Exclusão ocorre pelo botão Excluir na edição, com `Tipo de refeição excluído.` e pesquisa posterior vazia. Sem divergência confirmada. O registro de exploração `QAAUTO Tipo de Refeição Exploração 1`, editado para `QAAUTO Tipo de Refeição Editado 1`, foi excluído. Massa remanescente das execuções: nenhuma.
- Manifesto criado: `src/factories/tipo-refeicao.factory.ts`, `src/helpers/navigation/tipo-refeicao.navigation.ts`, `src/actions/criar-tipo-refeicao.action.ts`, `src/actions/excluir-tipo-refeicao.action.ts`, e na pasta `tests/Alimentação Escolar/Cadastros Básicos/tipo-refeicao/`: `tipo_refeicao_config.ts`, `dados_tipo_refeicao.json`, `dados_exclusao_tipo_refeicao.json`, `criar_tipo_refeicao_action.spec.ts`, `excluir_tipo_refeicao_action.spec.ts`, `criar_e_excluir_tipo_refeicao_action.spec.ts`. Alterado `src/actions/index.ts` com dois exports; nenhum helper compartilhado alterado.
- Limitações: exclusão individual configurada; limpeza geral não implementada; nomes determinísticos já existentes causam falha e não são excluídos automaticamente. Não há automação das seções opcionais de custo e unidades.

### Resoluções (`resolucao`)

- Status: Concluído após criação, exclusão e duas execuções independentes do ciclo completo passando.
- Regras documentadas: descrição de 3 a 100 caracteres; descrição, ano letivo e vigência inicial únicos no tenant; exclusão impedida por vínculo com necessidade nutricional; não há campo ativo. Nenhuma divergência confirmada.
- UI: descrição, ano letivo e vigência inicial obrigatórios; `maxlength=100`; duplicidade idêntica recusada com `Já existe uma resolução cadastrada com essa descrição.`; criação, edição e exclusão exploratórias observadas. A exclusão foi confirmada por nova pesquisa. A validação prática do limite mínimo não foi executada.
- Pré-condição: ano letivo 2026 disponível; para quantidade superior a 1 o JSON exige anos e datas distintos. Apenas um ano foi observado no tenant.
- Manifesto criado: `src/factories/resolucao.factory.ts`, `src/helpers/navigation/resolucao.navigation.ts`, `src/actions/criar-resolucao.action.ts`, `src/actions/excluir-resolucao.action.ts`, `tests/Alimentação Escolar/Cadastros Básicos/resolucao/resolucao_config.ts`, `dados_resolucao.json`, `dados_exclusao_resolucao.json`, `criar_resolucao_action.spec.ts`, `excluir_resolucao_action.spec.ts`, `criar_e_excluir_resolucao_action.spec.ts` (os cinco últimos na mesma pasta da config). Alterados: `src/actions/index.ts` (exports acrescentados) e este progresso. Resultados gerados: `test-results/.last-run.json` e `test-results/Alimentação Escolar-Cadast-63b71--as-resoluções-configuradas-regression/error-context.md`.
- Comandos e resultados:
  - `npx tsc --noEmit`: passou após implementação; linha de base também passou.
  - `npx playwright test --project=regression "tests/Alimentação Escolar/Cadastros Básicos/resolucao/criar_resolucao_action.spec.ts" --workers=1 --retries=0`: falhou antes do login com `page.goto: net::ERR_NAME_NOT_RESOLVED` em `/Acesso/Entrar?ReturnUrl=%2f`; 1 teste descoberto, 1 falha. Evidência: `test-results/Alimentação Escolar-Cadast-63b71--as-resoluções-configuradas-regression/error-context.md`.
  - excluir: não executado.
  - ciclo completo execução 1: não executado.
  - ciclo completo execução 2: não executado.
- Massa `QAAUTO` remanescente desta execução: nenhuma; o teste falhou antes da criação e a massa de exploração foi removida.
- Peculiaridades/dívidas: o MCP acessa a homologação, mas o navegador lançado pelo runner não resolveu o nome; não foram feitas tentativas equivalentes após a falha de infraestrutura. A spec de exclusão é individual; limpeza geral não foi implementada. A criação por spec isolada usa nome determinístico e pode falhar em colisão, preservando registros alheios. Nenhuma validação E2E do código foi concluída.
- Após a retomada solicitada, ajustado o seletor do título observado na UI, que inclui um ícone junto ao texto; `npx tsc --noEmit` passou novamente. Nenhuma mudança concreta de acesso ao runner foi informada ou observada, portanto a falha de infraestrutura continua pendente e o E2E não foi repetido.
- Diagnóstico autorizado em 10/11/2026 após informação de `network_access=true` e proxy liberado: repetição normal do mesmo comando de criação falhou novamente no login com `net::ERR_NAME_NOT_RESOLVED` (1 teste, antes de criar dados). Próximo passo autorizado: executar o mesmo comando fora do sandbox; resultado ainda não disponível. Evidência: `test-results/Alimentação Escolar-Cadast-63b71--as-resoluções-configuradas-regression/error-context.md`.
- Resultado do diagnóstico: o mesmo comando fora do sandbox passou (1 teste, 13,2 s), criando `QAAUTO Resolução 1` para 2026. A falha de resolução está associada ao ambiente sandbox; o mecanismo específico de proxy não foi comprovado. Conforme instrução do usuário, os próximos comandos Playwright deste trabalho serão executados fora do sandbox. Exclusão da massa do teste de criação é o próximo passo.
- Mudança para a seção 9: nenhum comando Playwright será executado pelo agente a partir desta instrução. A execução de exclusão iniciada antes da mudança foi interrompida sem resultado recebido; a pesquisa na UI por `QAAUTO Resolução 1` mostrou `<Nenhum resultado>`. `npx tsc --noEmit` voltou sem erros; imports/exports e nomes das três specs conferidos; os dois JSONs correspondem às validações da config. O ciclo completo está não executado; aguardando o retorno do responsável para avaliar os resultados.
- Instrução posterior do responsável revogou o modo da seção 9 e autorizou diagnóstico: nova execução normal da spec criar falhou com `ERR_NAME_NOT_RESOLVED` no acesso ao login; nenhuma massa criada. Próximo passo: o mesmo comando fora do sandbox, conforme solicitado.
- Resultado da execução fora do sandbox: o endereço foi alcançado, mas o formulário de login não apareceu; snapshot registrou `Server Error in '/' Application.`, `Runtime Error` e `An exception occurred while processing your request. Additionally, another exception occurred while executing the custom error page for the first exception. The request has been terminated.` O Playwright falhou esperando o campo de login. Classificação: ambiente/servidor; não há evidência de falha no seletor. Não houve criação de massa nesta tentativa. Evidência: `test-results/Alimentação Escolar-Cadast-63b71--as-resoluções-configuradas-regression/error-context.md`.
- Após restabelecimento informado pelo usuário: fora do sandbox, `criar_resolucao_action.spec.ts` passou (1 teste, 19,2 s), `excluir_resolucao_action.spec.ts` passou (1 teste, 12,7 s), e `criar_e_excluir_resolucao_action.spec.ts` passou em dois comandos separados (1 teste cada, 15,7 s e 16,2 s). Todos com `--project=regression --workers=1 --retries=0`; a exclusão e cada ciclo confirmaram remoção. Massa remanescente dessas execuções: nenhuma.

#### Para o responsável executar

Pré-condições: homologação configurada no `.env`; ano letivo 2026 disponível; nenhuma resolução existente no tenant com ano 2026, data `01/01/2026` ou descrição `QAAUTO Resolução 1`. Se houver qualquer conflito com dado de outra execução, não o exclua: informe o conflito. `dados_resolucao.json` contém quantidade 1 e os dados observados; em `dados_exclusao_resolucao.json`, definir `excluirTodosQAAUTO` como `false` e `descricao` com o nome exato criado no passo 1, inicialmente `QAAUTO Resolução 1`.

```powershell
npx playwright test --project=regression "tests/Alimentação Escolar/Cadastros Básicos/resolucao/criar_resolucao_action.spec.ts" --workers=1 --retries=0
npx playwright test --project=regression "tests/Alimentação Escolar/Cadastros Básicos/resolucao/excluir_resolucao_action.spec.ts" --workers=1 --retries=0
npx playwright test --project=regression "tests/Alimentação Escolar/Cadastros Básicos/resolucao/criar_e_excluir_resolucao_action.spec.ts" --workers=1 --retries=0
npx playwright test --project=regression "tests/Alimentação Escolar/Cadastros Básicos/resolucao/criar_e_excluir_resolucao_action.spec.ts" --workers=1 --retries=0
```
- Decisão pendente: restabelecer acesso de rede/DNS para o navegador do runner e retomar a partir do teste de criação.

### <Tela> (`<slug>`)

- Status:
- Regras de negócio relevantes (documentação) e divergências com a UI:
- Fluxo observado (campos obrigatórios, maxlength, duplicidade, feedback de salvar/excluir):
- Pré-condições de tenant exigidas:
- **Manifesto de arquivos** (criados / alterados — caminho completo):
- Comandos e resultados:
  - tsc: _
  - criar: _
  - excluir: _
  - ciclo completo execução 1: _
  - ciclo completo execução 2: _
- Massa `QAAUTO` remanescente (nomes):
- Peculiaridades / dívidas conscientes:
- Pergunta pendente ao usuário (se houver):

## Correções e ajustes pós-conclusão (11/11/2026)

### Medida Caseira (`medida-caseira`) — módulo de referência, já pronto

- Ajuste em `tests/Alimentação Escolar/Cadastros Básicos/medida-caseira/medida_caseira_fixture.spec.ts`: o segundo teste esperava uma descrição customizada, mas a fixture gerava a descrição padrão (falha por texto esperado diferente). Agora ele fica em `test.describe('com opções customizadas')` com `test.use({ medidaCaseiraOptions: { descricao: 'QAAUTO Medida Caseira Customizada' } })`, e a assertion confere `medidaCaseira.descricao` com esse texto. Nenhuma outra spec do módulo foi alterada.
- Uma falha posterior de timeout no login, ao rodar a spec no VS Code, foi lentidão da homologação sob carga: passou na repetição sem mudança de código. Possível endurecimento do helper compartilhado `loginSge` com `waitUntil: 'commit'`: **proposto, não aplicado** (aguarda aprovação, pois afeta todos os módulos).

### Projetos e Ações Pedagógicas (`projeto-acao-pedagogica`) — login da unidade

- A conta do `.env` principal entra na visão Secretaria de Educação, sem o botão de inclusão. Para entrar direto na unidade, as 3 specs usam `loginSge(page, opcoesLoginProjeto())`, definida em `projeto_acao_pedagogica_config.ts`.
- `opcoesLoginProjeto()` lê `SGE_USUARIO_UNIDADE` e `SGE_SENHA_UNIDADE` do `.env` (nunca versionados) e falha com mensagem clara se só uma das duas estiver definida. Sem as duas, usa o login padrão.
- `dados_exclusao_projeto_acao_pedagogica.json` fica `{ "id": "" }`: a spec de exclusão exige o ID exato impresso pela execução de criação. Com o ID vazio ela falha por desenho (não é defeito).

## Perguntas/bloqueios abertos

- Alimentos / abrir formulário: consulta abriu na visão Secretaria de Educação e exibiu `<Nenhum resultado>`. Ao clicar em Adicionar, a interface exibiu `Não foi possível estabelecer uma conexão com o servidor. Por favor, verifique o endereço informado e/ou aguarde alguns instantes e tente novamente.` O MCP registrou GET `/produto/editar/0` com HTTP 200, mas o conteúdo visível era a página de erro; não há evidência suficiente para determinar a causa. Não se repetiu a tentativa nem se alterou configuração de acesso. Massa criada: nenhuma. Formulário, implementação e testes: não executados. Aguardar restabelecimento antes de retomar.
- O responsável confirmou que a tela não está funcionando e autorizou adiá-la. Prosseguir até encontrar tela que dependa de alimento, quando se deve parar e avisar; as demais regras de parada continuam aplicáveis.
- Necessidades Nutricionais / pré-condições: formulário de inclusão abriu; os selects `ResolucoesId` e `GrupoAnosEscolaresAlimentacaoId` possuem somente opção vazia, e `TipoDeAtendimento` ainda não tem opções. Manual indica resolução, grupo e atendimento obrigatórios; atendimento depende do grupo. A documentação menciona linhas opcionais por classificação/tipo de alimento, mas não foi estabelecido que alimento individual seja obrigatório no cadastro básico. Nenhum registro criado e implementação/testes não executados. Pela seção 4.2, não criar automaticamente a cadeia de apoio sem decisão do responsável.
- Após autorização expressa, criados e mantidos temporariamente `QAAUTO Resolução 1` (2026, 01/01/2026) e `QAAUTO Grupo de Anos Escolares 1`; respectivas specs de criação passaram (12,7 s e 13,9 s). Não excluir até o encerramento de Necessidades Nutricionais; antes remover as necessidades criadas por esta execução e depois remover o grupo e a resolução. São dados de apoio desta execução, não de terceiros.
- Handoff solicitado pelo responsável: formulário recebeu os apoios acima e atendimento `Parcial (20%)`; após salvar, observador registrou `Sucesso! Necessidade nutricional adicionada. Ok` e a UI abriu `Editar Necessidade Nutricional`, ID `56`. O wait pelo diálogo expirou porque a mensagem desapareceu; a adição foi observada pelo MutationObserver e pelo formulário de edição. **A necessidade ID 56 permanece no ambiente**, vinculada aos dois apoios; nenhum alimento individual foi selecionado no cadastro. Após o salvamento, os campos mostraram calorias `0,01`, carboidratos mínimo/máximo `0,00`/`0,00`, proteínas `0,01`/`0,00`, gorduras `0,01`/`0,00`, embora a exploração tenha tentado preencher `500`, `10`, `20`, `5`, `10`, `5`, `10`: investigar máscara e persistência antes de afirmar defeito ou escrever expected. A sessão do MCP ficou na edição ID 56. Não excluir os apoios antes do fim do módulo; na limpeza final excluir primeiro a necessidade criada (e outros próprios), depois grupo e resolução. Nenhum arquivo de automação de Necessidades Nutricionais foi criado; duplicidade, exclusão, implementação, `tsc` da implementação e testes: não executados.
- Definição de Escalas: responsável escolheu não automatizar (opção B). Implementação e testes não executados; nenhuma alteração realizada na tela. O histórico da análise consta no bloco anterior do chat.
- Projetos e Ações Pedagógicas / inclusão: na visão `Secretaria de Educação`, a consulta exibe filtros Ano Letivo e Período, botão de pesquisa e `<Nenhum resultado>`, sem botão Adicionar; inspeção do DOM do conteúdo confirmou ausência de controle de inclusão. Documentação informa que o projeto pertence a uma escola e que tenant/escola vêm da sessão. Não está confirmado que outra visão disponibilize a inclusão. Cadastro, implementação e testes: não executados. Massa QAAUTO criada nesta tela: nenhuma. Necessária decisão sobre mudar para visão de escola ou manter a tela fora do escopo desta visão.
- Investigação posterior solicitada: manual consultado pelo MCP confirma vínculo do projeto com escola, ano letivo e periodicidade, mas não explicita a permissão de inclusão por visão; pesquisa na wiki não localizou orientação específica. Pela navegação da sessão, acessada a visão `Unidade Escolar` da `ESCOLA MUNICIPAL CULTURA`, tenant `SECRETARIA MUNICIPAL BRANDÃO`, ano 2026: a consulta tem botão de inclusão. Ao abri-lo, o formulário `Editar Projetos e Ações` mostrou somente Ano Letivo e Período antes do primeiro salvamento; não há campo de nome/descrição onde inserir `QAAUTO`. Nada foi salvo. A criação/exclusão do registro sem prefixo esbarra na seção 4.1.3; decisão do responsável necessária. Sessão do MCP permanece na visão Unidade Escolar, formulário aberto sem salvar. Sem massa criada nesta tela.
- Após autorização expressa para **um projeto de exploração**, criado na Escola Municipal Cultura, ano 2026, 1º Semestre, ID 510 e zero ações; a consulta estava vazia antes da criação. A edição revelou botão `Excluir`; sua confirmação `Tem certeza que deseja excluir?` foi aceita e UI retornou `Projeto excluído!`, com consulta `<Nenhum resultado>`. Nenhuma massa de exploração remanescente. Autorização recebida restringiu-se ao projeto da exploração; a execução automatizada de novos projetos sem prefixo requer decisão específica. Implementação e testes do módulo: não executados.
- Responsável autorizou automação criando e excluindo somente o projeto da própria execução. Implementação criada e `npx tsc --noEmit` passou. A spec de criação fora do sandbox falhou antes de criar dados: a conta do `.env` entrou diretamente na visão Secretaria de Educação e não possui o controle `#btnBackAdmin`, necessário ao caminho observado na sessão de exploração do responsável; timeout no locator. Evidência: `test-results/Alimentação Escolar-projet-fa98a-cola-e-período-configurados-regression/error-context.md`. Ajustada a navegação para mensagem de acesso acionável em vez de esperar o timeout; `tsc` passou novamente. Correção ainda não executada. Precisa de uma conta/perfil autorizado a selecionar a unidade ou de um caminho de interface disponível à conta de testes. Exclusão e dois ciclos completos: não executados. Massa remanescente desta tentativa: nenhuma.
- Manifesto Projetos: criados `src/factories/projeto-acao-pedagogica.factory.ts`, `src/helpers/navigation/projeto-acao-pedagogica.navigation.ts`, `src/actions/criar-projeto-acao-pedagogica.action.ts`, `src/actions/excluir-projeto-acao-pedagogica.action.ts`, e em `tests/Alimentação Escolar/projeto-acao-pedagogica/` os arquivos `projeto_acao_pedagogica_config.ts`, `dados_projeto_acao_pedagogica.json`, `dados_exclusao_projeto_acao_pedagogica.json`, `criar_projeto_acao_pedagogica_action.spec.ts`, `excluir_projeto_acao_pedagogica_action.spec.ts`, `criar_e_excluir_projeto_acao_pedagogica_action.spec.ts`; acrescentados dois exports em `src/actions/index.ts`. A implementação e o caminho de seleção de unidade ainda não estão validados em E2E.
- Retomada: responsável forneceu acesso de unidade usado apenas em memória. Corrigidos o seletor do botão adicionar e a identificação do ID pela resposta observada após salvar; a tentativa que criou ID 511 foi limpa pela interface e pesquisa confirmou ausência. A criação isolada passou (9,9 s, ID 512), exclusão isolada passou (11,0 s, ID 512), ciclo completo passou em dois comandos separados (13,5 s e 14,3 s), `--project=regression --workers=1 --retries=0`; `npx tsc --noEmit` passou. ID de exclusão no JSON foi novamente esvaziado. Nenhuma massa remanescente. Caminho de conta que entra diretamente na unidade validado; caminho alternativo via administrador não validado. Ações pedagógicas aninhadas e duplicidade não foram testadas; escopo automatizado é projeto pai com ano/período. O responsável autorizou criar/excluir registros sem QAAUTO somente quando criados pela própria execução; a spec de exclusão exige ID exato criado na execução anterior.
- Grupo de Anos Escolares: sem bloqueio aberto; exploração, limpeza e P4 concluídos.

- Resoluções: sem bloqueio aberto; servidor restabelecido e P4 concluído.
- Massa criada nesta execução: `QAAUTO Resolução Exploração 1`, editada para `QAAUTO Resolução Exploração Editada 1`, ano 2026 e vigência 01/01/2026. Excluída no MCP Playwright; UI confirmou `Resolução excluída.` e nova pesquisa exata retornou `<Nenhum resultado>`.
- Exploração: campos obrigatórios Descrição (maxlength 100), Ano Letivo e Vigência Inicial; salvamento `Resolução adicionada.`, edição `Resolução atualizada.`; duplicidade idêntica recusada com `Já existe uma resolução cadastrada com essa descrição.`. Rotas observadas na grade: `/resolucoes` e `/resolucoes/indexgrid`. Validação completa de limites e duas execuções do ciclo: não executado.

## Fila consolidada das Fases 5 e 6 (cenários propostos)

_(preencher quando chegar lá)_

## Relatório final

- Estado atual: Resoluções, Tipo de Refeição, Grupo de Anos Escolares e Projetos e Ações Pedagógicas concluídos com criação, exclusão e dois ciclos independentes passando; Definição de Escalas fora do escopo por decisão do responsável; Alimentos bloqueado pela mensagem de conexão ao abrir formulário; telas seguintes não executadas. Manifestos e detalhes constam nas fichas. Nenhuma massa remanescente das explorações e ciclos concluídos.

- Retomada em 10/11/2026 com sessão no navegador interno e depois no MCP Playwright; usuário autorizou login automático via `.env`; implementação realizada; primeira execução interrompida por erro de resolução de nome.
- Resoluções: Concluído; `tsc`, criação, exclusão e duas execuções independentes do ciclo completo passaram.
- Demais telas: Pendente; não executado, fora do escopo desta etapa.
- Manifesto completo: ver ficha de Resoluções acima; `src/actions/index.ts` recebeu dois exports; nenhum helper compartilhado alterado.
- Massa `QAAUTO` remanescente desta execução: nenhuma, conforme pesquisa após exclusão. Divergências produto × documentação: nenhuma confirmada até o momento. Dívidas de implementação: não avaliadas.
- Ordem real: leitura do plano e referências; acesso e exploração pela UI; limpeza da massa; implementação; `tsc`; tentativa de criação; parada por infraestrutura.
