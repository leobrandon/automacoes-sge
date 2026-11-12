import { Page, expect, Locator } from '@playwright/test';
import { waitForSgeLoaders, navegarParaConsultaAlunos } from '../helpers';
import { AlunoData, AlunoCriado } from './criar-aluno.action';

/**
 * Identificadores funcionais aceitos pela Action para localizar e excluir um aluno.
 * Aceita o objeto AlunoData completo, o retorno AlunoCriado ou um objeto parcial com identificadores.
 */
export interface AlunoIdentificador {
  /** Nome civil completo do estudante */
  nome: string;

  /** CPF do estudante (opcional) */
  cpf?: string;

  /** Matrícula escolar do estudante (opcional) */
  matricula?: string;

  /** Identificador numérico interno quando conhecido (opcional) */
  id?: string;
}

/**
 * Retorno produzido após a exclusão bem-sucedida do aluno no SGE.
 */
export interface AlunoExcluido {
  /** Identificador numérico do aluno quando observável na interface */
  id?: string;

  /** Nome civil do estudante excluído */
  nome: string;

  /** CPF do estudante excluído (se informado/localizado) */
  cpf?: string;

  /** Matrícula escolar do estudante excluído (se informada/localizada) */
  matricula?: string;

  /** URL observada na interface após a confirmação da exclusão */
  url: string;
}

/**
 * Normaliza texto para comparações resilientes no SGE (remove acentos, pontuações e espaços extras).
 */
function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Escapa caracteres especiais para uso em expressões regulares.
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface LoteExclusaoAlunosResultado {
  totalExcluidos: number;
  alunosExcluidos: string[];
  falhas: Array<{ nome: string; motivo: string }>;
}

/**
 * Marcadores aceitos na limpeza em lote como palavra isolada do nome: "[QA-AUTO]" (factory atual), "QAAUTO" e
 * "QA" (registros criados manualmente antes da automação). Evita casar "qa" dentro de outra palavra.
 */
const MARCADOR_QAAUTO = /(^|[\s[(])QA(-?AUTO)?($|[\s\])])/i;
const TERMOS_LOTE_ACEITOS = ['QA', 'QAAUTO', 'QA-AUTO'];

/**
 * Remove em lote os alunos de teste (nome contendo QAAUTO ou QA-AUTO), pela interface do SGE.
 *
 * Pesquisa pelo termo, coleta nome e matrícula das linhas que conferem com o marcador e exclui uma a uma com
 * `excluirAluno` (identificação por matrícula + validação de nome). Falhas por aluno são registradas e a
 * limpeza continua; nunca exclui um nome que não tenha o marcador.
 *
 * @param termo Aceita somente "QA", "QAAUTO" ou "QA-AUTO" (padrão: "QA"). A pesquisa usa "QA" (o mais amplo) e a
 * exclusão exige o marcador como palavra isolada no nome.
 * @param maxExclusoes Limite de segurança por execução (padrão: 50).
 */
export async function excluirAlunosEmLote(
  page: Page,
  termo: string = 'QA',
  maxExclusoes: number = 50
): Promise<LoteExclusaoAlunosResultado> {
  if (!TERMOS_LOTE_ACEITOS.includes(termo.trim().toUpperCase())) {
    throw new Error(`[excluirAlunosEmLote] A exclusão em lote aceita somente os termos ${TERMOS_LOTE_ACEITOS.join(', ')}.`);
  }
  const termoPesquisa = 'QA';

  const alunosExcluidos: string[] = [];
  const falhas: Array<{ nome: string; motivo: string }> = [];
  const jaTentados = new Set<string>();

  while (alunosExcluidos.length + falhas.length < maxExclusoes) {
    await navegarParaConsultaAlunos(page);

    const selectSituacao = page.locator('#Matricula');
    if (await selectSituacao.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectSituacao.selectOption('0');
    }
    const selectCampoFiltro = page.locator('#CampoFiltroTermoDePesquisa');
    if (await selectCampoFiltro.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectCampoFiltro.selectOption('0'); // 0: Nome
    }
    await page.locator('#searchTerm').fill(termoPesquisa);
    await page.locator('#btnSubmitSearch, button:has(i.fa-search)').first().click();
    await waitForSgeLoaders(page);
    await page.locator('#grid').waitFor({ state: 'visible', timeout: 15000 });

    // Mostra o máximo de registros por página para que nenhum candidato fique fora da primeira página.
    const porPagina = page.locator('#grid select[name$="_length"]');
    if (await porPagina.isVisible({ timeout: 1000 }).catch(() => false)) {
      const valores = await porPagina.locator('option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
      const maior = valores.filter((v) => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a))[0];
      if (maior) {
        await porPagina.selectOption(maior);
        await waitForSgeLoaders(page);
      }
    }

    const linhas = page.locator('#grid table tbody tr').filter({ has: page.locator('.colunaAlunoNome') });
    // Só conclui que acabou quando a grade mostrar o estado vazio; contar linhas no meio do recarregamento
    // (troca de página/pesquisa) devolve 0 e encerrava o lote após o primeiro aluno.
    const gradeVazia = page.locator('#grid td.dataTables_empty');
    await expect.poll(
      async () => (await linhas.count()) > 0 || await gradeVazia.isVisible().catch(() => false),
      { message: 'A grade de alunos não terminou de carregar.', timeout: 20000 },
    ).toBe(true);
    await waitForSgeLoaders(page);
    const total = await linhas.count();

    let alvo: { nome: string; matricula: string } | undefined;
    for (let i = 0; i < total; i++) {
      const nome = (await linhas.nth(i).locator('.colunaAlunoNome').innerText()).trim();
      const matricula = (await linhas.nth(i).locator('td:nth-child(2)').innerText().catch(() => '')).trim();
      if (!MARCADOR_QAAUTO.test(nome) || jaTentados.has(`${nome}|${matricula}`)) continue;
      alvo = { nome, matricula };
      break;
    }

    if (!alvo) break;
    jaTentados.add(`${alvo.nome}|${alvo.matricula}`);
    console.log(`\n🧹 [Lote ${jaTentados.size}] Excluindo aluno "${alvo.nome}" (matrícula ${alvo.matricula || 'N/A'})...`);

    try {
      await excluirAluno(page, { nome: alvo.nome, matricula: alvo.matricula || undefined });
      alunosExcluidos.push(alvo.nome);
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      falhas.push({ nome: alvo.nome, motivo });
      console.warn(`⚠️ Aluno "${alvo.nome}" mantido: ${motivo}`);
      // Um alerta do SGE deixado aberto bloqueia a navegação da próxima iteração: fecha-o e volta à consulta.
      const alerta = page.locator('.swal2-popup:visible');
      if (await alerta.first().isVisible().catch(() => false)) {
        await alerta.first().getByRole('button', { name: /^(Ok|OK)$/ }).click({ timeout: 5000 }).catch(() => {});
        await page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
    }
  }

  return { totalExcluidos: alunosExcluidos.length, alunosExcluidos, falhas };
}

/**
 * Action de negócio reutilizável: Exclusão de Aluno no SGE Ponto iD via interface gráfica (UI-only).
 *
 * Executa o fluxo operacional estrito de exclusão:
 * 1. Navegação via menu até `Aluno > Cadastro` (/alunoindex);
 * 2. Pesquisa e localização do registro na grid de consulta;
 * 3. Validação estrita de unicidade e correspondência (anti-ambiguidade);
 * 4. Abertura do formulário de edição do aluno correspondente;
 * 5. Validação de segurança dos dados exibidos na tela de edição;
 * 6. Acionamento do botão "Excluir" para carregar a tela de confirmação de dados (/Aluno/ConsultaDadosExclusao/);
 * 7. Seleção dos dados a excluir (checkbox do aluno na árvore);
 * 8. Acionamento do botão "Excluir";
 * 9. Confirmação do modal de confirmação ("Tem certeza que deseja excluir?" -> "Sim");
 * 10. Validação visual de conclusão e ausência do aluno na listagem.
 *
 * @param page Instância do Playwright Page (autenticada no SGE).
 * @param target Identificador do estudante a ser excluído (AlunoIdentificador, AlunoData ou AlunoCriado).
 * @returns Informações do aluno excluído (id, nome, CPF, matrícula e URL).
 */
export async function excluirAluno(
  page: Page,
  target: AlunoIdentificador | AlunoData | AlunoCriado
): Promise<AlunoExcluido> {
  // --------------------------------------------------------------------------
  // 1. Validação Prévia dos Parâmetros de Entrada
  // --------------------------------------------------------------------------
  const nomeAluno = target.nome?.trim();
  const cpfAluno = target.cpf?.trim();
  const matriculaAluno = target.matricula?.trim();

  if (!nomeAluno && !cpfAluno && !matriculaAluno) {
    throw new Error(
      '[excluirAluno] Identificador do aluno não informado. Forneça ao menos o nome, CPF ou matrícula.'
    );
  }

  // --------------------------------------------------------------------------
  // 2. Navegação até a Listagem de Alunos (Aluno > Cadastro)
  // --------------------------------------------------------------------------
  await navegarParaConsultaAlunos(page);

  // --------------------------------------------------------------------------
  // 3. Pesquisa do Aluno na Grid de Consulta
  // --------------------------------------------------------------------------
  // 3.1 Garantir que o filtro de situação da matrícula inclua todos os alunos ('0' - Todos)
  const selectSituacao = page.locator('#Matricula');
  if (await selectSituacao.isVisible({ timeout: 2000 }).catch(() => false)) {
    await selectSituacao.selectOption('0');
  }

  // 3.2 Configurar o campo de pesquisa e preencher o termo (prioriza Nome > Matrícula > CPF)
  const selectCampoFiltro = page.locator('#CampoFiltroTermoDePesquisa');
  const inputSearchTerm = page.locator('#searchTerm');
  await inputSearchTerm.waitFor({ state: 'visible', timeout: 10000 });

  if (nomeAluno) {
    if (await selectCampoFiltro.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectCampoFiltro.selectOption('0'); // 0: Nome
    }
    await inputSearchTerm.fill(nomeAluno);
  } else if (matriculaAluno) {
    if (await selectCampoFiltro.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectCampoFiltro.selectOption('4'); // 4: Número da matrícula
    }
    await inputSearchTerm.fill(matriculaAluno);
  } else if (cpfAluno) {
    if (await selectCampoFiltro.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectCampoFiltro.selectOption('2'); // 2: CPF
    }
    await inputSearchTerm.fill(cpfAluno);
  }

  // 3.3 Disparar a pesquisa
  const btnSearch = page.locator('#btnSubmitSearch, button:has(i.fa-search)').first();
  await btnSearch.click();
  await waitForSgeLoaders(page);

  // --------------------------------------------------------------------------
  // 4. Localização e Validação Estrita de Identidade na Grid
  // --------------------------------------------------------------------------
  const gridContainer = page.locator('#grid');
  await gridContainer.waitFor({ state: 'visible', timeout: 15000 });

  // Obter apenas as linhas de dados reais de alunos
  const candidateRows = page.locator('#grid table tbody tr').filter({
    has: page.locator('.colunaAlunoNome'),
  });

  let matchedRows = candidateRows;

  // Filtrar pelo identificador mais preciso disponível (Matrícula > CPF > Nome)
  if (matriculaAluno) {
    matchedRows = matchedRows.filter({
      has: page.locator('td:nth-child(2)').filter({
        hasText: new RegExp(`^\\s*${escapeRegex(matriculaAluno)}\\s*$`, 'i'),
      }),
    });
  } else if (cpfAluno) {
    const cpfFormatado = cpfAluno.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    matchedRows = matchedRows.filter({
      has: page.locator('.colunaAlunoCPF').filter({
        hasText: new RegExp(escapeRegex(cpfFormatado), 'i'),
      }),
    });
  } else if (nomeAluno) {
    matchedRows = matchedRows.filter({
      has: page.locator('.colunaAlunoNome').filter({
        hasText: new RegExp(escapeRegex(nomeAluno.trim()), 'i'),
      }),
    });
  }

  const matchCount = await matchedRows.count();

  // 4.1 Validação de Inexistência ou Ambiguidade
  if (matchCount === 0) {
    throw new Error(
      `[excluirAluno] Aluno não encontrado na listagem para os dados informados: nome="${nomeAluno}", cpf="${cpfAluno}", matricula="${matriculaAluno}".`
    );
  }

  if (matchCount > 1) {
    throw new Error(
      `[excluirAluno] Ambiguidade na identificação: ${matchCount} registros encontrados para os dados informados. Especifique CPF ou matrícula para identificação unívoca.`
    );
  }

  const targetRow = matchedRows.first();

  // Extrair atributos observáveis da linha única selecionada
  const nomeDetectado = (await targetRow.locator('.colunaAlunoNome').innerText().catch(() => '')).trim();
  const rowCpf = (await targetRow.locator('.colunaAlunoCPF').innerText().catch(() => '')).trim();
  const matriculaDetectada = (await targetRow.locator('td:nth-child(2)').innerText().catch(() => '')).trim() || matriculaAluno;
  const alunoIdDetectado = (await targetRow.locator('.alunoid').innerText().catch(() => '')).trim() || ('id' in target ? target.id : undefined);
  const cpfDetectado = rowCpf || cpfAluno;

  // Validação de correspondência do nome caso tenha sido informado junto da matrícula/CPF
  if (nomeAluno) {
    const nomeEsperadoNorm = normalizarTexto(nomeAluno);
    const nomeLinhaNorm = normalizarTexto(nomeDetectado);
    if (
      nomeLinhaNorm !== nomeEsperadoNorm &&
      !nomeLinhaNorm.startsWith(nomeEsperadoNorm) &&
      !nomeEsperadoNorm.startsWith(nomeLinhaNorm)
    ) {
      throw new Error(
        `[excluirAluno] Inconsistência de dados: o registro localizado ("${nomeDetectado}") não confere com o nome esperado ("${nomeAluno}").`
      );
    }
  }

  // --------------------------------------------------------------------------
  // 5. Acesso à Tela de Edição do Aluno
  // --------------------------------------------------------------------------
  const linkAlunoNome = targetRow.locator('.colunaAlunoNome');
  await linkAlunoNome.click();

  // 5.1 Aguardar formulário de edição e botão Excluir
  const btnExcluirForm = page.locator('#btn_excluir');
  await btnExcluirForm.waitFor({ state: 'visible', timeout: 30000 });
  await waitForSgeLoaders(page);

  // 5.2 Validação de Segurança Pré-Exclusão: Confirmar que a tela aberta pertence ao aluno correto
  const inputNomeForm = page.locator('#PessoaNome, #Pessoa_Nome').first();
  if (await inputNomeForm.isVisible({ timeout: 3000 }).catch(() => false)) {
    const nomeNaTela = (await inputNomeForm.inputValue().catch(() => '')) || (await inputNomeForm.textContent().catch(() => '')) || '';
    if (nomeAluno) {
      const nomeNaTelaNorm = normalizarTexto(nomeNaTela);
      const nomeAlunoNorm = normalizarTexto(nomeAluno);
      if (!nomeNaTelaNorm.includes(nomeAlunoNorm) && !nomeAlunoNorm.includes(nomeNaTelaNorm)) {
        throw new Error(
          `[excluirAluno] Inconsistência de segurança: o aluno aberto para edição ("${nomeNaTela.trim()}") não corresponde ao aluno selecionado ("${nomeAluno}"). Operação abortada.`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Acionamento do Botão "Excluir" no Formulário de Edição
  // --------------------------------------------------------------------------
  // O botão aparece antes de o Id do aluno ser carregado no formulário; clicar cedo gera "O Id do aluno não foi informado".
  const campoId = page.locator('input#Id, input[name="Id"], #AlunoId').first();
  await expect.poll(
    async () => (await campoId.inputValue().catch(() => '')) || '',
    { message: '[excluirAluno] O formulário de edição não carregou o Id do aluno.', timeout: 20000 },
  ).toMatch(/^[1-9]\d*$/);
  await btnExcluirForm.click();

  // --------------------------------------------------------------------------
  // 7. Validação e Seleção dos Dados na Tela de Confirmação (/Aluno/ConsultaDadosExclusao/)
  // --------------------------------------------------------------------------
  const containerExclusao = page.locator('.exclusao-aluno, .tree, #Pessoa_Nome, h4:has-text("Excluir Aluno")').first();
  const alertaExclusao = page.locator('.swal2-popup:visible').filter({ hasText: /Aten|Erro/i }).first();
  await expect.poll(
    async () => (await containerExclusao.isVisible().catch(() => false)) || (await alertaExclusao.isVisible().catch(() => false)),
    { message: '[excluirAluno] A tela de confirmação de exclusão não abriu.', timeout: 25000 },
  ).toBe(true);
  if (await alertaExclusao.isVisible().catch(() => false)) {
    const mensagem = (await alertaExclusao.innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`[excluirAluno] O SGE recusou abrir a exclusão de "${nomeAluno ?? matriculaAluno}": ${mensagem}`);
  }
  await waitForSgeLoaders(page);

  // 7.1 Validação de Segurança dos Dados Exibidos
  const inputNomeExclusao = page.locator('#Pessoa_Nome');
  if (await inputNomeExclusao.isVisible({ timeout: 2000 }).catch(() => false)) {
    const nomeExclusao = await inputNomeExclusao.inputValue();
    if (nomeAluno && !nomeExclusao.toUpperCase().includes(nomeAluno.toUpperCase())) {
      throw new Error(
        `[excluirAluno] Inconsistência de segurança na tela de confirmação de exclusão: nome esperado "${nomeAluno}", exibido "${nomeExclusao}". Operação abortada.`
      );
    }
  }

  // 7.2 Seleção do Checkbox do Aluno (.exclusao-aluno)
  const checkboxAluno = page.locator('input.exclusao-aluno').first();
  await checkboxAluno.waitFor({ state: 'attached', timeout: 10000 });

  if (!(await checkboxAluno.isChecked())) {
    // Clicar no label correspondente para disparar os gatilhos visuais e de árvore
    const labelCheckbox = page.locator('label:has(input.exclusao-aluno)').first();
    if (await labelCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await labelCheckbox.click();
    } else {
      await checkboxAluno.check({ force: true });
    }
  }

  // Garantir que o checkbox está marcado
  await expect(checkboxAluno).toBeChecked({ timeout: 5000 });

  // --------------------------------------------------------------------------
  // 8. Acionamento do Botão "Excluir" na Tela de Dados de Exclusão
  // --------------------------------------------------------------------------
  const btnExcluirConfirmacao = page.locator('#btn_excluir');
  await btnExcluirConfirmacao.waitFor({ state: 'visible', timeout: 10000 });
  await btnExcluirConfirmacao.click();

  // --------------------------------------------------------------------------
  // 9. Detecção e Confirmação do Modal (SmartMessageBox / "Tem certeza que deseja excluir?")
  // --------------------------------------------------------------------------
  const modalMessageBox = page.locator('#MsgBoxBack, .divMessageBox, .MessageBoxContainer').first();
  await modalMessageBox.waitFor({ state: 'visible', timeout: 10000 });

  // Localizar o botão "Sim" dentro do modal de confirmação
  const btnSim = page
    .locator('#MsgBoxBack button:has-text("Sim"), .MessageBoxButtonSection button:has-text("Sim"), button.botTempo:has-text("Sim"), #bot2-Msg1')
    .first();
  await btnSim.waitFor({ state: 'visible', timeout: 10000 });
  await btnSim.click();

  // 9.1 Aguardar fechamento completo do modal de confirmação
  await page.locator('#MsgBoxBack').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  await waitForSgeLoaders(page, 20000);

  // --------------------------------------------------------------------------
  // 10. Validação Visual do Resultado e Confirmação de Sucesso
  // --------------------------------------------------------------------------
  // 10.1 Verificar se houve mensagem de erro retornada pelo sistema
  const alertaErro = page.locator('.SmallBox.bg-color-red, .SmallBox:has-text("Erro"), .alert-danger:visible, .swal2-error:visible').first();
  if (await alertaErro.isVisible({ timeout: 1500 }).catch(() => false)) {
    const msgErro = (await alertaErro.textContent())?.trim();
    throw new Error(`[excluirAluno] O SGE retornou erro durante a exclusão: ${msgErro}`);
  }

  // 10.2 Aguardar retorno para a tela de Consulta de Alunos (/alunoindex)
  await page.locator('#searchTerm, #grid, h4:has-text("Consulta de Alunos")').first().waitFor({
    state: 'visible',
    timeout: 20000,
  });
  await waitForSgeLoaders(page);

  // 10.3 Validação de Ausência: Pesquisar novamente e confirmar remoção da listagem
  if (nomeAluno || matriculaAluno || cpfAluno) {
    const termoBusca = nomeAluno || matriculaAluno || cpfAluno || '';
    const inputBuscaPos = page.locator('#searchTerm');
    await inputBuscaPos.fill(termoBusca);
    await page.locator('#btnSubmitSearch, button:has(i.fa-search)').first().click();
    await waitForSgeLoaders(page);

    // Verificar se ainda resta algum registro correspondente ao aluno excluído
    const remainingMatchingRows = page
      .locator('#grid table tbody tr')
      .filter({ has: page.locator('.colunaAlunoNome') })
      .filter({ hasText: nomeAluno || matriculaAluno || '' });

    const remainingCount = await remainingMatchingRows.count();
    if (remainingCount > 0) {
      throw new Error(
        `[excluirAluno] Falha na validação de exclusão: o aluno "${nomeAluno}" ainda foi localizado na listagem após a confirmação.`
      );
    }
  }

  return {
    id: alunoIdDetectado,
    nome: target.nome || nomeDetectado,
    cpf: target.cpf || cpfDetectado,
    matricula: target.matricula || matriculaDetectada,
    url: page.url(),
  };
}
