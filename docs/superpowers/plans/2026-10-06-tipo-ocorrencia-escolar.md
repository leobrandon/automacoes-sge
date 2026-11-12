# Tipo de Ocorrência Escolar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after the plan is approved. Steps use checkbox (`- [x]`) syntax.

**Goal:** Add independent Playwright specs and JSON files to create and later delete one QAAUTO Tipo de Ocorrência Escolar through the visible SGE SANDBOX UI.

**Architecture:** A typed factory and module-local JSON reader validate the configured type and exact deletion target. A navigation helper owns visible menu navigation, asynchronous loading, exact search, and row/edit locators; separate action modules implement creation/read-back and deletion. Two specs remain independent and read their own JSON files.

**Tech Stack:** TypeScript, Playwright Test (`regression` project), JSON, existing SGE auth, locator, and loading helpers.

**Spec:** `docs/superpowers/specs/2026-10-06-tipo-ocorrencia-escolar-design.md`

## Global Constraints

- Use the SANDBOX host `sandbox.pontoid.com.br` and the existing login helper.
- Navigate only through visible menu items and controls; do not navigate directly to internal routes or issue mutation requests.
- Create exactly one record named from `QAAUTO Tipo de Ocorrência Escolar` with sequence `1`.
- Keep creation and deletion in separate specs with separate JSON files; creation does not clean itself up.
- Delete only the exact description explicitly listed in the deletion JSON, after confirming a unique matching row.
- Configure the seven occurrence fields exactly as specified and enable Aluno, Responsável do Aluno, and Servidor; disable Outro.
- Use `workers: 1`, web-first assertions, visible controls, and no fixed sleeps.
- Keep credentials outside versioned files. Do not modify existing sandbox records.
- Do not run Playwright E2E during this implementation unless the user explicitly asks for test execution; provide commands and report E2E status separately.

## Review Focus

- The involved-person tab is conditional on `Informar Envolvidos = Sim e Obrigatório`; the create spec must wait for it to become visible before configuring categories.
- Each of the seven basic fields must retain the exact configured value after saving and reopening the QAAUTO row.
- The deletion target must resolve to exactly one exact description; zero or multiple matches fail before the delete button is clicked.
- The delete confirmation was not safely inspectable on a system record; only interact with a visible confirmation scoped to the exact QAAUTO edit form and verify grid absence afterward.
- SGE panels and grids load asynchronously; wait for visible headings, controls, loaders, and grid results rather than using fixed delays.

---

### Task 1: Define the type data contract and JSON readers

**Files:**
- Create: `src/factories/tipo-ocorrencia-escolar.factory.ts`
- Create: `tests/Cadastro/Tipo de Ocorrência Escolar/tipo_ocorrencia_escolar_config.ts`
- Create: `tests/Cadastro/Tipo de Ocorrência Escolar/dados_tipo_ocorrencia_escolar.json`
- Create: `tests/Cadastro/Tipo de Ocorrência Escolar/dados_exclusao_tipo_ocorrencia_escolar.json`

**Interfaces:**
- `OpcaoCampoOcorrencia = 'Não' | 'Sim' | 'Sim e Obrigatório'`.
- `OpcaoSimNao = 'Sim' | 'Não'`.
- `TipoOcorrenciaEscolarData` contains `descricao`, `ativo`, `parametrizacao`, and `dadosEnvolvidos`; `parametrizacao` has the seven keys in the JSON below, and each person toggle is an `OpcaoSimNao`.
- `TipoOcorrenciaEscolarNomeado = TipoOcorrenciaEscolarData & { sequencia: number }` stores the deterministic description with its sequence.
- `TipoOcorrenciaEscolarCriado = TipoOcorrenciaEscolarNomeado & { url: string }` records the created item and the current UI URL.
- `buildTipoOcorrenciaEscolar(dados: TipoOcorrenciaEscolarData, sequencia = 1): TipoOcorrenciaEscolarNomeado` returns the data with the deterministic description suffix and sequence.
- `isTipoOcorrenciaEscolarQAAuto(descricao: string): boolean` accepts only a trimmed `QAAUTO` description ending in a numeric sequence.
- `ConfiguracaoCriacaoTipoOcorrenciaEscolar = { quantidade: 1; dados: TipoOcorrenciaEscolarData }`.
- `ConfiguracaoExclusaoTipoOcorrenciaEscolar = { excluirSomenteDescricoesConfiguradas: true; quantidadeEsperada: 1; descricoes: string[] }`.
- `lerConfiguracaoCriacaoTipoOcorrenciaEscolar(): ConfiguracaoCriacaoTipoOcorrenciaEscolar` reads and validates the create JSON.
- `lerConfiguracaoExclusaoTipoOcorrenciaEscolar(): ConfiguracaoExclusaoTipoOcorrenciaEscolar` reads the exact deletion list and requires `excluirSomenteDescricoesConfiguradas === true`.
- `validarUrlSandbox(baseUrl: string): string` rejects invalid URLs and any hostname other than `sandbox.pontoid.com.br`.
- `validarEscopoExclusao(config: ConfiguracaoExclusaoTipoOcorrenciaEscolar, descricoesAlvo: string[]): void` requires one expected, unique, exact QAAUTO target and no broader prefix search.

**Create JSON values:**

```json
{
  "quantidade": 1,
  "descricao": "QAAUTO Tipo de Ocorrência Escolar",
  "ativo": "Sim",
  "parametrizacao": {
    "naturezaOcorrencia": "Não",
    "dataOcorrencia": "Sim e Obrigatório",
    "turnoOcorrencia": "Sim",
    "horaOcorrencia": "Não",
    "descricaoOcorrencia": "Sim e Obrigatório",
    "procedimentoAdotado": "Sim",
    "informarEnvolvidos": "Sim e Obrigatório"
  },
  "dadosEnvolvidos": {
    "aluno": "Sim",
    "responsavelDoAluno": "Sim",
    "servidor": "Sim",
    "outro": "Não"
  }
}
```

**Delete JSON values:**

```json
{
  "excluirSomenteDescricoesConfiguradas": true,
  "quantidadeEsperada": 1,
  "descricoes": ["QAAUTO Tipo de Ocorrência Escolar 1"]
}
```

- [x] **Step 1: Define the TypeScript unions and data interfaces** in `src/factories/tipo-ocorrencia-escolar.factory.ts`; constrain the seven field values and person toggles to the observed UI labels.
- [x] **Step 2: Implement the deterministic builder and QAAUTO guard**; append only the one-based sequence to the configured description and reject invalid descriptions or sequence numbers.
- [x] **Step 3: Add both JSON files** with the exact values above; do not add credential fields or extra batch targets.
- [x] **Step 4: Implement the module-local JSON readers and validation** in `tipo_ocorrencia_escolar_config.ts`; validate object shape, quantity, options, description length (maximum 100 characters), sandbox URL, exact deletion count, unique target, and explicit deletion flag.
- [x] **Step 5: Review the resulting interfaces against the JSON files** and ensure deletion cannot be widened to a QAAUTO prefix or arbitrary name.

### Task 2: Add visible navigation and exact grid locators

**Files:**
- Create: `src/helpers/navigation/tipo-ocorrencia-escolar.navigation.ts`
- Modify: `src/helpers/navigation/index.ts`

**Interfaces:**
- `navegarParaConsultaTipoOcorrenciaEscolar(page: Page): Promise<void>` opens Cadastro > Tipo de Ocorrência Escolar through visible menu links and waits for the consultation heading and grid.
- `pesquisarTipoOcorrenciaEscolar(page: Page, descricao: string): Promise<void>` fills the visible search box, activates the visible search control, and waits for SGE loaders/grid completion.
- `linhaTipoOcorrenciaEscolar(page: Page, descricao: string): Locator` returns only a row containing the exact description.
- `abrirEdicaoTipoOcorrenciaEscolar(page: Page, descricao: string): Promise<void>` opens the exact description cell and waits for the edit heading.
- `aguardarCarregamentoTipoOcorrenciaEscolar(page: Page): Promise<void>` composes the existing loading helpers with the observed page state.

- [x] **Step 1: Implement consultation navigation** using the visible `Cadastro` and `Tipo de Ocorrência Escolar` menu controls; reuse `getByRoleSge`, `waitForSgeLoaders`, and explicit visibility assertions.
- [x] **Step 2: Implement exact description search** using the live search control and the existing SGE loading convention; do not hard-code an internal `page.goto` route.
- [x] **Step 3: Implement exact row and edit-opening helpers**; require one matching row before clicking its description cell and wait for `Editar Tipo de Ocorrência Escolar`.
- [x] **Step 4: Export the helpers from `src/helpers/navigation/index.ts`** and inspect the actual exported names for collisions.

### Task 3: Implement creation with saved-configuration read-back

**Files:**
- Create: `src/actions/criar-tipo-ocorrencia-escolar.action.ts`
- Modify: `src/actions/index.ts`
- Create: `tests/Cadastro/Tipo de Ocorrência Escolar/criar_tipo_ocorrencia_escolar_action.spec.ts`

**Interfaces:**
- `criarTipoOcorrenciaEscolar(page: Page, dados: TipoOcorrenciaEscolarData, sequencia = 1): Promise<TipoOcorrenciaEscolarCriado>` performs visible form entry, save, grid confirmation, and persisted-value read-back.
- The spec reads `dados_tipo_ocorrencia_escolar.json`, validates the sandbox URL, calls `loginSge`, and invokes the create action once.

- [x] **Step 1: Implement a field-selection helper** in the create action that checks the observed value, opens the visible selector, clicks the exact visible option, and asserts the selected value afterward.
- [x] **Step 2: Implement the create flow**: navigate to the consultation, click visible Adicionar, fill the QAAUTO description, set Ativo, and set the seven parametrization values from JSON.
- [x] **Step 3: Wait for and configure `Dados dos envolvidos`** after `Informar Envolvidos` is set to `Sim e Obrigatório`; set Aluno, Responsável do Aluno, and Servidor to Sim and Outro to Não. Leave secondary toggles at their screen defaults.
- [x] **Step 4: Save and require visible success feedback**; then search the exact description and require one row with the expected description and active status.
- [x] **Step 5: Verify persistence** by opening that row in edit mode, asserting all seven selected values and all four person-category settings against JSON, then clicking Voltar without saving.
- [x] **Step 6: Add the independent creation spec** with one functional test, no automatic cleanup or duplicate pre-query, and a `console.log` only after the grid and persisted settings have been confirmed.
- [x] **Step 7: Export the action** from `src/actions/index.ts` if the barrel is needed by the spec.

### Task 4: Implement exact-target deletion

**Files:**
- Create: `src/actions/excluir-tipo-ocorrencia-escolar.action.ts`
- Modify: `src/actions/index.ts`
- Create: `tests/Cadastro/Tipo de Ocorrência Escolar/excluir_tipo_ocorrencia_escolar_action.spec.ts`

**Interfaces:**
- `TipoOcorrenciaEscolarExcluido = { descricao: string; url: string }`.
- `excluirTipoOcorrenciaEscolar(page: Page, descricao: string): Promise<TipoOcorrenciaEscolarExcluido>` rejects non-QAAUTO descriptions, requires one exact row, removes that exact type, and verifies its absence from the consultation.
- The spec reads `dados_exclusao_tipo_ocorrencia_escolar.json`, validates the sandbox URL and deletion scope, calls `loginSge`, and processes only the listed description.

- [x] **Step 1: Validate the exact target before UI interaction** using `isTipoOcorrenciaEscolarQAAuto`; fail closed for any name outside the JSON.
- [x] **Step 2: Search the exact description and require exactly one row**; verify the row text before opening edit. Zero or multiple results must fail without clicking Excluir.
- [x] **Step 3: Open the exact row in edit mode and verify its description again** before interacting with Excluir.
- [x] **Step 4: Click the visible Excluir control and inspect the visible confirmation** only on the QAAUTO target; scope the explicit confirmation button to that dialog and do not use a system record to discover dialog behavior.
- [x] **Step 5: Confirm and verify removal** by requiring visible success feedback, searching the same exact description again, asserting zero rows, and logging only after grid absence.
- [x] **Step 6: Add the independent deletion spec** with no batch or prefix mode and export the action from `src/actions/index.ts` if needed.

### Task 5: Static review and handoff

**Files:**
- Review: all files listed above and imports from the existing helper, factory, and action barrels.

- [x] **Step 1: Review file paths and imports** from the three-level-deep test folder; use `../../../src/...` for source imports, resolve JSON reads relative to `__dirname`, and ensure no credential enters source control.
- [x] **Step 2: Run a TypeScript-only static check** with `npx.cmd tsc -p tsconfig.json --noEmit --pretty false`; this is not a Playwright test run.
- [x] **Step 3: Review the diff and safety conditions**: two separate specs, two separate JSONs, exact deletion guard, one-based QAAUTO name, visible menu flow, no fixed sleeps, and no deletion cleanup in the create spec.
- [x] **Step 4: Report the E2E commands without executing them** unless the user requests test execution:

```powershell
npx.cmd playwright test --project=regression --workers=1 --retries=0 "tests/Cadastro/Tipo de Ocorrência Escolar/criar_tipo_ocorrencia_escolar_action.spec.ts"
npx.cmd playwright test --project=regression --workers=1 --retries=0 "tests/Cadastro/Tipo de Ocorrência Escolar/excluir_tipo_ocorrencia_escolar_action.spec.ts"
```

The local Playwright skill's full validation is two independent create/delete pairs with clean state between pairs. Keep that status pending until the runs are explicitly requested and actually pass. The workspace has no `.git` directory, so do not attempt a Git commit.

---

## Execution Notes

- Recommended execution method: **Native**. The five tasks form one small module with shared file interfaces, and there is no independent subsystem that benefits from separate workers.
- After this plan is reviewed and the execution method is selected, invoke `superpowers:executing-plans` for Native execution. If the user instead selects Subagent-driven execution, use `superpowers:subagent-driven-development` only after that explicit selection.
- The exact copy of the deletion confirmation remains unobserved. Do not infer it from other modules; if execution is later authorized, capture it only while operating on the exact QAAUTO record created by this automation.
