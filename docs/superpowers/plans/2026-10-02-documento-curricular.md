# Documento Curricular Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar automações Playwright do SGE para cadastrar e excluir Documento Curricular e editar um registro QAAUTO, adicionando estruturas ordenadas, Ano Escolar, Componente e um item em cada estrutura no componente.

**Architecture:** Seguir a arquitetura existente por entidade: factory/configuração em src e specs/JSONs em tests/Cadastro/documento-curricular. As ações navegam por menus e controles visíveis, selecionam valores configurados ou combinações compatíveis da UI e confirmam cada resultado na própria tela. A edição constrói a hierarquia na ordem configurada: estruturas, vínculo Ano Escolar/Componente e itens em cada aba, incluindo o relacionamento com o nível anterior quando a UI o exigir.

**Tech Stack:** TypeScript, Playwright Test, dotenv, Faker existente no projeto.

**Spec:** docs/superpowers/specs/2026-10-02-documento-curricular-design.md

## Global Constraints

- Entrar no sandbox usando o .env existente, sem imprimir ou persistir credenciais.
- Navegar por Cadastro > Ensino > Documento Curricular, sem acessar rotas internas diretamente.
- Seguir os módulos e convenções atuais de src/actions, src/factories, src/helpers/navigation e tests/Cadastro.
- Executar o Playwright com workers: 1.
- Usar QAAUTO seguido por uma descrição significativa e uma sequência numérica por execução.
- Guardar dados editáveis em dados_documento_curricular.json e preferências de exclusão em dados_exclusao_documento_curricular.json.
- Para Ano Escolar e Componente, escolher um par disponível e compatível; não tratar uma combinação sem Componentes como sucesso nem pular a inclusão.
- A exclusão terá excluirTodasQAAUTO: false por padrão; true só pode atingir registros encontrados com prefixo QAAUTO.
- A edição cria e abre seu próprio registro QAAUTO; nunca altera registros existentes.
- Criação e edição preservam o registro; exclusão fica separada.
- Duas execuções E2E independentes aprovadas, workers=1 e retries=0.

## Review Focus

- Descrição duplicada ou com prefixo/numeração fora do padrão: testar factory e busca da linha exata no fluxo de criação.
- Preferência de composição/ano/componente indisponível: resolver para opção visível e compatível e retornar os valores realmente usados; não interromper por divergência entre configuração e opções da sessão.
- Ano Escolar sem componente associado: testar seleção da combinação default observada (6° ANO com ARTES ou BIOLOGIA) e seleção dinâmica apenas entre opções disponíveis.
- Estruturas e itens dependentes: testar ordem crescente, um item em cada aba, código conforme a estrutura e vínculo pai-filho nas estruturas subsequentes.
- Configuração de exclusão ambígua: testar exclusão exata por padrão e rejeição de nome sem prefixo QAAUTO.
- Componentes/modal com carregamento assíncrono ou feedback de validação: testar espera por resposta/loader e confirmação de persistência antes de encerrar cada ação.

---

### Task 1: Factory, JSONs e leitura de configuração

**Files:**
- Create: src/factories/documento-curricular.factory.ts
- Modify: src/factories/index.ts
- Create: tests/Cadastro/documento-curricular/dados_documento_curricular.json
- Create: tests/Cadastro/documento-curricular/dados_exclusao_documento_curricular.json
- Create: tests/Cadastro/documento-curricular/documento_curricular_config.ts
- Create: tests/Cadastro/documento-curricular/documento_curricular.factory.spec.ts

**Interfaces:**
- Produces DocumentoCurricularData { descricao: string; composicaoEnsino: string; estruturas: EstruturaCurricularData[]; anoEscolar: string; componente: string }, where each EstruturaCurricularData has descricao, possuiCodigo, ativo, and itens ordered; each item has descricao, ativo, optional codigo, and optional descricaoItemPai.
- Produces buildDocumentoCurricular(options: Partial<DocumentoCurricularData>, sequencia: number): DocumentoCurricularData.
- Produces isDocumentoCurricularQAAuto(descricao: string): boolean.
- Produces lerConfiguracaoCriacaoDocumentoCurricular() and lerConfiguracaoExclusaoDocumentoCurricular().

- [ ] **Step 1: Escrever testes unitários da factory e configuração.** Cobrir sequência, nomes QAAUTO de documento/estrutura/item, valores explicitamente configurados, opções Sim/Não, quantidade ausente/vazia como 1, criação de duas estruturas em ordem com um item cada, associação do segundo item ao primeiro e exclusão ampla limitada a QAAUTO.
- [ ] **Step 2: Executar os testes unitários para confirmar a falha inicial.** Run: `npx.cmd playwright test --config=playwright.unit.config.ts --project=unit tests/Cadastro/documento-curricular/documento_curricular.factory.spec.ts --workers=1 --retries=0`. Expected: FAIL porque factory/configuração ainda não existem.
- [ ] **Step 3: Implementar a factory e leitura de JSON.** Nome padrão do documento: QAAUTO Documento Curricular seguido pela sequência, sem timestamp/GUID. Nomes das estruturas e itens usam descrição significativa mais sequência; preservar uma sequência coerente dentro do registro. Preferências observadas: ENSINO MÉDIO INOVADOR, 2° SÉRIE e ARTES. A seleção deve consultar a UI, usar valores configurados se estiverem disponíveis e resolver para alternativas visíveis compatíveis sem interromper o fluxo.
- [ ] **Step 4: Criar os dois JSONs com os campos configuráveis.** Criação: quantidade, descricao, composicaoEnsino, estruturas[] com descricao/possuiCodigo/ativo/itens[] (descricao/ativo/codigo opcional/descricaoItemPai opcional), anoEscolar, componente. A configuração padrão contém duas estruturas em ordem e um item por estrutura; a segunda estrutura tem campo de pai apontando ao item da primeira. Exclusão: excluirTodasQAAUTO=false, termoGeral=QAAUTO e descricao=QAAUTO Documento Curricular 1.
- [ ] **Step 5: Executar novamente os testes unitários.** Run: `npx.cmd playwright test --config=playwright.unit.config.ts --project=unit tests/Cadastro/documento-curricular/documento_curricular.factory.spec.ts --workers=1 --retries=0`. Expected: PASS.

### Task 2: Navegação e criação de Documento Curricular

**Files:**
- Create: src/helpers/navigation/documento-curricular.navigation.ts
- Modify: src/helpers/navigation/index.ts
- Create: src/actions/criar-documento-curricular.action.ts
- Modify: src/actions/index.ts
- Create: tests/Cadastro/documento-curricular/criar_documento_curricular_action.spec.ts

**Interfaces:**
- Consumes DocumentoCurricularData and buildDocumentoCurricular from Task 1.
- Produces navegarParaConsultaDocumentoCurricular(page: Page): Promise<void>.
- Produces pesquisarDocumentoCurricular(page: Page, termo: string): Promise<void>.
- Produces linhaDocumentoCurricular(page: Page, descricao: string): Locator.
- Produces criarDocumentoCurricular(page: Page, options: Partial<DocumentoCurricularData>, sequencia: number): Promise<DocumentoCurricularData & { url: string }>.

- [ ] **Step 1: Escrever a spec de criação.** Assertar origem sandbox, descrição iniciada por QAAUTO e exatamente uma linha de grade para a descrição criada; deixar o registro para conferência.
- [ ] **Step 2: Executar a spec para confirmar a falha inicial.** Run: `npx.cmd playwright test --project=regression tests/Cadastro/documento-curricular/criar_documento_curricular_action.spec.ts --workers=1 --retries=0`. Expected: FAIL porque ação/navegação não existem.
- [ ] **Step 3: Implementar a navegação visível.** Abrir Cadastro, Ensino e Documento Curricular; esperar a grade e a busca visíveis. Pesquisar e validar a linha exata sem forçar URLs internas.
- [ ] **Step 4: Implementar a criação.** Preencher Descrição, selecionar Composição de Ensino pelo Select2 visível, salvar e confirmar pelo texto/linha exata da consulta.
- [ ] **Step 5: Executar a spec no sandbox e corrigir apenas falhas justificadas pela evidência.** Run: `npx.cmd playwright test --project=regression tests/Cadastro/documento-curricular/criar_documento_curricular_action.spec.ts --workers=1 --retries=0`. Expected: PASS com registro QAAUTO persistido e visível.

### Task 3: Editar e adicionar Estrutura, Ano Escolar e Componente

**Files:**
- Create: src/actions/editar-documento-curricular.action.ts
- Modify: src/actions/index.ts
- Create: tests/Cadastro/documento-curricular/editar_documento_curricular_action.spec.ts

**Interfaces:**
- Consumes criarDocumentoCurricular, navegarParaConsultaDocumentoCurricular, linhaDocumentoCurricular and DocumentoCurricularData.
- Produces editarDocumentoCurricular(page: Page, dados: DocumentoCurricularData): Promise<{ descricao: string; estruturas: string[]; anoEscolar: string; componente: string; itensPorEstrutura: Array<{ estrutura: string; item: string; itemPai?: string }> }>.

- [ ] **Step 1: Escrever a spec do fluxo de edição independente.** Criar um documento QAAUTO próprio dentro do teste; abrir pela linha exata; adicionar todas as estruturas; ir à aba Componentes; adicionar Ano Escolar e Componente; abrir a edição do Componente e cadastrar um item por estrutura respeitando vínculos pai-filho; verificar cada item na aba correta. Nunca selecionar os registros preexistentes exibidos no sandbox.
- [ ] **Step 2: Executar a spec para confirmar a falha inicial.** Run: `npx.cmd playwright test --project=regression tests/Cadastro/documento-curricular/editar_documento_curricular_action.spec.ts --workers=1 --retries=0`. Expected: FAIL porque ação de edição ainda não existe.
- [ ] **Step 3: Implementar abertura segura do registro.** Criar o documento pelo fluxo da Task 2, pesquisá-lo pelo nome e validar uma única linha QAAUTO antes de abrir a edição.
- [ ] **Step 4: Explorar e implementar inclusão das Estruturas.** Antes de codificar itens, usar Playwright MCP na UI para inspecionar o modal de item em uma estrutura com código e em uma sem código, bem como o campo de relação com o item do nível anterior. Não tirar snapshots de cada clique; guardar somente snapshots das telas/modais que definem campos e controles. Preencher cada estrutura na ordem configurada, com descrição, possui código e ativo; confirmar ordem e linha após cada gravação.
- [ ] **Step 5: Implementar o par Ano Escolar/Componente.** Preferir 2° SÉRIE por padrão ou o valor do JSON; aguardar as opções dependentes; se a preferência não estiver disponível ou não tiver Componentes, escolher uma opção de Ano Escolar com Componente compatível exibido. Se o Componente estiver vazio/indisponível, escolher apenas entre as opções compatíveis. Usar como preferência observada ARTES e persistir pelo botão de adicionar/salvar da tela; retornar os valores efetivamente usados.
- [ ] **Step 6: Abrir e validar as abas do Componente.** Salvar o Documento Curricular; confirmar pela UI os nomes do Ano Escolar/Componente e todas as estruturas. Abrir a edição do Componente associado pela linha apresentada na tela e conferir que existe uma aba para cada estrutura configurada.
- [ ] **Step 7: Implementar e verificar os itens por estrutura.** Em cada aba, incluir o item configurado. Para níveis posteriores, selecionar o item pai persistido no nível anterior quando disponível/exigido; preencher código somente quando a estrutura possuir código. Confirmar uma linha por item na grade da respectiva aba e conferir a coluna de vínculo quando presente.
- [ ] **Step 8: Executar novamente a spec de edição.** Run: `npx.cmd playwright test --project=regression tests/Cadastro/documento-curricular/editar_documento_curricular_action.spec.ts --workers=1 --retries=0`. Expected: PASS em uma segunda massa QAAUTO independente, incluindo os dois itens e seu vínculo.

### Task 4: Exclusão exata e opção QAAUTO em lote

**Files:**
- Create: src/actions/excluir-documento-curricular.action.ts
- Modify: src/actions/index.ts
- Create: tests/Cadastro/documento-curricular/excluir_documento_curricular_action.spec.ts
- Modify: tests/Cadastro/documento-curricular/documento_curricular_config.ts
- Modify: tests/Cadastro/documento-curricular/documento_curricular.factory.spec.ts

**Interfaces:**
- Consumes lerConfiguracaoExclusaoDocumentoCurricular, isDocumentoCurricularQAAuto, pesquisarDocumentoCurricular and linhaDocumentoCurricular.
- Produces excluirDocumentoCurricular(page: Page, descricao: string): Promise<{ descricao: string; url: string }>.
- Produces excluirDocumentosCurricularesQAAuto(page: Page): Promise<{ totalEncontrados: number; totalExcluidos: number; descricoesExcluidas: string[] }>.

- [ ] **Step 1: Escrever testes de configuração/exclusão.** Cobrir flag false com descrição exata QAAUTO, rejeição de alvo vazio/sem prefixo, e flag true limitada ao termo QAAUTO.
- [ ] **Step 2: Executar os testes para confirmar a falha inicial.** Run: `npx.cmd playwright test --config=playwright.unit.config.ts --project=unit tests/Cadastro/documento-curricular/documento_curricular.factory.spec.ts --workers=1 --retries=0`. Expected: FAIL nas validações de exclusão ausentes.
- [ ] **Step 3: Implementar pesquisa e exclusão pela UI.** Validar nome prefixado e linha única; abrir edição pelo registro alvo, conferir descrição do formulário, excluir, confirmar diálogo e verificar que a linha desapareceu.
- [ ] **Step 4: Implementar exclusão em lote opt-in.** Quando a flag for true, pesquisar QAAUTO pela grade, validar prefixo localmente e percorrer páginas visíveis; executar a exclusão exata para cada descrição coletada e retornar os totais.
- [ ] **Step 5: Escrever spec E2E de exclusão autocontida.** Criar um documento QAAUTO único na própria execução, excluí-lo pela ação exata e verificar que desapareceu. Não executar exclusão ampla contra os demais registros do sandbox.
- [ ] **Step 6: Executar testes unitários e spec E2E.** Runs: `npx.cmd playwright test --config=playwright.unit.config.ts --project=unit tests/Cadastro/documento-curricular/documento_curricular.factory.spec.ts --workers=1 --retries=0`; depois `npx.cmd playwright test --project=regression tests/Cadastro/documento-curricular/excluir_documento_curricular_action.spec.ts --workers=1 --retries=0`. Expected: PASS.

### Task 5: Validação final dos fluxos

**Files:**
- Test: tests/Cadastro/documento-curricular/criar_documento_curricular_action.spec.ts
- Test: tests/Cadastro/documento-curricular/editar_documento_curricular_action.spec.ts
- Test: tests/Cadastro/documento-curricular/excluir_documento_curricular_action.spec.ts

- [ ] **Step 1: Executar criação duas vezes em execuções independentes.** Run a spec isolada duas vezes com `--project=regression --workers=1 --retries=0`; confirmar cada registro persistido por busca/grade.
- [ ] **Step 2: Executar edição duas vezes em execuções independentes.** Confirmar novo registro, todas as estruturas, Ano Escolar/Componente, um item por aba e o relacionamento entre níveis em cada execução.
- [ ] **Step 3: Executar exclusão duas vezes em execuções independentes.** Cada execução cria e remove somente seu registro QAAUTO da própria execução e confirma ausência posterior.
- [ ] **Step 4: Registrar limitações de infraestrutura/produto se ocorrerem.** Não declarar aprovado se houver bloqueio real; inspecionar evidência e classificar a causa antes de corrigir.
- [ ] **Step 5: Revisar arquivos e estado final.** Confirmar workers/retries usados e nenhum dado/credencial secreto em arquivos versionáveis.

## Observação de execução

A pasta aberta não contém .git; portanto, não há como criar commits neste ambiente. O plano não inclui comandos de commit até que o diretório esteja em um repositório.

