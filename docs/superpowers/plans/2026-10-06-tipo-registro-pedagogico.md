# Tipo de Registro Pedagógico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar e validar quatro specs independentes de criação e quatro de exclusão, cada tipo em sua própria pasta, para Tipo de Registro Pedagógico no sandbox SGE.

**Architecture:** Usar contratos/factory e leitor de JSON compartilhados, navegação visível e ações de UI reaproveitáveis. Manter cada spec e seus JSONs na pasta do tipo correspondente; ações específicas preenchem os quatro formulários, e uma ação de exclusão exige alvo exato e comprova ausência na grade.

**Tech Stack:** TypeScript, `@playwright/test`, JSON, helpers SGE existentes, projetos `unit` e `regression`.

**Spec:** `docs/superpowers/specs/2026-10-06-tipo-registro-pedagogico-design.md`

## Global Constraints

- Todo o fluxo funcional usa apenas a UI visível do sandbox; não navegar por rotas internas nem enviar mutações por API ou banco.
- Recusar qualquer host diferente de `sandbox.pontoid.com.br` antes de login ou mutação; credenciais continuam no `.env` local.
- Descrições usam `QAAUTO` + nome semântico + sequência `1`, sem timestamp, GUID ou código aleatório.
- Cada exclusão é restrita à descrição QAAUTO explicitamente configurada e confirma tipo/turma/composição/ano quando exibidos; não existe exclusão em lote.
- Criar quatro pastas sob `tests/Cadastro/Tipo de Registro Pedagógico/`: `Atividades Específicas`, `Conteúdo Aplicado`, `Parecer Descritivo (Ficha de Acompanhamento)` e `Planejamento`; cada pasta contém seu spec de criação, spec de exclusão e dois JSONs.
- Navegar por **Cadastro > Ensino > Tipo de Registro Pedagógico** usando menus visíveis; confirmar feedback e estado final da grade.
- Executar E2E com `--workers=1 --retries=0`; usar auto-wait e assertions web-first, sem sleeps de sincronização.
- A criação persistente não faz limpeza automática. A execução completa passa pelas quatro criações antes das quatro exclusões e usa `--max-failures=1` para não iniciar exclusões após falha de criação.
- Este workspace não contém metadados Git. O usuário autorizou explicitamente a execução Native nesta pasta sem worktree; não inicializar `.git` nem alegar commits. Registrar tarefas em `.superpowers/sdd/2026-10-06-tipo-registro-pedagogico/progress.md` e fazer revisão final independente dos arquivos alterados.

## Review Focus

- Host diferente do sandbox ou URL inválida devem falhar antes de qualquer cadastro; cobrir ambos com testes unitários (Task 1) e validar sandbox em cada spec de UI (Tasks 2–6).
- Composição dependente de tipo de turma só pode ser selecionada depois de suas opções carregarem; cobrir o estado visível após a seleção do campo pai na primeira criação (Task 2) e reutilizar a espera nos demais tipos (Tasks 3–5).
- Conteúdo Aplicado não pode reutilizar combinação ativa de tipo de turma, composição e ano; configurar no JSON uma combinação livre confirmada por leitura da grade antes da execução e preservar falha se a regra rejeitar o cadastro (Tasks 1 e 3).
- Tipo de formulário, turma, composição ou ano divergentes da configuração não podem ser excluídos mesmo se a descrição coincidir; validar as colunas visíveis, abrir o registro pela descrição e conferir novamente os campos do formulário antes da confirmação (Task 6).
- Opções obrigatórias por formulário e valores JSON inválidos precisam falhar antes do clique de salvar; cobrir campos ausentes, enums inválidos e descrição fora do padrão nos testes de configuração/factory (Task 1).

---

### Task 1: Contratos, factory, leitores e JSONs

**Files:**
- Create: `src/factories/tipo-registro-pedagogico.factory.ts`
- Modify: `src/factories/index.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/tipo_registro_pedagogico_config.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/tipo_registro_pedagogico.factory.spec.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/dados_atividades_especificas.json`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/dados_exclusao_atividades_especificas.json`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/dados_conteudo_aplicado.json`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/dados_exclusao_conteudo_aplicado.json`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/dados_parecer_descritivo.json`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/dados_exclusao_parecer_descritivo.json`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/dados_planejamento.json`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/dados_exclusao_planejamento.json`

**Interfaces:**
- Produce `TipoRegistroPedagogicoTipo` as the four exact labels, and `TipoTurmaRegistroPedagogico` as `'Escolarização' | 'AEE' | 'Diversificada' | 'Alternativa'`.
- Produce a shared base data type with `descricao: string`, `tipoTurma: TipoTurmaRegistroPedagogico`, `ano: number`, optional `composicao: string`, optional `anosEscolares: string[]`, and `ativo: boolean`.
- Produce distinct data types for Atividades Específicas, Conteúdo Aplicado, Parecer Descritivo and Planejamento. Require each form's required fields from the spec; use exact observed UI option values for `finalidade`, `periodicidade`, `tipoAssinatura` and `tipoRegistro`.
- Type the observed signature choices as `'Padrão do Sistema' | 'Personalizadas' | 'Não Utiliza'`, the periodicity choices as `'Não Utiliza/Anual' | 'Mensal' | 'Bimestral' | 'Trimestral' | 'Semestral'`, and the Planning registry choice as `'Por componente' | 'Único'`.
- Produce `buildAtividadesEspecificas(options, sequencia)`, `buildConteudoAplicado(options, sequencia)`, `buildParecerDescritivo(options, sequencia)`, `buildPlanejamento(options, sequencia)`, and `isTipoRegistroPedagogicoQAAuto(descricao)` in the factory. The configured `descricao` is the semantic base and the factory appends the requested deterministic sequence; generated names use the semantic module name and sequence only.
- Produce `validarConfiguracaoCriacao(tipo: TipoRegistroPedagogicoTipo, conteudo: unknown)` and `validarConfiguracaoExclusao(tipo: TipoRegistroPedagogicoTipo, conteudo: unknown)` as pure validators, plus `lerConfiguracaoCriacao(tipo: TipoRegistroPedagogicoTipo)` and `lerConfiguracaoExclusao(tipo: TipoRegistroPedagogicoTipo)` readers in the parent test directory. The readers resolve JSON from the exact type subfolder and call the validators. Exclusion config contains one exact description and expected category/turma/ano/composição, not a global term or a list-wide mode.
- Produce `validarUrlSandbox(baseUrl: string): string`; accept only hostname `sandbox.pontoid.com.br` and reject malformed URLs.
- Create one creation and one deletion JSON per type. Creation data uses one semantic QAAUTO description base and one record; deletion data contains the exact final description including suffix `1` and typed row values. Content Aplicado uses a composition/turma/ano tuple observed free in the sandbox grid. Do not store credentials.

- [x] **Step 1: Write the failing factory/configuration tests.** Cover all four description builders, explicit-description preservation, deterministic suffix `1`, QAAUTO recognition, malformed URL and non-sandbox rejection, missing/overlong/non-QAAUTO descriptions, invalid enum values, missing required fields by type, and deletion config with mismatched type or non-QAAUTO target.
- [x] **Step 2: Run the focused unit test and confirm the expected assertion fails.** Use a caught dynamic import and assert the new exports are present before calling them; keep the test runner itself free of unresolved-import errors.

Run: `npm.cmd run test:unit -- "tests/Cadastro/Tipo de Registro Pedagógico/tipo_registro_pedagogico.factory.spec.ts" --workers=1 --retries=0`

Expected: the tests run and FAIL on the assertion that the factory/configuration exports are missing; there is no test discovery or module-resolution error.

- [x] **Step 3: Implement the factory, configuration readers and eight JSON files.** Keep the descriptions under the documented 100-character limit; reject invalid data before UI interaction; keep each config file inside its type folder.
- [x] **Step 4: Run the focused unit test and confirm it passes.**

Run: `npm.cmd run test:unit -- "tests/Cadastro/Tipo de Registro Pedagógico/tipo_registro_pedagogico.factory.spec.ts" --workers=1 --retries=0`

Expected: all builder, JSON reader and safety-validation cases pass in project `unit`.

### Task 2: Navegação comum e criação de Atividades Específicas

**Files:**
- Create: `src/helpers/navigation/tipo-registro-pedagogico.navigation.ts`
- Modify: `src/helpers/navigation/index.ts`
- Create: `src/actions/tipo-registro-pedagogico/atividades-especificas.action.ts`
- Modify: `src/actions/index.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/criar_atividades_especificas_action.spec.ts`

**Interfaces:**
- Produce `navegarParaConsultaTipoRegistroPedagogico(page: Page): Promise<void>`, `navegarParaAdicionarTipoRegistroPedagogico(page: Page, tipo: TipoRegistroPedagogicoTipo): Promise<void>`, `pesquisarTipoRegistroPedagogico(page: Page, descricao: string): Promise<void>` and `linhaTipoRegistroPedagogico(page: Page, descricao: string): Locator`.
- Produce `TipoRegistroPedagogicoCriado` with `descricao: string`, `tipo: TipoRegistroPedagogicoTipo` and `url: string`.
- Produce `criarAtividadesEspecificas(page: Page, dados: AtividadesEspecificasData): Promise<TipoRegistroPedagogicoCriado>`.
- Menu destination is reached by visible Cadastro > Ensino > Tipo de Registro Pedagógico controls. Open **Adicionar** and select the exact option label. Use `getByRoleSge` where needed and assert visibility before interaction.

- [x] **Step 1: Write the Atividades Específicas create spec.** Read its JSON, validate sandbox host before login, log in with `loginSge`, navigate through visible menus, create one configured record, assert visible success feedback and exactly one matching grid row with expected description/type/turma/composição/ano; leave the record in place.
- [x] **Step 2: Run the focused regression spec and confirm the expected missing-action assertion fails.** Load the actions barrel and assert the target export exists before login.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/criar_atividades_especificas_action.spec.ts"`

Expected: the test runs and FAILS at the missing `criarAtividadesEspecificas` export assertion before login or UI interaction.

- [x] **Step 3: Implement the visible navigation and Atividades Específicas action.** Wait for the class-dependent composition options after choosing the class type; fill composition only when visible/required; preserve optional export defaults; save and verify the row through the consultation grid.
- [ ] **Step 4: Export navigation and action interfaces, then run the focused regression spec once.** The test reached login, then the local Playwright runner failed with `net::ERR_NAME_NOT_RESOLVED` at the sandbox URL before any form interaction.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/criar_atividades_especificas_action.spec.ts"`

Expected: exactly one test passes and the configured row remains for its separate deletion spec.

### Task 3: Criação de Conteúdo Aplicado

**Files:**
- Create: `src/actions/tipo-registro-pedagogico/conteudo-aplicado.action.ts`
- Modify: `src/actions/index.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/criar_conteudo_aplicado_action.spec.ts`

**Interfaces:**
- Produce `criarConteudoAplicado(page: Page, dados: ConteudoAplicadoData): Promise<TipoRegistroPedagogicoCriado>`.
- Consume shared navigation/search/row interfaces from Task 2 and typed JSON reader from Task 1.
- The action selects the configured class/composition/ano and required signature setting; it does not modify any existing record or silently switch the configured uniqueness tuple.

- [x] **Step 1: Write the Content Applied creation spec** with success feedback and exact grid-row assertions; read the config from `Conteúdo Aplicado/` and keep the created row.
- [x] **Step 2: Run it and confirm the expected missing-action assertion fails.** Load the actions barrel and assert the export before login.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/criar_conteudo_aplicado_action.spec.ts"`

Expected: the test runs and FAILS at the missing `criarConteudoAplicado` export assertion before login or mutation.

- [x] **Step 3: Implement the type-specific visible form interactions.** Preserve optional form defaults, select required signature, and assert the saved row contains the configured type/turma/composição/ano.
- [ ] **Step 4: Export and run the focused regression spec once.** Pendente: o runner local tem bloqueio DNS já comprovado; não repeti probes equivalentes.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/criar_conteudo_aplicado_action.spec.ts"`

Expected: exactly one test passes and the unique configured row remains.

### Task 4: Criação de Parecer Descritivo

**Files:**
- Create: `src/actions/tipo-registro-pedagogico/parecer-descritivo.action.ts`
- Modify: `src/actions/index.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/criar_parecer_descritivo_action.spec.ts`

**Interfaces:**
- Produce `criarParecerDescritivo(page: Page, dados: ParecerDescritivoData): Promise<TipoRegistroPedagogicoCriado>`.
- Consume shared navigation/search/row interfaces from Task 2 and typed JSON reader from Task 1.
- Required values include finalidade, periodicidade, composition/years as required by the selected class, and the observed required signature option.

- [x] **Step 1: Write the Parecer Descritivo creation spec** with configured JSON, sandbox guard, visible menu navigation, success feedback and exact grid-row assertions.
- [x] **Step 2: Run it and confirm the expected missing-action assertion fails.** Load the actions barrel and assert the export before login.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/criar_parecer_descritivo_action.spec.ts"`

Expected: the test runs and FAILS at the missing `criarParecerDescritivo` export assertion before login or mutation.

- [x] **Step 3: Implement the visible form interactions.** Select the configured finalidade and periodicidade; fill only fields required/exposed by the form; preserve optional defaults; assert the configured row after save.
- [ ] **Step 4: Export and run the focused regression spec once.** Pendente: o runner local tem bloqueio DNS já comprovado; não repeti probes equivalentes.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/criar_parecer_descritivo_action.spec.ts"`

Expected: exactly one test passes and the configured row remains.

### Task 5: Criação de Planejamento

**Files:**
- Create: `src/actions/tipo-registro-pedagogico/planejamento.action.ts`
- Modify: `src/actions/index.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/criar_planejamento_action.spec.ts`

**Interfaces:**
- Produce `criarPlanejamento(page: Page, dados: PlanejamentoData): Promise<TipoRegistroPedagogicoCriado>`.
- Consume shared navigation/search/row interfaces from Task 2 and typed JSON reader from Task 1.
- Required values include finalidade, periodicidade, composição/anos as required, Tipo do Registro (`'Por componente' | 'Único'`) and the observed required signature option.

- [x] **Step 1: Write the Planejamento creation spec** with configured JSON, sandbox guard, visible menu navigation, success feedback and exact grid-row assertions.
- [x] **Step 2: Run it and confirm the expected missing-action assertion fails.** Load the actions barrel and assert the export before login.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/criar_planejamento_action.spec.ts"`

Expected: the test runs and FAILS at the missing `criarPlanejamento` export assertion before login or mutation.

- [x] **Step 3: Implement the visible form interactions.** Choose the configured finalidade and Tipo do Registro; inspect and handle conditional options only when shown; preserve optional defaults; assert the configured row after save.
- [ ] **Step 4: Export and run the focused regression spec once.** Pendente: o runner local tem bloqueio DNS já comprovado; não repeti probes equivalentes.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/criar_planejamento_action.spec.ts"`

Expected: exactly one test passes and the configured row remains.

### Task 6: Exclusão exata para os quatro tipos

**Files:**
- Create: `src/actions/tipo-registro-pedagogico/excluir.action.ts`
- Modify: `src/actions/index.ts`
- Modify: `src/helpers/navigation/tipo-registro-pedagogico.navigation.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/excluir_atividades_especificas_action.spec.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/excluir_conteudo_aplicado_action.spec.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/excluir_parecer_descritivo_action.spec.ts`
- Create: `tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/excluir_planejamento_action.spec.ts`

**Interfaces:**
- Produce `TipoRegistroPedagogicoAlvoExclusao` with exact `descricao`, `tipo`, `tipoTurma`, `ano` and optional `composicao`.
- Produce `TipoRegistroPedagogicoExcluido` with `descricao`, `tipo` and `url`.
- Produce `excluirTipoRegistroPedagogico(page: Page, alvo: TipoRegistroPedagogicoAlvoExclusao): Promise<TipoRegistroPedagogicoExcluido>`.
- The deletion specs consume their own exact JSON and the shared deletion action. They do not call or configure a batch-delete helper.

- [x] **Step 1: Write all four deletion specs.** Each reads only its local exclusion JSON, validates the exact QAAUTO target, checks the exact row/category/turma/composição/ano, and asserts the row is absent after the success dialog closes.
- [x] **Step 2: Run the Atividades Específicas deletion spec and confirm the expected missing-action assertion fails.** Load the actions barrel and assert the export before login or a delete click.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/excluir_atividades_especificas_action.spec.ts"`

Expected: the test runs and FAILS at the missing `excluirTipoRegistroPedagogico` export assertion; no registration is touched.

- [x] **Step 3: Implement the shared exact-row deletion.** Search by exact description; require one matching row; compare each configured identity column displayed by the grid and the year shown in the page header; click the visible description cell to open the edit form; recheck description, type, class, composition and school years in the form; click `#btn_excluir`; verify the confirmation text; confirm; verify visible success; close it; search again and assert zero rows.
- [ ] **Step 4: Export the deletion action and run each deletion spec once** in the order Atividades Específicas, Conteúdo Aplicado, Parecer Descritivo, Planejamento. Pendente: o runner local tem bloqueio DNS e a execução destrutiva depende de autorização explícita no momento da execução.

Run only after the corresponding QAAUTO targets have been created and the user explicitly authorizes execution of these destructive specs.

Expected: four tests pass; each exact row is absent afterward.

### Task 7: Revisão integrada e duas execuções independentes

**Files:**
- Verify: `src/factories/tipo-registro-pedagogico.factory.ts`
- Verify: `src/actions/tipo-registro-pedagogico/`
- Verify: `src/helpers/navigation/tipo-registro-pedagogico.navigation.ts`
- Verify: all specs and JSONs under `tests/Cadastro/Tipo de Registro Pedagógico/`

**Interfaces:**
- Consume the factory, readers, four creation actions, common navigation and exact deletion action from Tasks 1–6.
- The command lists all creation specs first, then all deletion specs. `--max-failures=1` stops before deletion if any earlier create/assertion fails.

- [x] **Step 1: Run the focused factory/configuration unit tests** and confirm all safety and required-field cases pass.

Run: `npm.cmd run test:unit -- "tests/Cadastro/Tipo de Registro Pedagógico/tipo_registro_pedagogico.factory.spec.ts" --workers=1 --retries=0`

Expected: all focused unit tests pass.

- [ ] **Step 2: Run the eight module specs in order once** only after sandbox runner access is restored and the user authorizes deletion execution; use one worker, retries disabled and stop-on-first-failure. Capture the result for every creation and deletion.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 --max-failures=1 "tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/criar_atividades_especificas_action.spec.ts" "tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/criar_conteudo_aplicado_action.spec.ts" "tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/criar_parecer_descritivo_action.spec.ts" "tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/criar_planejamento_action.spec.ts" "tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/excluir_atividades_especificas_action.spec.ts" "tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/excluir_conteudo_aplicado_action.spec.ts" "tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/excluir_parecer_descritivo_action.spec.ts" "tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/excluir_planejamento_action.spec.ts"`

Expected: 8 passed; each create row is confirmed and each exact row is absent after deletion.

- [ ] **Step 3: Run the same eight specs a second time** only with equivalent sandbox access and renewed explicit authorization for destructive specs; do not rely on data/session state produced by the first run.

Run: repeat the exact command from Step 2.

Expected: 8 passed independently; no `skip`, `fixme`, retries or broad deletion.

- [x] **Step 4: Run TypeScript validation and inspect final source with an independent review.**

Run: `npx.cmd tsc --noEmit`

Expected: exit code 0; the final review confirms only this module, its tests/configs, and the two Superpowers documents changed. If sandbox network or application behavior blocks either E2E run, report the observed evidence and leave the expected assertions intact.

## Execution constraint

The current workspace has no `.git`, and the user explicitly authorized Native implementation in this folder without a worktree. Do not initialize repository metadata or claim commits. Record progress in `.superpowers/sdd/2026-10-06-tipo-registro-pedagogico/progress.md`, retain separate static/E2E evidence, and use an independent final review of the changed files because Git branch review is unavailable.

Execution evidence (2026-10-06):
- The focused configuration/factory unit spec passed 13/13 and TypeScript validation passed.
- The three create RED specs and one delete RED spec failed on their intended missing-export assertions before login.
- The Atividades Específicas create E2E reached login, then local Playwright failed with net::ERR_NAME_NOT_RESOLVED at the sandbox hostname before any form interaction.
- The delete E2E specs and the remaining live create E2Es were not run because the runner has the same DNS blocker and destructive execution needs explicit action-time authorization.
- UI exploration showed that opening a grid description enters the edit form, where the visible #btn_excluir control is used; no record was deleted during exploration.
