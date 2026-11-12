import {expect, type Page} from '@playwright/test';
import {buildCusto, type CustoMontado, type CustoOpcoes} from '../factories/centro-custos.factory';
import {datepicker} from '../helpers/datepicker.helper';
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

/** Cria um Lançamento de Custo (não recorrente) pela UI e prova a persistência no cadastro reaberto e na grade. */
export async function criarCusto(page: Page, opcoes: CustoOpcoes = {}, sequencia = 1, aoCriar?: (custo: CustoMontado) => void): Promise<CustoMontado> {
  buildCusto(opcoes, sequencia); // valida os dados antes de navegar
  // O SGE aceita descrições repetidas: a primeira sequência livre identifica o registro desta execução.
  const livre = await proximaSequenciaLivreCentroCustos(page, 'custo', s => buildCusto(opcoes, s).descricao, sequencia);
  const d = buildCusto(opcoes, livre);
  const m = page.locator('#main');

  await abrirInclusaoCentroCustos(page, 'custo');
  await m.locator('#Descricao').fill(d.descricao);
  await selecionarSelect2CentroCustos(page, 'StatusCusto', d.situacao);
  await selecionarSelect2CentroCustos(page, 'DestinatarioValue', d.destinatario);
  await selecionarSelect2CentroCustos(page, 'CategoriaGeralId', d.categoria);
  if (d.subcategoria) await selecionarSelect2CentroCustos(page, 'SubCategoriaGeralId', d.subcategoria);
  await selecionarSelect2CentroCustos(page, 'TipoCusto', d.tipoCusto);
  if (d.orcamento) await selecionarSelect2CentroCustos(page, 'OrcamentoId', d.orcamento);
  await preencherValorCentroCustos(page, 'Valor', d.valor);
  await datepicker.fill(page, '#DataLancamento', d.dataLancamento);
  await selecionarCompetenciaCentroCustos(page, 'CompetenciaValue', d.competencia);

  await salvarCadastroCentroCustos(page, 'custo', 'O custo foi adicionado.');
  aoCriar?.(d);
  await expect(m.locator('#Descricao')).toHaveValue(d.descricao);
  await expect(m.locator('#Valor')).toHaveValue(d.valor);
  await expect(m.locator('#DataLancamento')).toHaveValue(d.dataLancamento);
  await expect(m.locator('#CompetenciaValue')).toHaveValue(d.competencia);
  await expect(page.locator('#s2id_DestinatarioValue .select2-chosen')).toHaveText(new RegExp(`^\\s*${escaparRegex(d.destinatario)}`));

  await voltarParaConsultaCentroCustos(page, 'custo');
  await pesquisarCentroCustos(page, 'custo', d.descricao);
  const linha = linhasCentroCustos(page, 'custo', d.descricao);
  await expect(linha).toHaveCount(1);
  const celula = (n: number) => linha.locator(`td:nth-child(${n})`);
  await expect(celula(2)).toHaveText(new RegExp(`^\\s*${escaparRegex(d.destinatario)}(\\s+-\\s+\\d+)?\\s*$`));
  await expect(celula(4)).toHaveText(textoExato(`R$ ${d.valor}`));
  await expect(celula(5)).toHaveText(textoExato(d.tipoCusto));
  await expect(celula(6)).toHaveText(textoExato(d.categoria));
  await expect(celula(8)).toHaveText(textoExato(d.competencia));
  await expect(celula(10)).toHaveText(textoExato(d.situacao));
  await expect(celula(11)).toHaveText(textoExato(d.dataLancamento));
  console.log(`[QAAUTO] Lançamento de Custo criado e conferido: ${d.descricao}`);
  return d;
}
