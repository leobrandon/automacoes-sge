import { Page, expect } from '@playwright/test';
import { waitForSgeLoaders, navegarParaConsultaColaborador } from '../helpers';
import { ColaboradorData, ColaboradorCriado } from './criar-colaborador.action';

/**
 * Identificadores funcionais aceitos pela Action para localizar e excluir um colaborador.
 * Aceita o objeto ColaboradorData completo, o retorno ColaboradorCriado ou um objeto parcial.
 */
export interface ColaboradorIdentificador {
  /** Nome completo do colaborador */
  nome?: string;

  /** CPF do colaborador (opcional) */
  cpf?: string;

  /** Identificador numérico do colaborador quando conhecido (opcional) */
  id?: string;
}

/**
 * Retorno produzido após a exclusão bem-sucedida do colaborador no SGE.
 */
export interface ColaboradorExcluido {
  /** Identificador numérico do colaborador */
  id?: string;

  /** Nome civil completo do colaborador excluído */
  nome: string;

  /** CPF do colaborador excluído */
  cpf?: string;

  /** URL observada na interface após a exclusão */
  url: string;
}

/**
 * Normaliza texto para comparações resilientes no SGE (remove acentos e espaços extras).
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
 * Escapa caracteres especiais para uso seguro em expressões regulares.
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Action de negócio reutilizável: Exclusão de Colaborador / Servidor no SGE via interface gráfica (UI-only).
 *
 * Executa o fluxo operacional estrito de exclusão:
 * 1. Navegação via menu lateral até `Servidor > Cadastro` (/colaborador);
 * 2. Pesquisa e localização do registro na grid de servidores;
 * 3. Validação estrita de unicidade e correspondência;
 * 4. Abertura do formulário de edição do servidor correspondente via clique na grid;
 * 5. Validação de segurança dos dados exibidos na tela de edição;
 * 6. Acionamento do botão "Excluir" (#btn_excluir);
 * 7. Confirmação do modal irreversível ("Tem certeza que deseja excluir essa pessoa?" -> "Sim");
 * 8. Confirmação do modal SweetAlert de sucesso ("Colaborador excluído com sucesso!" -> "Ok");
 * 9. Validação pós-exclusão garantindo ausência do registro na grid.
 *
 * @param page Instância do Playwright Page (autenticada no SGE).
 * @param target Identificador do colaborador (ColaboradorIdentificador, ColaboradorData ou ColaboradorCriado).
 * @returns Informações do colaborador excluído.
 */
export async function excluirColaborador(
  page: Page,
  target: ColaboradorIdentificador | ColaboradorData | ColaboradorCriado
): Promise<ColaboradorExcluido> {
  // --------------------------------------------------------------------------
  // 1. Validação Prévia dos Parâmetros de Entrada
  // --------------------------------------------------------------------------
  const nomeColaborador = target.nome?.trim();
  const cpfColaborador = target.cpf?.trim();
  const idColaborador = 'id' in target && target.id ? String(target.id).trim() : undefined;

  if (!nomeColaborador && !cpfColaborador && !idColaborador) {
    throw new Error(
      '[excluirColaborador] Identificador do colaborador não informado. Forneça ao menos o nome, CPF ou ID.'
    );
  }

  // O SGE remove colchetes e caracteres especiais ao persistir o cadastro.
  // Higienizamos o nome (ex: "Nome [QA-AUTO]" vira "Nome QAAUTO") para garantir busca e filtro exatos na grid.
  const nomeLimpo = nomeColaborador
    ? nomeColaborador.replace(/[\[\]]/g, '').replace(/-/g, '').replace(/\s+/g, ' ').trim()
    : undefined;

  // --------------------------------------------------------------------------
  // 2. Navegação estrita via interface até a tela de Consulta de Servidores
  // --------------------------------------------------------------------------
  await navegarParaConsultaColaborador(page);

  // --------------------------------------------------------------------------
  // 3. Pesquisa do Colaborador na Grid
  // --------------------------------------------------------------------------
  const inputSearch = page.locator('#searchTerm');
  await inputSearch.waitFor({ state: 'visible', timeout: 15000 });

  const termoPesquisa = nomeLimpo || cpfColaborador || idColaborador || '';
  await inputSearch.fill(termoPesquisa);

  const btnSearch = page.locator('#btnSubmitSearch, button:has(i.fa-search)').first();
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().toLowerCase().includes('colaborador') && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => {}),
    btnSearch.click(),
  ]);
  await waitForSgeLoaders(page);

  // --------------------------------------------------------------------------
  // 4. Localização e Validação Estrita na Grid de Servidores
  // --------------------------------------------------------------------------
  const gridContainer = page.locator('#grid');
  await gridContainer.waitFor({ state: 'visible', timeout: 15000 });

  // Linhas reais de dados de colaboradores (possuem td.colaboradorid)
  const candidateRows = page.locator('#grid table tbody tr').filter({
    has: page.locator('td.colaboradorid'),
  });

  let matchedRows = candidateRows;

  if (cpfColaborador) {
    const cpfFormatado = cpfColaborador.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    matchedRows = matchedRows.filter({
      has: page.locator('td.documentoColaborador').filter({
        hasText: new RegExp(escapeRegex(cpfFormatado), 'i'),
      }),
    });
  } else if (nomeLimpo) {
    matchedRows = matchedRows.filter({
      hasText: new RegExp(escapeRegex(nomeLimpo), 'i'),
    });
  }

  // Auto-aguarda de forma resiliente até que a linha apareça na grid após o carregamento da busca
  const targetRow = matchedRows.first();
  try {
    await targetRow.waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    throw new Error(
      `[excluirColaborador] Colaborador não encontrado na listagem para os dados informados: termo="${termoPesquisa}", cpf="${cpfColaborador}".`
    );
  }

  const matchCount = await matchedRows.count();
  if (matchCount > 1) {
    throw new Error(
      `[excluirColaborador] Ambiguidade na identificação: ${matchCount} registros encontrados para "${termoPesquisa}". Especifique o CPF para identificar unicamente.`
    );
  }

  // Dados observáveis antes da exclusão
  const idDetectado = (await targetRow.locator('td.colaboradorid').innerText().catch(() => '')).trim();
  const nomeDetectado = (await targetRow.locator('td:nth-child(2)').innerText().catch(() => '')).trim();
  const cpfDetectado = (await targetRow.locator('td.documentoColaborador').first().innerText().catch(() => '')).trim();

  // --------------------------------------------------------------------------
  // 5. Acesso à Tela de Edição do Servidor (clique na linha)
  // --------------------------------------------------------------------------
  const cellNome = targetRow.locator('td:nth-child(2)');
  await cellNome.click();

  // Aguardar renderização da tela de edição
  const btnExcluir = page.locator('#btn_excluir');
  await btnExcluir.waitFor({ state: 'visible', timeout: 20000 });
  await waitForSgeLoaders(page);

  // 5.1 Validação de Segurança Pré-Exclusão
  const inputNomeForm = page.locator('#PessoaNome, #Pessoa_Nome').first();
  if (await inputNomeForm.isVisible({ timeout: 3000 }).catch(() => false)) {
    const nomeNaTela = (await inputNomeForm.inputValue().catch(() => '')) || '';
    if (nomeColaborador) {
      const nomeNaTelaNorm = normalizarTexto(nomeNaTela);
      const nomeEsperadoNorm = normalizarTexto(nomeColaborador);
      if (!nomeNaTelaNorm.includes(nomeEsperadoNorm) && !nomeEsperadoNorm.includes(nomeNaTelaNorm)) {
        throw new Error(
          `[excluirColaborador] Inconsistência de segurança: o servidor aberto para edição ("${nomeNaTela.trim()}") não corresponde ao registro selecionado ("${nomeColaborador}"). Operação abortada.`
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Acionamento do Botão "Excluir" (#btn_excluir)
  // --------------------------------------------------------------------------
  await btnExcluir.click();

  // --------------------------------------------------------------------------
  // 7. Confirmação do Modal de Alerta SmartMessageBox
  // --------------------------------------------------------------------------
  const modalAlerta = page.locator('#MsgBoxBack, .MessageBoxContainer').first();
  await modalAlerta.waitFor({ state: 'visible', timeout: 10000 });

  const btnSim = page
    .locator('#bot2-Msg1, #MsgBoxBack button:has-text("Sim"), .MessageBoxButtonSection button:has-text("Sim")')
    .first();
  await btnSim.waitFor({ state: 'visible', timeout: 10000 });
  await btnSim.click();

  // Aguardar fechamento do modal de confirmação
  await modalAlerta.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  await waitForSgeLoaders(page, 20000);

  // --------------------------------------------------------------------------
  // 8. Validação e Fechamento do Modal SweetAlert de Sucesso
  // --------------------------------------------------------------------------
  // 8.1 Verificar se houve mensagem de erro
  const alertaErro = page.locator('.SmallBox.bg-color-red, .alert-danger:visible, .swal2-error:visible').first();
  if (await alertaErro.isVisible({ timeout: 2000 }).catch(() => false)) {
    const msgErro = (await alertaErro.textContent())?.trim();
    throw new Error(`[excluirColaborador] O SGE retornou erro durante a exclusão: ${msgErro}`);
  }

  // 8.2 Localizar modal de sucesso ("Colaborador excluído com sucesso!")
  const modalSucesso = page.locator('.swal2-popup:visible, .sweet-alert:visible, div[role="dialog"]:visible').first();
  await page.getByText('Colaborador excluído com sucesso!').waitFor({ state: 'visible', timeout: 20000 });

  const btnOk = modalSucesso.getByRole('button', { name: /Ok/i })
    .or(page.locator('.swal2-confirm, .sweet-alert button.confirm, button:has-text("Ok")'))
    .first();

  if (await btnOk.isVisible().catch(() => false)) {
    await btnOk.click();
  }

  await waitForSgeLoaders(page);

  // --------------------------------------------------------------------------
  // 9. Validação Pós-Exclusão na Grid de Servidores
  // --------------------------------------------------------------------------
  await page.locator('#searchTerm, #grid').first().waitFor({ state: 'visible', timeout: 15000 });

  if (nomeLimpo || cpfColaborador) {
    await inputSearch.fill(termoPesquisa);
    await btnSearch.click();
    await waitForSgeLoaders(page);

    const remainingRows = page.locator('#grid table tbody tr').filter({
      has: page.locator('td.colaboradorid'),
    }).filter({
      hasText: nomeLimpo || cpfColaborador || '',
    });

    const remainingCount = await remainingRows.count();
    if (remainingCount > 0) {
      throw new Error(
        `[excluirColaborador] Falha na validação de exclusão: o colaborador "${nomeLimpo}" ainda consta na listagem após a confirmação.`
      );
    }
  }

  return {
    id: idDetectado || idColaborador,
    nome: nomeColaborador || nomeDetectado,
    cpf: cpfDetectado || cpfColaborador,
    url: page.url(),
  };
}

/**
 * Resultado retornado após a execução da limpeza de servidores em lote.
 */
export interface LoteExclusaoResultado {
  /** Quantidade total de colaboradores excluídos na execução */
  totalExcluidos: number;

  /** Lista com os nomes dos colaboradores excluídos */
  nomesExcluidos: string[];
}

/**
 * Action de negócio reutilizável: Exclusão em Lote de Colaboradores no SGE (UI-only).
 * 
 * Localiza todos os servidores na grid que correspondam ao termo informado (padrão: "QAAUTO")
 * e executa a exclusão sequencial via interface gráfica até limpar todos os registros encontrados.
 * 
 * @param page Instância do Playwright Page (autenticada no SGE).
 * @param options Opções de termo de busca (default: 'QAAUTO') e limite de segurança (default: 50).
 * @returns Resumo da quantidade e nomes dos colaboradores removidos.
 */
export async function excluirColaboradoresEmLote(
  page: Page,
  options: { termo?: string; max?: number } = {}
): Promise<LoteExclusaoResultado> {
  const termo = options.termo || 'QAAUTO';
  const max = options.max ?? 50;
  const nomesExcluidos: string[] = [];

  await navegarParaConsultaColaborador(page);

  const inputSearch = page.locator('#searchTerm');
  await inputSearch.waitFor({ state: 'visible', timeout: 15000 });
  await inputSearch.fill(termo);

  const btnSearch = page.locator('#btnSubmitSearch, button:has(i.fa-search)').first();
  await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().toLowerCase().includes('colaborador') && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => {}),
    btnSearch.click(),
  ]);
  await waitForSgeLoaders(page);

  let iteracao = 0;

  while (iteracao < max) {
    const candidateRows = page.locator('#grid table tbody tr').filter({
      has: page.locator('td.colaboradorid'),
    }).filter({
      hasText: termo,
    });

    const totalRestante = await candidateRows.count();
    if (totalRestante === 0) {
      break;
    }

    iteracao++;
    const targetRow = candidateRows.first();
    const nomeDetectado = (await targetRow.locator('td:nth-child(2)').innerText().catch(() => '')) || `Servidor #${iteracao}`;
    const idDetectado = (await targetRow.locator('td.colaboradorid').innerText().catch(() => '')).trim();

    console.log(`\n🧹 [Lote ${iteracao}] Excluindo "${nomeDetectado}" (ID: ${idDetectado || 'N/A'})...`);

    // 1. Acessa a edição clicando no nome
    await targetRow.locator('td:nth-child(2)').click();

    // 2. Aguarda botão Excluir e formulário de edição
    const btnExcluir = page.locator('#btn_excluir');
    await btnExcluir.waitFor({ state: 'visible', timeout: 20000 });
    await waitForSgeLoaders(page);

    // 3. Clica em Excluir
    await btnExcluir.click();

    // 4. Confirma o modal de alerta irreversível ("Sim")
    const modalAlerta = page.locator('#MsgBoxBack, .MessageBoxContainer').first();
    await modalAlerta.waitFor({ state: 'visible', timeout: 10000 });
    const btnSim = page.locator('#bot2-Msg1, #MsgBoxBack button:has-text("Sim")').first();
    await btnSim.waitFor({ state: 'visible', timeout: 10000 });
    await btnSim.click();

    // 5. Confirma o modal SweetAlert de sucesso ("Ok")
    await modalAlerta.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await waitForSgeLoaders(page, 20000);

    const modalSucesso = page.locator('.swal2-popup:visible, .sweet-alert:visible, div[role="dialog"]:visible').first();
    await page.getByText('Colaborador excluído com sucesso!').waitFor({ state: 'visible', timeout: 20000 });

    const btnOk = modalSucesso.getByRole('button', { name: /Ok/i })
      .or(page.locator('.swal2-confirm, .sweet-alert button.confirm, button:has-text("Ok")'))
      .first();

    if (await btnOk.isVisible().catch(() => false)) {
      await btnOk.click();
    }

    await waitForSgeLoaders(page);
    nomesExcluidos.push(nomeDetectado);

    // 6. Atualiza a grid para a próxima iteração
    await page.locator('#searchTerm, #grid').first().waitFor({ state: 'visible', timeout: 15000 });
    await inputSearch.fill(termo);
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().toLowerCase().includes('colaborador') && resp.status() === 200,
        { timeout: 10000 }
      ).catch(() => {}),
      btnSearch.click(),
    ]);
    await waitForSgeLoaders(page);
  }

  console.log(`\n✨ Limpeza em lote finalizada! Total de colaboradores excluídos: ${nomesExcluidos.length}\n`);

  return {
    totalExcluidos: nomesExcluidos.length,
    nomesExcluidos,
  };
}

