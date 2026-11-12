import {expect, type Page} from '@playwright/test';
import {buildOrcamento, type OrcamentoMontado, type OrcamentoOpcoes} from '../factories/centro-custos.factory';
import {
  abrirInclusaoCentroCustos,
  escaparRegex,
  linhasCentroCustos,
  pesquisarCentroCustos,
  preencherValorCentroCustos,
  proximaSequenciaLivreCentroCustos,
  salvarCadastroCentroCustos,
  selecionarCompetenciaCentroCustos,
  selecionarSelect2CentroCustos,
  textoExato,
  voltarParaConsultaCentroCustos,
} from '../helpers/navigation/centro-custos.navigation';

/** Cria uma Previsão Orçamentária pela UI e prova a persistência no cadastro reaberto e na grade. */
export async function criarOrcamento(page: Page, opcoes: OrcamentoOpcoes = {}, sequencia = 1, aoCriar?: (orcamento: OrcamentoMontado) => void): Promise<OrcamentoMontado> {
  buildOrcamento(opcoes, sequencia); // valida os dados antes de navegar
  // O SGE aceita descrições repetidas: a primeira sequência livre identifica o registro desta execução.
  const livre = await proximaSequenciaLivreCentroCustos(page, 'orcamento', s => buildOrcamento(opcoes, s).descricao, sequencia);
  const d = buildOrcamento(opcoes, livre);
  const m = page.locator('#main');

  await abrirInclusaoCentroCustos(page, 'orcamento');
  await m.locator('#Exercicio').fill(d.exercicio);
  await expect(m.locator('#Exercicio')).toHaveValue(d.exercicio);
  if (d.codigo) await m.locator('#Codigo').fill(d.codigo);
  await m.locator('#Descricao').fill(d.descricao);
  await selecionarCompetenciaCentroCustos(page, 'CompetenciaInicialValue', d.competenciaInicial);
  await selecionarCompetenciaCentroCustos(page, 'CompetenciaFinalValue', d.competenciaFinal);
  await selecionarSelect2CentroCustos(page, 'TipoOrcamento', d.tipo);
  if (d.programaFinanceiro) await selecionarSelect2CentroCustos(page, 'ProgramaFinanceiroId', d.programaFinanceiro);
  await selecionarSelect2CentroCustos(page, 'EscolaId', d.destinatario);
  await preencherValorCentroCustos(page, 'ValorPrevisto', d.valorPrevisto);

  await salvarCadastroCentroCustos(page, 'orcamento', 'O orçamento foi adicionado.');
  aoCriar?.(d);
  await expect(m.locator('#Descricao')).toHaveValue(d.descricao);
  await expect(m.locator('#Exercicio')).toHaveValue(d.exercicio);
  await expect(m.locator('#CompetenciaInicialValue')).toHaveValue(d.competenciaInicial);
  await expect(m.locator('#CompetenciaFinalValue')).toHaveValue(d.competenciaFinal);
  await expect(m.locator('#ValorPrevisto')).toHaveValue(d.valorPrevisto);

  await voltarParaConsultaCentroCustos(page, 'orcamento');
  await pesquisarCentroCustos(page, 'orcamento', d.descricao);
  const linha = linhasCentroCustos(page, 'orcamento', d.descricao);
  await expect(linha).toHaveCount(1);
  const celula = (n: number) => linha.locator(`td:nth-child(${n})`);
  await expect(celula(2)).toHaveText(textoExato(d.codigo));
  await expect(celula(3)).toHaveText(new RegExp(`^\\s*${escaparRegex(d.destinatario)}(\\s+-\\s+\\d+)?\\s*$`));
  await expect(celula(5)).toHaveText(textoExato(d.exercicio));
  await expect(celula(6)).toHaveText(textoExato(d.tipo));
  await expect(celula(7)).toHaveText(textoExato(d.competenciaInicial));
  await expect(celula(8)).toHaveText(textoExato(d.competenciaFinal));
  // Orçamento recém-criado fica em rascunho, sem execução.
  await expect(celula(9)).toHaveText(textoExato('Rascunho'));
  await expect(celula(10)).toHaveText(textoExato(`R$ ${d.valorPrevisto}`));
  console.log(`[QAAUTO] Orçamento criado e conferido: ${d.descricao}`);
  return d;
}
