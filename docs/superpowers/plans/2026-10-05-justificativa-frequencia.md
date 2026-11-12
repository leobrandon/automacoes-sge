# Automação de Justificativa de Frequência Implementation Plan

> Histórico da implementação inicial. A correção solicitada pelo usuário separou a antiga spec de ciclo em `criar_justificativa_frequencia_action.spec.ts` e `excluir_justificativa_frequencia_action.spec.ts`, com descrições exatas no JSON de exclusão. Os resultados E2E marcados abaixo pertencem à antiga spec integrada; as duas novas specs ainda não foram executadas, conforme pedido do usuário. A especificação atualizada está em `docs/superpowers/specs/2026-10-05-justificativa-frequencia-design.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and verify a repeatable SANDBOX UI cycle that creates two QAAUTO Justificativas de Frequência with Abono Sim/Não, validates them in the grid, then deletes only those created by that run.

**Architecture:** Add a deterministic factory, UI navigation helpers, and separate create and delete action modules. Separate creation and deletion JSON files configure the integrated lifecycle spec, which passes created descriptions directly to the exact-record deletion action so every run cleans up only its own records.

**Tech Stack:** TypeScript, `@playwright/test`, existing SGE helpers, JSON configuration, Playwright `regression` and `unit` projects.

**Spec:** `docs/superpowers/specs/2026-10-05-justificativa-frequencia-design.md`

## Global Constraints

- The cycle uses only the visible SANDBOX UI configured in `.env`; it does not access internal routes directly or simulate mutation calls.
- Creation uses QAAUTO names related to Justificativa de Frequência and a deterministic sequence.
- The deletion action accepts only exact QAAUTO descriptions returned by the current cycle; the deletion JSON does not authorize broad search or deletion of preexisting records.
- Cleanup runs at the end of each cycle, making two independent runs repeatable. If the test fails after a creation, cleanup may remove only names that run recorded as created, without hiding the original failure.
- The automation does not store credentials and requires `workers=1` and `retries=0`.
- This workspace currently has no Git metadata; do not initialize a repository or claim a commit was made.

## Review Focus

- An invalid sequence, non-QAAUTO description base, or unrecognized Abono option must fail in the factory before UI interaction; pin these in the factory unit tests (Task 1).
- A configured Abono value must agree with the visible switch and grid marker for both Sim and Não; pin both cases in the focused lifecycle E2E assertions (Task 2).
- A deletion scope/count mismatch, non-QAAUTO name, or duplicate description must fail before a delete click; pin these cases in the configuration helper's unit tests (Task 1).
- A non-SANDBOX base URL must stop before login or mutation; pin the host guard in the configuration helper's unit tests (Task 1).
- If cleanup also fails, the original test failure must remain visible; pin error aggregation behavior in the configuration helper's unit tests (Task 1).

---

### Task 1: Factory and data contracts

**Files:**
- Create: `src/factories/justificativa-frequencia.factory.ts`
- Create: `tests/Cadastro/justificativa-de-frequencia/justificativa_frequencia_config.ts`
- Create: `tests/Cadastro/justificativa-de-frequencia/justificativa_frequencia.factory.spec.ts`
- Create: `tests/Cadastro/justificativa-de-frequencia/justificativa_frequencia_config.factory.spec.ts`
- Create: `tests/Cadastro/justificativa-de-frequencia/dados_justificativa_frequencia.json`
- Create: `tests/Cadastro/justificativa-de-frequencia/dados_exclusao_justificativa_frequencia.json`

**Interfaces:**
- Produce `JustificativaFrequenciaData` with `descricao: string`, `abonaFalta: boolean`, and `ativa: boolean`.
- Produce `BuildJustificativaFrequenciaOptions` with optional `descricao`, `abonoPorSequencia: Array<'Sim' | 'Não'>`, and `ativa: 'Sim' | 'Não'`.
- Produce `buildJustificativaFrequencia(options: BuildJustificativaFrequenciaOptions, sequencia: number): JustificativaFrequenciaData` and `isJustificativaFrequenciaQAAuto(descricao: string): boolean`.
- Produce `lerConfiguracaoCriacaoJustificativaFrequencia(): ConfiguracaoCriacaoJustificativaFrequencia` with `{ quantidade, dados }`, `lerConfiguracaoExclusaoJustificativaFrequencia(): ConfiguracaoExclusaoJustificativaFrequencia` with `{ excluirSomenteCriadasNestaExecucao, quantidadeEsperada }`, `validarUrlSandbox(baseUrl: string): string`, and `validarEscopoExclusao(config: ConfiguracaoExclusaoJustificativaFrequencia, descricoesCriadas: string[]): void` in the test config module. `validarUrlSandbox` accepts only hostname `sandbox.pontoid.com.br` and runs before login.
- Produce `combinarFalhasCiclo(erroPrincipal: unknown, errosLimpeza: Error[]): unknown | undefined`, returning the original error if cleanup succeeds, an `AggregateError` if cleanup also fails, or `undefined` if the cycle succeeded.
- Creation JSON uses `quantidade: 2`, a semantic QAAUTO description base, `abonoPorSequencia: ['Sim', 'Não']`, and `ativa: 'Sim'`.
- Deletion JSON uses `excluirSomenteCriadasNestaExecucao: true` and `quantidadeEsperada: 2`.

- [x] **Step 1: Write factory and configuration tests** for sequence suffixes, configured description base, Sim/Não boolean mapping, default active state, invalid sequence, invalid QAAUTO base, invalid Abono option, QAAUTO predicate, non-SANDBOX URL, deletion scope disabled, deletion count mismatch, non-QAAUTO deletion description, duplicate deletion descriptions, and preserving the original error when cleanup fails.
- [x] **Step 2: Run the focused unit tests and confirm the new factory import fails.**

Run: `npm.cmd run test:unit -- "tests/Cadastro/justificativa-de-frequencia/justificativa_frequencia.factory.spec.ts" "tests/Cadastro/justificativa-de-frequencia/justificativa_frequencia_config.factory.spec.ts" --workers=1 --retries=0`

Expected: FAIL because the factory and configuration modules have not been implemented.

- [x] **Step 3: Implement the factory and JSON configuration readers.** Generate `descricao` as `<base> <sequencia>`, map `Sim` to `abonaFalta: true` and `Não` to `false`, use the configured sequence entry for each record, reject missing or invalid sequence entries, and implement pure helpers for SANDBOX host, exact deletion-scope validation, and preserving/aggregating cycle errors.
- [x] **Step 4: Run the focused unit tests and confirm they pass.**

Run: `npm.cmd run test:unit -- "tests/Cadastro/justificativa-de-frequencia/justificativa_frequencia.factory.spec.ts" "tests/Cadastro/justificativa-de-frequencia/justificativa_frequencia_config.factory.spec.ts" --workers=1 --retries=0`

Expected: all factory cases pass in project `unit`.

### Task 2: Visible navigation and creation action

**Files:**
- Create: `src/helpers/navigation/justificativa-frequencia.navigation.ts`
- Modify: `src/helpers/navigation/index.ts`
- Create: `src/actions/criar-justificativa-frequencia.action.ts`
- Modify: `src/actions/index.ts`
- Create: `tests/Cadastro/justificativa-de-frequencia/criar_e_excluir_justificativa_frequencia_action.spec.ts`

**Interfaces:**
- Produce `navegarParaConsultaJustificativaFrequencia(page: Page): Promise<void>`, `navegarParaAdicionarJustificativaFrequencia(page: Page): Promise<void>`, `pesquisarJustificativaFrequencia(page: Page, termo: string): Promise<void>`, and `linhaJustificativaFrequencia(page: Page, descricao: string): Locator`.
- Produce `JustificativaFrequenciaCriada extends JustificativaFrequenciaData` with `url: string` and `sequencia: number`.
- Produce `criarJustificativaFrequencia(page: Page, options: BuildJustificativaFrequenciaOptions, sequencia: number): Promise<JustificativaFrequenciaCriada>`.
- Navigation must follow visible Cadastro > Ensino > Justificativa de Frequência controls. The observed form IDs are `#Descricao`, `#Abono`, `#Ativa`, and `#btn-salvar`.

- [x] **Step 1: Write the full lifecycle spec.** Read both JSON files; build the expected descriptions from creation data and validate the deletion scope against that planned list; guard that the selected base URL hostname is `sandbox.pontoid.com.br`; log in through `loginSge`; create exactly `quantidade` records; track each action's returned description before assertions; assert the exact row count, description, and Abono marker (`Abona` or `Não abona`) for each; then delete only tracked descriptions and combine execution/cleanup failures.
- [x] **Step 2: Run the focused regression spec and confirm it fails on missing action/navigation imports.** Red evidence: expected failure on the not-yet-created create-action import, before browser interaction.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 "tests/Cadastro/justificativa-de-frequencia/criar_e_excluir_justificativa_frequencia_action.spec.ts"`

Expected: FAIL before browser interaction because the new navigation and create action are not implemented.

- [x] **Step 3: Implement the navigation module** using visible menu controls, `#main` scoping, the existing loader helper, and web-first assertions for the consultation heading, search field, grid, and add form. The observed grid request is GET to `/justificativafrequencia/indexgrid`.
- [x] **Step 4: Implement the create action** with visible modal controls; set `#Abono` and `#Ativa` to factory values, verify both checkbox states, save, wait for the observed success text `Os dados foram salvos.`, and verify the persisted Abono marker in the grid.
- [x] **Step 5: Export navigation and creation interfaces** from their indexes and rerun the focused regression spec. Imports/types resolve and the final lifecycle E2E passes twice.

Expected: creation imports and types resolve; test discovery still fails before browser interaction because the delete action has not yet been implemented.

### Task 3: Exact-record deletion and cleanup ownership

**Files:**
- Create: `src/actions/excluir-justificativa-frequencia.action.ts`
- Modify: `src/actions/index.ts`
- Modify: `src/helpers/navigation/justificativa-frequencia.navigation.ts`
- Modify: `tests/Cadastro/justificativa-de-frequencia/criar_e_excluir_justificativa_frequencia_action.spec.ts`

**Interfaces:**
- Produce `JustificativaFrequenciaExcluida` with `descricao: string` and `url: string`.
- Produce `excluirJustificativaFrequencia(page: Page, descricao: string): Promise<JustificativaFrequenciaExcluida>`.
- The lifecycle spec tracks each successfully created exact description and passes those strings to the delete action; it never passes a global QAAUTO search term.

- [x] **Step 1: Verify failure-safe cleanup in the lifecycle spec.** The deletion config scope/count is validated against the full planned description list before login or mutation; on failure after some creations, catch and retain the original test error, delete only descriptions returned by successful create actions, collect cleanup errors, then throw the result of `combinarFalhasCiclo`.
- [x] **Step 2: Run the focused regression spec and confirm it fails because the delete action is missing.** Validation deviation: the first red run stopped at the missing create-action import before reaching the missing delete-action import; both imports resolved in the final green runs.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 "tests/Cadastro/justificativa-de-frequencia/criar_e_excluir_justificativa_frequencia_action.spec.ts"`

Expected: FAIL at the unresolved delete action export; no broad deletion is attempted.

- [x] **Step 3: Implement exact-record deletion.** Require a trimmed QAAUTO description; search it; require exactly one row; click that row's visible remove control; confirm the observed removal prompt and success message; search again; assert the row count is zero.
- [x] **Step 4: Export deletion and navigation interfaces** and run the focused unit tests for the exact QAAUTO and duplicate-description guards.

Expected: invalid deletion scope or quantity fails before a delete click; exact QAAUTO deletion confirms the row is absent.

### Task 4: Two independent SANDBOX E2E runs

**Files:**
- Verify: `tests/Cadastro/justificativa-de-frequencia/criar_e_excluir_justificativa_frequencia_action.spec.ts`
- Verify: all files from Tasks 1–3

**Interfaces:**
- Consume the factory, navigation, create, and delete interfaces defined above.

- [x] **Step 1: Run the regression spec once** with the `.env` sandbox configuration, one worker, and retries disabled. Result: 1 passed.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 "tests/Cadastro/justificativa-de-frequencia/criar_e_excluir_justificativa_frequencia_action.spec.ts"`

Expected: exactly one test runs and passes; both Abono values are verified, and both records are absent at completion.

- [x] **Step 2: Review the first run's trace, console, and final grid state.** The focused test asserts exact row absence after each deletion; an external sandbox DNS restriction required an elevated runner execution.
- [x] **Step 3: Run the same focused spec a second time** without using data or browser state from the first run. Result: 1 passed independently.

Run: `npx.cmd playwright test --project=regression --workers=1 --retries=0 "tests/Cadastro/justificativa-de-frequencia/criar_e_excluir_justificativa_frequencia_action.spec.ts"`

Expected: exactly one test passes independently, with the same create/assert/delete/final-absence evidence.
- [x] **Step 4: Run a TypeScript check** with `npx.cmd tsc --noEmit` and report static and E2E results separately. Result: exit code 0; focused unit tests: 12 passed.

Expected: exit code 0; both independent E2E runs passed; no unrelated tests were run.

## Final review

Independent read-only review found no actionable issues after verifying that cleanup ownership is registered only after the preflight absence checks and that deletion requires one row with an exact description match. The final focused E2E passed twice after these corrections; 12 focused unit tests and TypeScript compilation also passed.
