import { expect, type Page } from '@playwright/test';
import {
  buildCalendarioEscolar,
  type CalendarioAnoComposicaoOpcoes,
  type CalendarioComposicaoOpcoes,
  type CalendarioEscolarOpcoes,
} from '../factories/calendario-escolar.factory';
import { datepicker } from '../helpers/datepicker.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirAbaComposicaoEnsino,
  consultaCalendarioEscolar,
  linhaCalendarioEscolar,
  linhasComposicaoCalendario,
  pesquisarCalendarioEscolar,
} from '../helpers/navigation/calendario-escolar.navigation';

async function textosDeOpcao(page: Page, seletor: string): Promise<string[]> {
  return page
    .locator(`${seletor} option`)
    .evaluateAll((opcoes) =>
      opcoes
        .map((opcao) => ((opcao as HTMLOptionElement).text || '').trim())
        .filter(Boolean),
    );
}

/**
 * Vincula uma Composição de Ensino ao calendário em edição.
 * O salvamento abre a Configuração de Composição e o Voltar retorna ao calendário.
 */
async function adicionarComposicaoEnsino(
  page: Page,
  calendarioId: string,
  dados: CalendarioComposicaoOpcoes,
): Promise<void> {
  const m = page.locator('#main');
  await abrirAbaComposicaoEnsino(page);
  await getByRoleSge(m.locator('#s1'), 'button', { name: /Adicionar/ }).click();
  await expect(m.locator('#ComposicaoEnsinoId')).toBeVisible();

  const composicoes = await textosDeOpcao(page, '#ComposicaoEnsinoId');
  if (composicoes.length === 0)
    throw new Error(
      'Nenhuma Composição de Ensino cadastrada. Execute criar_composicao_ensino_action antes de criar o calendário.',
    );
  if (!composicoes.includes(dados.composicao))
    throw new Error(
      `A Composição de Ensino "${dados.composicao}" não está disponível. Opções: ${composicoes.join(' | ')}.`,
    );

  await m.locator('#ComposicaoEnsinoId').selectOption({ label: dados.composicao });
  await m.locator('#TipoAtendimento').selectOption({ label: dados.tipoAtendimento });
  await m.locator('#Periodicidade').selectOption({ label: dados.periodicidade });
  await m.locator('#MateriaEscolar').selectOption({ label: dados.materiaEscolar });
  await m.locator('#OrigemCargaHoraria').selectOption({ label: dados.origemCargaHoraria });

  const formulas = await textosDeOpcao(page, '#FormulaAprovacaoId');
  if (formulas.length === 0)
    throw new Error(
      'Nenhuma Fórmula de Aprovação disponível para o ano letivo. Cadastre uma em Ensino > Fórmula de Aprovação antes de configurar a Composição de Ensino.',
    );
  const formula = dados.formulaAprovacao?.trim() || formulas[0];
  if (!formulas.includes(formula))
    throw new Error(
      `A Fórmula de Aprovação "${formula}" não está disponível. Opções: ${formulas.join(' | ')}.`,
    );
  await m.locator('#s2id_FormulaAprovacaoId > .select2-choice').click();
  const opcaoFormula = page
    .locator('#select2-drop:visible li.select2-result-selectable')
    .filter({ hasText: new RegExp(`^\\s*${formula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) });
  await expect(opcaoFormula).toBeVisible();
  await opcaoFormula.click();
  await expect(m.locator('#FormulaAprovacaoId')).toHaveValue(/.+/);

  const [r] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase() === '/composicaocalendario/posteditar' &&
        r.request().method() === 'POST',
      { timeout: 30000 },
    ),
    getByRoleSge(m, 'button', { name: /Salvar/ }).click(),
  ]);
  if (!r.ok())
    throw new Error(`A configuração da Composição de Ensino retornou HTTP ${r.status()}.`);
  await expect(
    m.locator('h4').filter({ hasText: 'Editar Configuração de Composição De Ensino' }),
  ).toBeVisible({ timeout: 30000 });
  const recusa = m.locator('.alert-danger:visible, .validation-summary-errors:visible');
  if (await recusa.count())
    throw new Error(
      `O SGE recusou a composição "${dados.composicao}": ${(await recusa.first().innerText()).replace(/\s+/g, ' ').trim()}`,
    );
  await expect(m.locator('#Id')).not.toHaveValue('0');

  const [volta] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase() === `/calendarioescolar/editar/${calendarioId}` &&
        r.request().method() === 'GET',
      { timeout: 30000 },
    ),
    m.locator(`a.btn[onclick*="/calendarioescolar/editar/${calendarioId}"]`).click(),
  ]);
  if (!volta.ok()) throw new Error(`O retorno ao calendário retornou HTTP ${volta.status()}.`);
  await expect(m.locator('h4').filter({ hasText: 'Editar Calendário Escolar' })).toBeVisible();
}

async function configurarComposicoesEnsino(
  page: Page,
  calendarioId: string,
  composicoes: CalendarioComposicaoOpcoes[],
): Promise<void> {
  for (const composicao of composicoes)
    await adicionarComposicaoEnsino(page, calendarioId, composicao);
  await abrirAbaComposicaoEnsino(page);
  const linhas = linhasComposicaoCalendario(page);
  await expect(linhas).toHaveCount(composicoes.length, { timeout: 30000 });
  for (const [indice, composicao] of composicoes.entries()) {
    const texto = (await linhas.nth(indice).innerText()).replace(/\s+/g, ' ').trim();
    expect(texto).toContain(composicao.composicao);
    expect(texto).toContain(composicao.tipoAtendimento);
  }
}

async function selecionarSelect2(page: Page, id: string, texto: string, apoio: string): Promise<void> {
  const seletor = page.locator(`#s2id_${id}`);
  await expect(seletor).toBeVisible();
  await seletor.locator('.select2-choice').click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const textos = (await opcoes.allInnerTexts()).map((opcao) => opcao.trim()).filter(Boolean);
  if (!textos.includes(texto)) {
    await page.keyboard.press('Escape');
    throw new Error(
      textos.length
        ? `${apoio} "${texto}" não encontrado. Opções: ${textos.join(' | ')}.`
        : `Nenhum ${apoio} disponível; cadastre-o antes de executar.`,
    );
  }
  await opcoes.getByText(texto, { exact: true }).click();
  await expect(seletor.locator('.select2-chosen')).toHaveText(texto);
}

async function salvarConfiguracaoDaComposicao(page: Page): Promise<void> {
  const m = page.locator('#main');
  const [resposta] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).origin === new URL(page.url()).origin, {
      timeout: 30000,
    }),
    getByRoleSge(m, 'button', { name: /Salvar/ }).click(),
  ]);
  if (!resposta.ok())
    throw new Error(`Salvar a configuração do ano/componente retornou HTTP ${resposta.status()}.`);
  const sucesso = page.getByRole('dialog').filter({ hasText: 'Configuração salva com sucesso!' });
  await expect(sucesso).toBeVisible({ timeout: 30000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden();
}

async function adicionarAnoNaComposicao(
  page: Page,
  ano: CalendarioAnoComposicaoOpcoes,
): Promise<void> {
  const m = page.locator('#main');
  await m.locator('#gridSerieComposicao button').click();
  await expect(
    m.locator('h4').filter({ hasText: 'Adicionar Configuração de Ano Escolar da Composição De Ensino' }),
  ).toBeVisible({ timeout: 30000 });

  await selecionarSelect2(page, 'SerieId', ano.anoEscolar, 'ano escolar');
  await selecionarSelect2(page, 'TipoDiario', ano.tipoDiario, 'tipo do diário');
  await selecionarSelect2(page, 'FormaAvaliacao', ano.formaAvaliacao, 'forma de avaliação');
  await selecionarSelect2(page, 'SerieDestinoId', ano.anoEscolarDestino, 'ano escolar de destino');
  await selecionarSelect2(page, 'FichaAvaliativaId', ano.fichaAvaliativa, 'ficha avaliativa');
  if (ano.tipoObservacoesFichaAvaliativa) {
    const tipoObservacao = page.locator('#s2id_TipoObservacoesDaFichaAvaliativa');
    if (await tipoObservacao.isVisible())
      await selecionarSelect2(
        page,
        'TipoObservacoesDaFichaAvaliativa',
        ano.tipoObservacoesFichaAvaliativa,
        'tipo de observações da ficha avaliativa',
      );
  }
  if (ano.tipoParecerFinalFichaAvaliativa) {
    const tipoParecer = page.locator('#s2id_TipoParecerFinalFichaAvaliativa');
    if (await tipoParecer.isVisible())
      await selecionarSelect2(
        page,
        'TipoParecerFinalFichaAvaliativa',
        ano.tipoParecerFinalFichaAvaliativa,
        'tipo de parecer final da ficha avaliativa',
      );
  }
  if (ano.observacaoDiarioClasse)
    await m.locator('#ObservacaoParaDiarioDeClasse').fill(ano.observacaoDiarioClasse);

  await salvarConfiguracaoDaComposicao(page);
  await getByRoleSge(m, 'button', { name: /Voltar/ }).click();
  await expect(
    m.locator('h4').filter({ hasText: 'Editar Configuração de Composição De Ensino' }),
  ).toBeVisible({ timeout: 30000 });
}

async function adicionarComponenteCurricular(
  page: Page,
  componente: CalendarioAnoComposicaoOpcoes['componentesCurriculares'][number],
): Promise<void> {
  const m = page.locator('#main');
  const painel = m.locator('#tabEstruturaCurricular');
  const linhas = painel.locator('table tbody tr:visible');
  const existente = linhas.filter({ hasText: componente.componente });
  if ((await existente.count()) > 0) return;
  await m.locator('#btn-add-grade').click();
  const modal = page.locator('.modal:visible').filter({ hasText: 'Adicionar Grade Escolar' }).last();
  await expect(modal).toBeVisible();
  await selecionarSelect2(page, 'DisciplinaId', componente.componente, 'componente curricular');
  await modal.locator('#CargaHoraria').fill(componente.cargaHoraria);
  await modal.locator('#QuantidadeAulasSemanais').fill(componente.quantidadeAulasSemanais);
  await modal
    .locator('#QuantidadeDeAulasPresenciaisPorSemana')
    .fill(componente.quantidadeAulasPresenciais);
  await modal
    .locator('#QuantidadeDeAulasNaoPresenciaisPorSemana')
    .fill(componente.quantidadeAulasNaoPresenciais);
  await selecionarSelect2(
    page,
    'FormaAvaliacaoComponente',
    componente.formaAvaliacao,
    'forma de avaliação do componente',
  );
  const adicionar = getByRoleSge(modal, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeEnabled();
  await adicionar.click();
  const sucesso = page.getByRole('dialog').filter({ hasText: 'Grade Escolar cadastrada.' });
  await expect(sucesso).toBeVisible({ timeout: 30000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden();
  await expect(modal).toBeHidden({ timeout: 30000 });
  await expect(linhas.filter({ hasText: componente.componente })).toHaveCount(1, { timeout: 30000 });
}

async function configurarAnoEComponentesCurriculares(
  page: Page,
  calendarioId: string,
  composicao: CalendarioComposicaoOpcoes,
): Promise<void> {
  const ano = composicao.anoComposicao;
  if (!ano) return;

  const m = page.locator('#main');
  await abrirAbaComposicaoEnsino(page);
  const linhaComposicao = linhasComposicaoCalendario(page)
    .filter({ hasText: composicao.composicao })
    .filter({ hasText: composicao.tipoAtendimento });
  await expect(linhaComposicao).toHaveCount(1);
  await linhaComposicao.click();
  await expect(
    m.locator('h4').filter({ hasText: 'Editar Configuração de Composição De Ensino' }),
  ).toBeVisible({ timeout: 30000 });

  const linhasAno = m.locator('#gridSerieComposicao tbody tr:visible');
  const linhaAno = linhasAno.filter({ hasText: ano.anoEscolar });
  if ((await linhaAno.count()) === 0) await adicionarAnoNaComposicao(page, ano);

  const linhaConfigurada = m
    .locator('#gridSerieComposicao tbody tr:visible')
    .filter({ hasText: ano.anoEscolar });
  await expect(linhaConfigurada).toHaveCount(1, { timeout: 30000 });
  await linhaConfigurada.click();
  await expect(
    m.locator('h4').filter({ hasText: 'Editar Configuração de Ano Escolar da Composição De Ensino' }),
  ).toBeVisible({ timeout: 30000 });

  await getByRoleSge(m, 'link', { name: 'Estrutura Curricular', exact: true }).click();
  await expect(m.locator('#tabEstruturaCurricular')).toBeVisible();
  for (const componente of ano.componentesCurriculares)
    await adicionarComponenteCurricular(page, componente);
  const linhasGrade = m.locator('#tabEstruturaCurricular table tbody tr:visible');
  for (const componente of ano.componentesCurriculares)
    await expect(linhasGrade.filter({ hasText: componente.componente })).toHaveCount(1);

  await salvarConfiguracaoDaComposicao(page);
  await getByRoleSge(m, 'button', { name: /Voltar/ }).click();
  await expect(
    m.locator('h4').filter({ hasText: 'Editar Configuração de Composição De Ensino' }),
  ).toBeVisible({ timeout: 30000 });
  await expect(m.locator('#gridSerieComposicao tbody tr:visible').filter({ hasText: ano.anoEscolar }))
    .toHaveCount(1);
  const voltarCalendario = m.locator(`a.btn[onclick*="/calendarioescolar/editar/${calendarioId}"]`);
  await expect(voltarCalendario).toBeVisible();
  await voltarCalendario.click();
  await expect(m.locator('h4').filter({ hasText: 'Editar Calendário Escolar' })).toBeVisible({
    timeout: 30000,
  });
}

export async function criarCalendarioEscolar(
  page: Page,
  opcoes: CalendarioEscolarOpcoes,
  sequencia = 1,
  aoCriar?: (descricao: string) => void,
): Promise<string> {
  let d = buildCalendarioEscolar(opcoes, sequencia);
  const m = page.locator('#main');
  await consultaCalendarioEscolar(page);
  // Calendários de execuções anteriores ou criados manualmente podem ocupar o sufixo inicial.
  // Procura o próximo nome livre para preservar os registros existentes e evitar colisão no POST.
  let nomeDisponivel = false;
  for (let proximaSequencia = sequencia; proximaSequencia < sequencia + 100; proximaSequencia++) {
    d = buildCalendarioEscolar(opcoes, proximaSequencia);
    await pesquisarCalendarioEscolar(page, d.descricao);
    if ((await linhaCalendarioEscolar(page, d.descricao).count()) === 0) {
      nomeDisponivel = true;
      break;
    }
  }
  if (!nomeDisponivel)
    throw new Error(
      `Não foi encontrado um nome livre entre ${sequencia} e ${sequencia + 99} para o calendário.`,
    );

  const adicionar = getByRoleSge(m, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await expect(m.locator('#Descricao')).toBeVisible();
  const ano = m.locator('#AnoLetivoId');
  const anos = await ano.locator('option').allTextContents();
  if (!anos.map((x) => x.trim()).includes(d.anoLetivo))
    throw new Error(`Ano letivo ${d.anoLetivo} indisponível. Opções: ${anos.join(' | ')}.`);
  await ano.selectOption({ label: d.anoLetivo });
  await m.locator('#TipoCalendario').selectOption({ label: 'Bimestral' });
  await m.locator('#Descricao').fill(d.descricao);
  for (const [id, valor] of Object.entries(d.datas)) await datepicker.fill(page, `#${id}`, valor);
  const salvar = getByRoleSge(m, 'button', { name: /Salvar/ });
  await expect(salvar).toBeVisible();
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /^\/calendarioescolar\/editar\/\d+$/i.test(new URL(r.url()).pathname) &&
        r.request().method() === 'GET',
      { timeout: 30000 },
    ),
    salvar.click(),
  ]);
  if (!r.ok()) throw new Error(`Edição do calendário criado retornou HTTP ${r.status()}.`);
  await expect(m.locator('#Descricao')).toHaveValue(d.descricao);
  const calendarioId = new URL(r.url()).pathname.match(/\/editar\/(\d+)$/i)?.[1];
  if (!calendarioId)
    throw new Error(`Não foi possível identificar o calendário criado em ${r.url()}.`);
  aoCriar?.(d.descricao);
  await configurarComposicoesEnsino(page, calendarioId, d.composicoes);
  const composicaoComAno = d.composicoes.find((composicao) => composicao.anoComposicao);
  if (composicaoComAno)
    await configurarAnoEComponentesCurriculares(page, calendarioId, composicaoComAno);
  await pesquisarCalendarioEscolar(page, d.descricao);
  await expect(linhaCalendarioEscolar(page, d.descricao)).toHaveCount(1);
  return d.descricao;
}
