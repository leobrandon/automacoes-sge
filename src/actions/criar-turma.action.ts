import { Page, expect } from '@playwright/test';
import { Select2Helper, waitForSgeLoaders, navegarParaAdicionarTurma } from '../helpers';
import { buildTurma, TurmaEscolarizacaoData } from '../factories';

export { TurmaEscolarizacaoData };

declare const $: any;

/**
 * Interface do resultado retornado após a criação bem-sucedida de uma Turma.
 */
export interface TurmaCriada {
  /** ID numérico da turma gerado pelo SGE (ex.: "289820") */
  id?: string;
  /** Descrição / Nome da turma cadastrada */
  descricao: string;
  /** Situação em que a turma foi gravada: 'Ativo' ou 'Rascunho' */
  situacao: string;
  /** Nome da Escola / Unidade Educacional vinculada */
  escola?: string;
  /** Agrupamento / Ano (Série) vinculado */
  serie?: string;
  /** Turno vinculado */
  turno?: string;
  /** Ano Letivo vinculado */
  anoLetivo?: string;
  /** URL final da página após o salvamento */
  url: string;
}

/**
 * Fecha o modal SweetAlert "Como você deseja salvar essa turma?" clicando exclusivamente
 * no botão "X" no topo direito (.swal2-close), preservando o estado da tela sem salvar.
 */
export async function fecharModalSalvarTurma(page: Page, timeout: number = 5000): Promise<void> {
  const modalContainer = page.locator('.swal2-container:visible');
  await modalContainer.waitFor({ state: 'visible', timeout });

  const btnFecharX = modalContainer.locator('button.swal2-close, .swal2-close').first();
  await btnFecharX.waitFor({ state: 'visible', timeout });
  await btnFecharX.click();

  // Aguardar fechamento total do overlay
  await modalContainer.waitFor({ state: 'hidden', timeout });
}

/**
 * Seleciona uma opção em Select2 com fallback inteligente:
 * Se um texto específico for fornecido, tenta encontrá-lo.
 * Se omitido ou se o texto exato não for encontrado, seleciona a primeira opção disponível válida (não vazia).
 */
async function selectOptionOrFirst(
  page: Page,
  containerSelector: string,
  preferredText?: string,
  timeout: number = 10000
): Promise<string> {
  await waitForSgeLoaders(page);

  // Se o container estiver com disabled, aguarda habilitar
  const container = page.locator(containerSelector).first();
  await container.waitFor({ state: 'visible', timeout });

  // Tenta selecionar pela preferência se existir
  if (preferredText) {
    try {
      await Select2Helper.select(page, containerSelector, preferredText, { timeout: 3000 });
      await waitForSgeLoaders(page);
      const selectedText = await container.locator('.select2-chosen').innerText().catch(() => preferredText);
      return selectedText.trim();
    } catch {
      // Se não encontrou o texto preferido, faz o fallback para a primeira opção válida
    }
  }

  // Fallback: abre o dropdown e clica na primeira opção visível e não vazia
  const trigger = container.locator('a.select2-choice, .select2-choice').first();
  await trigger.click();
  await page.waitForTimeout(400);

  // Verificar se o dropdown exibiu "Nenhum resultado encontrado"
  const dropActive = page.locator('#select2-drop:visible, .select2-drop-active:visible').first();
  const noResults = dropActive.locator('.select2-no-results');
  if (await noResults.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    return '';
  }

  const firstOption = dropActive
    .locator('ul.select2-results li.select2-result-selectable .select2-result-label, .select2-result-label')
    .filter({ hasNotText: /^$/ })
    .first();

  const isOptionVisible = await firstOption.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  if (!isOptionVisible) {
    await page.keyboard.press('Escape');
    return '';
  }

  const optionText = (await firstOption.innerText()).trim();
  await firstOption.click();
  await waitForSgeLoaders(page);
  return optionText;
}

/**
 * Aguarda o carregamento assíncrono das opções de um campo em cascata e falha com mensagem clara
 * quando o tenant não tem cadastro de apoio para ele (em vez de estourar timeout mais adiante).
 */
async function exigirOpcoesCarregadas(page: Page, idSelect: string, rotulo: string): Promise<void> {
  await expect.poll(
    () => page.locator(`#${idSelect} option`).evaluateAll((opcoes) => opcoes.filter((o) => (o as HTMLOptionElement).value !== '').length),
    { message: `Nenhuma opção carregada em "${rotulo}". Verifique se o cadastro de apoio existe no tenant e se os campos anteriores foram preenchidos.`, timeout: 20000 },
  ).toBeGreaterThan(0);
  await waitForSgeLoaders(page);
}

/**
 * Action de alto nível para cadastrar uma nova Turma do tipo Escolarização no SGE 100% via interface gráfica.
 * 
 * Segue o padrão de preenchimento em cascata:
 * Escola -> Ano Letivo -> Calendário Escolar -> Composição de Ensino -> Agrupamento/Ano -> Turno -> Estrutura Curricular.
 * Lida com o modal SweetAlert de decisão "Salvar Ativo" ou "Salvar Rascunho".
 * 
 * @param page Instância do Playwright Page.
 * @param dados Opcional: dados customizados da turma. Se omitido, utiliza buildTurma() para autogerar.
 * @returns Objeto TurmaCriada com id, descricao, situacao e url.
 */
export async function criarTurmaEscolarizacao(
  page: Page,
  dados: Partial<TurmaEscolarizacaoData> = {}
): Promise<TurmaCriada> {
  // 1. Gera massa completa mesclando dados customizados com padrões da Factory
  const data: TurmaEscolarizacaoData = buildTurma(dados);

  // 2. Navegação estrita via UI até o formulário "Adicionar Turma Escolarização"
  await navegarParaAdicionarTurma(page, 'Escolarizacao');
  await waitForSgeLoaders(page);

  // 3. Diretoria Regional e Município (quando informados), necessários para habilitar a Escola em alguns tenants
  if (data.diretoriaRegional) {
    await Select2Helper.select(page, '#s2id_Escola_UnidadeSubordinadora_Id', data.diretoriaRegional);
    await waitForSgeLoaders(page);
  }
  if (data.municipio) {
    // O Município é carregado (e, com uma só opção, já vem selecionado) após a escolha da DRE.
    await expect.poll(
      () => page.locator('#Escola_Cidade2_Id option').evaluateAll((opcoes) => opcoes.filter((o) => (o as HTMLOptionElement).value !== '').length),
      { message: 'Nenhum município carregado para a Diretoria Regional informada.', timeout: 15000 },
    ).toBeGreaterThan(0);
    const municipioAtual = (await page.locator('#s2id_Escola_Cidade2_Id .select2-chosen').innerText()).trim();
    if (municipioAtual.toLowerCase() !== data.municipio.trim().toLowerCase()) {
      await Select2Helper.select(page, '#s2id_Escola_Cidade2_Id', data.municipio);
      await waitForSgeLoaders(page);
    }
  }
  if (data.diretoriaRegional || data.municipio) {
    // As escolas são carregadas após a escolha de DRE/Município; abrir o Select2 antes disso retorna 0 opções.
    await expect.poll(
      () => page.locator('#EscolaId option').evaluateAll((opcoes) => opcoes.filter((o) => (o as HTMLOptionElement).value !== '').length),
      { message: 'Nenhuma escola carregada para a Diretoria Regional/Município informados.', timeout: 15000 },
    ).toBeGreaterThan(0);
  }

  // Unidade Educacional (se informada)
  if (data.unidadeEducacional) {
    await Select2Helper.select(page, '#s2id_EscolaId', data.unidadeEducacional);
    await waitForSgeLoaders(page);
  }

  // Captura o nome da Escola selecionada no formulário
  const escolaSelecionada = (
    await page.locator('#s2id_EscolaId .select2-chosen').innerText().catch(() => '')
  )?.trim();

  // 4. Garantir disparo do evento 'change' da Escola caso a tela já tenha vindo pré-selecionada,
  // permitindo que o endpoint /Turma/GetTurnosJson popule as opções de Turno
  await page.evaluate(() => {
    const escolaEl = document.getElementById('EscolaId') as HTMLSelectElement | null;
    if (escolaEl && escolaEl.value) {
      $('#EscolaId').trigger('change');
    }
  });
  await page.waitForTimeout(600);
  await waitForSgeLoaders(page);

  // 5. Ano Letivo (obrigatório)
  const anoLetivoSelecionado = await selectOptionOrFirst(
    page,
    '#s2id_SerieComposicao_ComposicaoCalendario_CalendarioEscolar_AnoLetivoId',
    data.anoLetivo
  );

  // 6. Calendário Escolar (obrigatório em cascata)
  await exigirOpcoesCarregadas(page, 'SerieComposicao_ComposicaoCalendario_CalendarioEscolarId', 'Calendário Escolar');
  await selectOptionOrFirst(
    page,
    '#s2id_SerieComposicao_ComposicaoCalendario_CalendarioEscolarId',
    data.calendarioEscolar
  );

  // 7. Composição de Ensino (obrigatório em cascata)
  await exigirOpcoesCarregadas(page, 'SerieComposicao_ComposicaoCalendarioId', 'Composição de Ensino');
  await selectOptionOrFirst(
    page,
    '#s2id_SerieComposicao_ComposicaoCalendarioId',
    data.composicaoEnsino
  );

  // 8. Agrupamento / Ano (obrigatório em cascata)
  await exigirOpcoesCarregadas(page, 'SerieComposicaoId', 'Ano Escolar');
  const serieSelecionada = await selectOptionOrFirst(
    page,
    '#s2id_SerieComposicaoId',
    data.agrupamentoAno
  );

  // 9. Turno (obrigatório)
  const turnoSelecionado = await selectOptionOrFirst(
    page,
    '#s2id_Turno',
    data.turno
  );

  // 10. Tipo de Estrutura Curricular e Estrutura Curricular (em cascata, quando aplicável)
  if (data.tipoEstruturaCurricular) {
    const selectTipoEstrutura = page.locator('#TipoEstruturaCurricularId');
    const qtdOpcoesTipo = await selectTipoEstrutura.evaluate(
      (s: HTMLSelectElement) => Array.from(s.options).filter((o) => o.value !== '').length
    ).catch(() => 0);

    if (qtdOpcoesTipo > 0) {
      await selectOptionOrFirst(
        page,
        '#s2id_TipoEstruturaCurricularId',
        data.tipoEstruturaCurricular
      );
      await page.waitForTimeout(600);
      await waitForSgeLoaders(page);
    }
  }

  // Seleciona a Estrutura Curricular somente se o container estiver ativo e possuir opções
  const containerEstrutura = page.locator('#s2id_EstruturaCurricularId');
  const isEstruturaVisivel = await containerEstrutura.isVisible().catch(() => false);

  if (isEstruturaVisivel) {
    const isDesabilitada = await containerEstrutura.evaluate(
      (el) => el.classList.contains('select2-container-disabled') || el.hasAttribute('disabled')
    ).catch(() => true);

    const selectEstrutura = page.locator('#EstruturaCurricularId');
    const qtdOpcoesEstrutura = await selectEstrutura.evaluate(
      (s: HTMLSelectElement) => Array.from(s.options).filter((o) => o.value !== '').length
    ).catch(() => 0);

    if (!isDesabilitada && (qtdOpcoesEstrutura > 0 || data.estruturaCurricular)) {
      await selectOptionOrFirst(
        page,
        '#s2id_EstruturaCurricularId',
        data.estruturaCurricular
      );
    }
  }

  // 11. Descrição da Turma (obrigatório)
  const inputDescricao = page.locator('#Descricao').first();
  await inputDescricao.waitFor({ state: 'visible', timeout: 10000 });
  await inputDescricao.fill(data.descricao);

  // 12. Mediação Didático-Pedagógica (select nativo)
  const selectMediacao = page.locator('#TipoMediacaoDidaticoPedagogica').first();
  await selectMediacao.selectOption(data.mediacaoDidaticoPedagogica);
  await page.waitForTimeout(300);

  // 13. Local de funcionamento diferenciado da turma (obrigatório quando Presencial)
  const localDiferenciadoContainer = page.locator('#s2id_LocalDeFuncionamentoDiferenciadoDaTurma');
  const isLocalHabilitado = await localDiferenciadoContainer.isVisible().catch(() => false);
  if (isLocalHabilitado) {
    await selectOptionOrFirst(
      page,
      '#s2id_LocalDeFuncionamentoDiferenciadoDaTurma',
      data.localFuncionamentoDiferenciado
    );
  }

  // 14. Código INEP (opcional)
  if (data.codigoInep) {
    await page.locator('#Codigo').fill(data.codigoInep);
  }

  // 15. Carga Horária (garantir preenchimento caso a estrutura não preencha automaticamente)
  const inputCarga = page.locator('#CargaHoraria').first();
  const valorCargaAtual = (await inputCarga.inputValue().catch(() => ''))?.trim();
  if (!valorCargaAtual || valorCargaAtual === '0' || valorCargaAtual === '-') {
    await inputCarga.fill(data.cargaHoraria || '800');
  }

  // 16. Submissão: Clicar no botão Salvar
  const btnSalvar = page.locator('button:has-text("Salvar")').first();
  await btnSalvar.waitFor({ state: 'visible', timeout: 10000 });
  await btnSalvar.click();

  // 17. Interceptar Modal SweetAlert: "Como você deseja salvar essa turma?"
  // Contém opções "Salvar Ativo", "Salvar Rascunho" e botão fechar "×"
  const modalSalvar = page.locator('.swal2-container:visible');
  await modalSalvar.waitFor({ state: 'visible', timeout: 10000 });

  const situacao = data.situacaoDesejada ?? 'Ativo';
  if (situacao === 'Rascunho') {
    const btnRascunho = modalSalvar.locator('.swal2-deny:has-text("Salvar Rascunho")').first();
    await btnRascunho.click();
  } else {
    const btnAtivo = modalSalvar.locator('.swal2-confirm:has-text("Salvar Ativo")').first();
    await btnAtivo.click();
  }

  // 18. Tratar modal SweetAlert de retorno (Sucesso ou Atenção)
  const modalRetorno = page.locator('.swal2-container:visible');
  try {
    // Aguarda a finalização do processamento ("Aguarde...") e exibição do botão de confirmação "Ok"
    const btnConfirmOk = modalRetorno.locator('button.swal2-confirm').first();
    await btnConfirmOk.waitFor({ state: 'visible', timeout: 25000 });

    // Verifica se o modal retornou erro ou atenção
    const isAlertaErro = (await modalRetorno.locator('.swal2-error:visible, .swal2-warning:visible, .swal2-title:has-text("Atenção")').count()) > 0;
    if (isAlertaErro) {
      const msgErro = await modalRetorno.locator('.swal2-content, .swal2-html-container').first().innerText().catch(() => 'Erro desconhecido');
      throw new Error(`[criarTurmaEscolarizacao] Falha ao salvar turma no SGE: ${msgErro}`);
    }

    // Se for modal de sucesso ("Sucesso! Turma salva."), clica no botão "Ok" para liberar a interface
    await btnConfirmOk.click();
    await modalRetorno.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('[criarTurmaEscolarizacao]')) {
      throw err;
    }
  }

  await page.waitForTimeout(1000);
  await waitForSgeLoaders(page, 20000);

  // 19. Extrair ID numérico da turma recém-criada
  let idGerado = await page.evaluate(() => {
    return ($('#TurmaId').val() as string) || ($('#Id').val() as string) || '';
  });

  if (!idGerado || idGerado === '0') {
    const currentUrl = page.url();
    const match = currentUrl.match(/\/Turma\/Editar\/(\d+)/i);
    if (match && match[1]) {
      idGerado = match[1];
    }
  }

  return {
    id: idGerado || undefined,
    descricao: data.descricao,
    situacao,
    escola: escolaSelecionada || undefined,
    serie: serieSelecionada || undefined,
    turno: turnoSelecionado || undefined,
    anoLetivo: anoLetivoSelecionado || undefined,
    url: page.url()
  };
}
