import { Page } from '@playwright/test';
import { waitForSgeLoaders, navegarParaConsultaMedidaCaseira } from '../helpers';

/**
 * Retorno produzido após a exclusão bem-sucedida de uma Medida Caseira.
 */
export interface MedidaCaseiraExcluida {
  /** Descrição da medida excluída */
  descricao: string;
  /** URL observada na interface após a exclusão */
  url: string;
}

/**
 * Resultado da operação de exclusão em lote de Medidas Caseiras.
 */
export interface LoteExclusaoMedidaCaseiraResultado {
  totalExcluidas: number;
  medidasExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/**
 * Executa a busca textual na grid de Medida Caseira sincronizando com a resposta AJAX.
 */
async function executarBuscaGridMedidaCaseira(page: Page, termo: string): Promise<void> {
  const inputSearch = page
    .locator('input[type="search"], #searchTerm, input[placeholder*="pesquisar"], input[placeholder*="Pesquisar"]')
    .first();
  await inputSearch.waitFor({ state: 'visible', timeout: 15000 });
  await inputSearch.fill(termo);

  const btnLupa = page
    .locator('button:has(i.fa-search), #btnSubmitSearch, .btn-search, button:has(.fa-search)')
    .first();
  const temBtnLupa = await btnLupa.isVisible().catch(() => false);

  const dispararBusca = async () => {
    if (temBtnLupa) {
      await btnLupa.click();
    } else {
      await inputSearch.press('Enter');
    }
  };

  await Promise.all([
    page
      .waitForResponse(
        (resp) =>
          (resp.url().toLowerCase().includes('medidacaseira') ||
            resp.url().toLowerCase().includes('indexgrid')) &&
          resp.status() === 200,
        { timeout: 10000 }
      )
      .catch(() => {}),
    dispararBusca(),
  ]);

  await waitForSgeLoaders(page);
}

/**
 * Action de negócio reutilizável: Exclusão de Medida Caseira no SGE via UI.
 *
 * Fluxo:
 * 1. Navega até Consulta de Medida Caseira;
 * 2. Pesquisa pelo termo na grid;
 * 3. Clica na linha para abrir edição;
 * 4. Aciona #btn_excluir;
 * 5. Confirma SweetAlert "Sim";
 * 6. Confirma SweetAlert "Ok";
 * 7. Valida retorno à grid.
 */
export async function excluirMedidaCaseira(
  page: Page,
  descricao: string
): Promise<MedidaCaseiraExcluida> {
  const termoBusca = descricao.trim();

  // 1. Navegar até a consulta
  await navegarParaConsultaMedidaCaseira(page);

  // 2. Buscar na grid
  await executarBuscaGridMedidaCaseira(page, termoBusca);

  // 3. Localizar a linha na grid
  const candidateRows = page
    .locator('table tbody tr')
    .filter({ has: page.locator('td').filter({ hasText: termoBusca }) });

  try {
    await candidateRows.first().waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    throw new Error(
      `[excluirMedidaCaseira] Medida Caseira não encontrada na listagem para o termo: "${termoBusca}".`
    );
  }

  const targetRow = candidateRows.first();
  const descLinha =
    (await targetRow.locator('td:first-child, td:visible').first().innerText().catch(() => '')) ||
    termoBusca;

  // 4. Acionar Exclusão (ícone de lixeira na própria linha ou botão de exclusão)
  const btnLixeira = targetRow
    .locator('a:has(i.fa-trash), a:has(.fa-trash), a[title*="Excluir"], a[title*="Remover"], button:has(i.fa-trash), .fa-trash')
    .first();
  const temLixeira = await btnLixeira.isVisible().catch(() => false);

  if (temLixeira) {
    await btnLixeira.click();
  } else {
    // Fallback: Clicar na linha para abrir formulário e buscar #btn_excluir
    await targetRow.locator('td:visible').first().click();
    const btnExcluir = page.locator('#btn_excluir, button:has-text("Excluir")').first();
    await btnExcluir.waitFor({ state: 'visible', timeout: 20000 });
    await waitForSgeLoaders(page);
    await btnExcluir.click();
  }

  // 7. Confirmar o diálogo SweetAlert ("Sim")
  const alerta = page.locator('.swal2-popup:visible, [role="dialog"]:visible').first();
  await alerta.waitFor({ state: 'visible', timeout: 10000 });
  const btnSim = alerta
    .locator('.swal2-confirm:has-text("Sim"), button:has-text("Sim")')
    .first();
  await btnSim.click();

  // 8. Tratar diálogo de retorno: aguardar botão "Ok" aparecer
  const btnOk = alerta
    .locator('.swal2-confirm:has-text("Ok"), button:has-text("Ok"), button.swal2-confirm')
    .first();
  await btnOk.waitFor({ state: 'visible', timeout: 20000 });

  const isError = (await alerta.locator('.swal2-error:visible, .swal2-warning:visible').count()) > 0;
  const textoFeedback = await alerta.innerText().catch(() => '');

  if (isError || (!/sucesso/i.test(textoFeedback) && (/erro/i.test(textoFeedback) || /não é possível/i.test(textoFeedback)))) {
    if (await btnOk.isVisible().catch(() => false)) {
      await btnOk.click();
    }
    throw new Error(
      `[excluirMedidaCaseira] Não foi possível excluir "${descLinha}": ${textoFeedback}`.trim()
    );
  }

  // Confirmação de Sucesso
  await btnOk.click();
  await alerta.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  await waitForSgeLoaders(page);

  // 9. Aguardar retorno à tela de Consulta
  await page
    .locator('input[type="search"], #searchTerm, h4:has-text("Medida Caseira")')
    .first()
    .waitFor({ state: 'visible', timeout: 20000 });

  return {
    descricao: descLinha,
    url: page.url(),
  };
}

/**
 * Remove em lote todas as medidas caseiras cujo nome contenha o termo especificado.
 *
 * Projetado para limpeza contínua e segura de bases de homologação/testes.
 *
 * @param page Instância do Playwright Page.
 * @param termo Termo de pesquisa para filtragem (padrão: 'QAAUTO').
 * @param maxExclusoes Limite de segurança de exclusões por execução (padrão: 50).
 * @returns Relatório consolidado da operação.
 */
export async function excluirMedidasCaseiraEmLote(
  page: Page,
  termo: string = 'QAAUTO',
  maxExclusoes: number = 50
): Promise<LoteExclusaoMedidaCaseiraResultado> {
  const medidasExcluidas: string[] = [];
  const falhas: Array<{ descricao: string; motivo: string }> = [];

  await navegarParaConsultaMedidaCaseira(page);
  await executarBuscaGridMedidaCaseira(page, termo);

  let iteracao = 0;

  while (iteracao < maxExclusoes) {
    // Sincroniza com a grid
    const rowOrEmpty = page
      .locator(
        'table tbody tr, table tbody td.dataTables_empty, table tbody tr:has-text("Nenhum")'
      )
      .first();
    await rowOrEmpty.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const candidateRows = page
      .locator('table tbody tr')
      .filter({ has: page.locator('td').filter({ hasText: termo }) });

    const totalRestante = await candidateRows.count();
    if (totalRestante === 0) {
      break;
    }

    // Procura a primeira linha que ainda NÃO falhou
    let encontrouPendente = false;
    let descricaoDetectada = '';
    for (let r = 0; r < totalRestante; r++) {
      const rowAtual = candidateRows.nth(r);
      const descAtual =
        (await rowAtual.locator('td:first-child, td:visible').first().innerText().catch(() => '')) ||
        '';
      if (!falhas.some((f) => f.descricao === descAtual)) {
        descricaoDetectada = descAtual.trim();
        encontrouPendente = true;
        break;
      }
    }

    if (!encontrouPendente) {
      console.log(
        `ℹ️ Todas as ${totalRestante} medidas restantes com "${termo}" possuem impedimento.`
      );
      break;
    }

    iteracao++;
    console.log(
      `\n🧹 [Lote ${iteracao}] Excluindo medida caseira "${descricaoDetectada}"...`
    );

    try {
      await excluirMedidaCaseira(page, descricaoDetectada);
      medidasExcluidas.push(descricaoDetectada);
      console.log(`✅ [Lote ${iteracao}] Medida "${descricaoDetectada}" excluída com sucesso!`);
    } catch (err: any) {
      console.warn(
        `⚠️ [Lote ${iteracao}] Impedimento para excluir "${descricaoDetectada}": ${err?.message}`
      );
      falhas.push({ descricao: descricaoDetectada, motivo: err?.message || 'Erro inesperado' });
    }

    // Atualiza a grid para a próxima iteração
    await navegarParaConsultaMedidaCaseira(page);
    await executarBuscaGridMedidaCaseira(page, termo);
  }

  console.log(
    `\n✨ Limpeza em lote finalizada! Total excluídas: ${medidasExcluidas.length} | Falhas: ${falhas.length}\n`
  );

  return {
    totalExcluidas: medidasExcluidas.length,
    medidasExcluidas,
    falhas,
  };
}
