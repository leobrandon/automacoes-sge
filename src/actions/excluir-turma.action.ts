import { Page, expect } from '@playwright/test';
import { waitForSgeLoaders, navegarParaConsultaTurmas } from '../helpers';
import { TurmaCriada, TurmaEscolarizacaoData } from './criar-turma.action';

/**
 * Identificadores funcionais aceitos para localizar e excluir uma Turma.
 */
export interface TurmaIdentificador {
  /** Descrição / Nome completo da turma */
  descricao?: string;
  /** Identificador numérico da turma (quando conhecido) */
  id?: string | number;
}

/**
 * Retorno produzido após a exclusão bem-sucedida de uma Turma.
 */
export interface TurmaExcluida {
  /** Identificador numérico da turma */
  id?: string;
  /** Descrição da turma excluída */
  descricao: string;
  /** URL observada na interface após a exclusão */
  url: string;
}

/**
 * Resultado da operação de exclusão em lote de Turmas.
 */
export interface LoteExclusaoTurmasResultado {
  totalExcluidas: number;
  turmasExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/**
 * Executa a busca textual na grid de Turmas sincronizando com a resposta AJAX do backend.
 */
async function executarBuscaGridTurmas(page: Page, termo: string): Promise<void> {
  const inputSearch = page.locator('input[type="search"], #searchTerm, input[placeholder*="pesquisar"]').first();
  await inputSearch.waitFor({ state: 'visible', timeout: 15000 });
  await inputSearch.fill(termo);

  const btnLupa = page.locator('button:has(i.fa-search), #btnSubmitSearch, .btn-search, button:has(.fa-search)').first();
  const temBtnLupa = await btnLupa.isVisible().catch(() => false);

  const dispararBusca = async () => {
    if (temBtnLupa) {
      await btnLupa.click();
    } else {
      await inputSearch.press('Enter');
    }
  };

  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().toLowerCase().includes('turma/indexgrid') && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => {}),
    dispararBusca(),
  ]);

  await waitForSgeLoaders(page);
}

/**
 * Action de negócio reutilizável: Exclusão de Turma no SGE via interface gráfica (UI-only).
 *
 * Executa o fluxo operacional estrito de exclusão:
 * 1. Navega até a Consulta de Turmas (/turma);
 * 2. Pesquisa pelo termo/descrição da turma na grid;
 * 3. Valida a correspondência e clica na linha da turma para abrir a edição (/turma/editar/:id);
 * 4. Aciona o botão "Excluir" (#btn_excluir);
 * 5. Confirma o diálogo irreversível SweetAlert ("Tem certeza que deseja excluir essa turma?" -> "Sim");
 * 6. Confirma o diálogo SweetAlert de sucesso ("Turma excluída" -> "Ok");
 * 7. Valida o retorno e estabilização da grid.
 *
 * @param page Instância do Playwright Page (autenticada no SGE).
 * @param target Identificador ou dados da turma a ser excluída.
 * @returns Informações da turma excluída.
 */
export async function excluirTurma(
  page: Page,
  target: TurmaIdentificador | TurmaEscolarizacaoData | TurmaCriada | string
): Promise<TurmaExcluida> {
  const descricaoTurma = typeof target === 'string'
    ? target.trim()
    : ('descricao' in target && target.descricao ? target.descricao.trim() : undefined);

  const idTurma = typeof target !== 'string' && 'id' in target && target.id
    ? String(target.id).trim()
    : undefined;

  if (!descricaoTurma && !idTurma) {
    throw new Error(
      '[excluirTurma] Identificador da turma não informado. Forneça ao menos a descrição ou ID.'
    );
  }

  const termoBusca = descricaoTurma || idTurma!;

  // 1. Navega até a consulta de turmas
  await navegarParaConsultaTurmas(page);

  // 2. Executa a busca na grid sincronizada com a rede
  await executarBuscaGridTurmas(page, termoBusca);

  // 3. Localiza a linha correspondente na grid aguardando ativamente sua visibilidade
  const candidateRows = page.locator('table tbody tr.onclickClassGrid, table tr.onclickClassGrid').filter({
    hasText: termoBusca,
  });

  try {
    await candidateRows.first().waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    throw new Error(
      `[excluirTurma] Turma não encontrada na listagem para o termo: "${termoBusca}".`
    );
  }

  const targetRow = candidateRows.first();
  const descLinha = (await targetRow.locator('td:first-child, td:visible').first().innerText().catch(() => '')) || termoBusca;
  const urlEditar = (await targetRow.locator('input[name="url"]').getAttribute('value').catch(() => '')) || '';
  const idDetectado = idTurma || urlEditar.split('/').pop() || undefined;

  // 4. Acessa o formulário de edição clicando na descrição visível
  await targetRow.locator('td:visible').first().click();

  // 5. Aguarda botão Excluir
  const btnExcluir = page.locator('#btn_excluir');
  await btnExcluir.waitFor({ state: 'visible', timeout: 20000 });
  await waitForSgeLoaders(page);

  // 6. Clica em Excluir
  await btnExcluir.click();

  // 7. Confirma o diálogo irreversível SweetAlert ("Sim")
  const modalConfirmacao = page.locator('.swal2-popup:visible, [role="dialog"]:visible').filter({ hasText: /deseja excluir essa turma/i }).first();
  await modalConfirmacao.waitFor({ state: 'visible', timeout: 10000 });
  const btnSim = modalConfirmacao.locator('.swal2-confirm:has-text("Sim"), button:has-text("Sim")').first();
  await btnSim.click();

  // 8. Trata o diálogo de retorno (Sucesso ou Bloqueio)
  const modalFeedback = page.locator('.swal2-popup:visible, [role="dialog"]:visible').first();
  await modalFeedback.waitFor({ state: 'visible', timeout: 20000 });

  const isError = (await modalFeedback.locator('.swal2-error:visible, .swal2-warning:visible').count()) > 0;
  const titulo = (await modalFeedback.locator('#swal2-title, .swal2-title').textContent().catch(() => '')) || '';
  const texto = (await modalFeedback.locator('#swal2-content, .swal2-content, .swal2-html-container').textContent().catch(() => '')) || '';

  if (isError || titulo.toLowerCase().includes('erro') || titulo.toLowerCase().includes('atenção') || texto.toLowerCase().includes('não é possível')) {
    const btnOkErro = modalFeedback.locator('.swal2-confirm, button:has-text("Ok")').first();
    if (await btnOkErro.isVisible().catch(() => false)) {
      await btnOkErro.click();
    }
    throw new Error(`[excluirTurma] Não foi possível excluir a turma "${descLinha}": ${titulo} - ${texto}`.trim());
  }

  // Confirmação de Sucesso
  const btnOkSucesso = modalFeedback.locator('.swal2-confirm:has-text("Ok"), button:has-text("Ok")').first();
  await btnOkSucesso.click();
  await page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await waitForSgeLoaders(page);

  // 9. Aguarda retorno para a tela de Consulta de Turmas
  await page.locator('input[type="search"], #searchTerm, h4:has-text("Consulta de Turmas")').first().waitFor({ state: 'visible', timeout: 20000 });

  return {
    id: idDetectado,
    descricao: descLinha,
    url: page.url(),
  };
}

/**
 * Remove em lote todas as turmas cadastradas cujo nome contenha o termo especificado (ex: "QAAUTO").
 *
 * Projetado para limpeza contínua e segura de bases de homologação/testes.
 * Se uma turma possuir alunos enturmados que impeçam sua exclusão pelo sistema,
 * a ação registra a ocorrência e continua removendo as demais turmas residuais.
 *
 * @param page Instância do Playwright Page.
 * @param termo Termo de pesquisa para filtragem (padrão: 'QAAUTO').
 * @param maxExclusoes Limite de segurança de exclusões por execução (padrão: 50).
 * @returns Relatório consolidado da operação com lista de turmas excluídas e falhas.
 */
export async function excluirTurmasEmLote(
  page: Page,
  termo: string = 'QAAUTO',
  maxExclusoes: number = 50
): Promise<LoteExclusaoTurmasResultado> {
  const turmasExcluidas: string[] = [];
  const falhas: Array<{ descricao: string; motivo: string }> = [];

  await navegarParaConsultaTurmas(page);
  await executarBuscaGridTurmas(page, termo);

  let iteracao = 0;

  while (iteracao < maxExclusoes) {
    // Sincroniza com a grid aguardando ou uma linha de dados ou o estado vazio do DataTables
    const rowOrEmpty = page.locator('table tbody tr.onclickClassGrid, table tbody td.dataTables_empty, table tbody tr:has-text("Nenhum")').first();
    await rowOrEmpty.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const candidateRows = page.locator('table tbody tr.onclickClassGrid, table tr.onclickClassGrid').filter({
      hasText: termo,
    });

    const totalRestante = await candidateRows.count();
    if (totalRestante === 0) {
      break;
    }

    // Se todas as linhas restantes já estiverem registradas como falhas/bloqueadas, interrompe
    let targetRow = candidateRows.first();
    let descricaoDetectada = (await targetRow.locator('td:first-child, td:visible').first().innerText().catch(() => '')) || `Turma #${iteracao + 1}`;

    // Procura a primeira linha que ainda NÃO falhou
    let encontrouPendente = false;
    for (let r = 0; r < totalRestante; r++) {
      const rowAtual = candidateRows.nth(r);
      const descAtual = (await rowAtual.locator('td:first-child, td:visible').first().innerText().catch(() => '')) || '';
      if (!falhas.some(f => f.descricao === descAtual)) {
        targetRow = rowAtual;
        descricaoDetectada = descAtual;
        encontrouPendente = true;
        break;
      }
    }

    if (!encontrouPendente) {
      console.log(`ℹ️ Todas as ${totalRestante} turmas restantes com "${termo}" possuem impedimento para exclusão.`);
      break;
    }

    iteracao++;
    const urlEditar = (await targetRow.locator('input[name="url"]').getAttribute('value').catch(() => '')) || '';
    const idDetectado = urlEditar.split('/').pop() || '';

    console.log(`\n🧹 [Lote ${iteracao}] Excluindo turma "${descricaoDetectada}" (ID: ${idDetectado || 'N/A'})...`);

    try {
      // 1. Acessa a edição clicando na descrição visível
      await targetRow.locator('td:visible').first().click();

      // 2. Aguarda botão Excluir e formulário de edição
      const btnExcluir = page.locator('#btn_excluir');
      await btnExcluir.waitFor({ state: 'visible', timeout: 20000 });
      await waitForSgeLoaders(page);

      // 3. Clica em Excluir
      await btnExcluir.click();

      // 4. Confirma modal de confirmação ("Sim")
      const modalConfirmacao = page.locator('.swal2-popup:visible, [role="dialog"]:visible').filter({ hasText: /deseja excluir essa turma/i }).first();
      await modalConfirmacao.waitFor({ state: 'visible', timeout: 10000 });
      const btnSim = modalConfirmacao.locator('.swal2-confirm:has-text("Sim"), button:has-text("Sim")').first();
      await btnSim.click();

      // 5. Trata modal de feedback
      const modalFeedback = page.locator('.swal2-popup:visible, [role="dialog"]:visible').first();
      await modalFeedback.waitFor({ state: 'visible', timeout: 20000 });

      const isError = (await modalFeedback.locator('.swal2-error:visible, .swal2-warning:visible').count()) > 0;
      const titulo = (await modalFeedback.locator('#swal2-title, .swal2-title').textContent().catch(() => '')) || '';
      const texto = (await modalFeedback.locator('#swal2-content, .swal2-content, .swal2-html-container').textContent().catch(() => '')) || '';

      if (isError || titulo.toLowerCase().includes('erro') || titulo.toLowerCase().includes('atenção') || texto.toLowerCase().includes('não é possível')) {
        const btnOkErro = modalFeedback.locator('.swal2-confirm, button:has-text("Ok")').first();
        if (await btnOkErro.isVisible().catch(() => false)) {
          await btnOkErro.click();
        }
        await page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
        console.warn(`⚠️ [Lote ${iteracao}] Impedimento para excluir "${descricaoDetectada}": ${titulo} - ${texto}`);
        falhas.push({ descricao: descricaoDetectada, motivo: `${titulo} - ${texto}`.trim() });

        // Clica em "Voltar" para retornar à consulta
        const btnVoltar = page.locator('a:has-text("Voltar"), button:has-text("Voltar")').first();
        if (await btnVoltar.isVisible().catch(() => false)) {
          await btnVoltar.click();
        } else {
          await navegarParaConsultaTurmas(page);
        }
      } else {
        const btnOkSucesso = modalFeedback.locator('.swal2-confirm:has-text("Ok"), button:has-text("Ok")').first();
        await btnOkSucesso.click();
        await page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
        turmasExcluidas.push(descricaoDetectada);
        console.log(`✅ [Lote ${iteracao}] Turma "${descricaoDetectada}" excluída com sucesso!`);
      }

      await waitForSgeLoaders(page);

      // 6. Atualiza a grid para a próxima iteração
      await page.locator('input[type="search"], #searchTerm, h4:has-text("Consulta de Turmas")').first().waitFor({ state: 'visible', timeout: 20000 });
      await executarBuscaGridTurmas(page, termo);
    } catch (err: any) {
      console.warn(`⚠️ Erro ao processar exclusão da turma "${descricaoDetectada}": ${err?.message}`);
      falhas.push({ descricao: descricaoDetectada, motivo: err?.message || 'Erro inesperado' });
      await navegarParaConsultaTurmas(page);
      await executarBuscaGridTurmas(page, termo);
    }
  }

  console.log(`\n✨ Limpeza em lote de turmas finalizada! Total excluídas: ${turmasExcluidas.length} | Total bloqueadas/falhas: ${falhas.length}\n`);

  return {
    totalExcluidas: turmasExcluidas.length,
    turmasExcluidas,
    falhas,
  };
}
