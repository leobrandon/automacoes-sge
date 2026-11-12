import {expect, type Page} from '@playwright/test';
import {buildReceita, type ReceitaMontada, type ReceitaOpcoes} from '../factories/centro-custos.factory';
import {datepicker} from '../helpers/datepicker.helper';
import {
  abrirInclusaoCentroCustos,
  escaparRegex,
  linhasCentroCustos,
  pesquisarCentroCustos,
  preencherValorCentroCustos,
  proximaSequenciaLivreCentroCustos,
  salvarCadastroCentroCustos,
  selecionarSelect2CentroCustos,
  textoExato,
  voltarParaConsultaCentroCustos,
} from '../helpers/navigation/centro-custos.navigation';

/** Cria um Lançamento de Receita pela UI e prova a persistência no cadastro reaberto e na grade. */
export async function criarReceita(page: Page, opcoes: ReceitaOpcoes = {}, sequencia = 1, aoCriar?: (receita: ReceitaMontada) => void): Promise<ReceitaMontada> {
  buildReceita(opcoes, sequencia); // valida os dados antes de navegar
  // O SGE aceita descrições repetidas: a primeira sequência livre identifica o registro desta execução.
  const livre = await proximaSequenciaLivreCentroCustos(page, 'receita', s => buildReceita(opcoes, s).descricao, sequencia);
  const d = buildReceita(opcoes, livre);
  const m = page.locator('#main');

  await abrirInclusaoCentroCustos(page, 'receita');
  await m.locator('#Descricao').fill(d.descricao);
  await datepicker.fill(page, '#DataRecebimento', d.dataRecebimento);
  await selecionarSelect2CentroCustos(page, 'DestinatarioValue', d.destino);
  if (d.programaFinanceiro) await selecionarSelect2CentroCustos(page, 'ProgramaFinanceiroId', d.programaFinanceiro);
  if (d.categoria) await selecionarSelect2CentroCustos(page, 'CategoriaGeralId', d.categoria);
  if (d.subcategoria) await selecionarSelect2CentroCustos(page, 'SubCategoriaGeralId', d.subcategoria);
  await selecionarSelect2CentroCustos(page, 'OrigemDoRecurso', d.origemRecurso);
  if (d.observacao) await m.locator('#Observacao').fill(d.observacao);
  await preencherValorCentroCustos(page, 'Valor', d.valor);

  await salvarCadastroCentroCustos(page, 'receita', 'A receita foi adicionada.');
  aoCriar?.(d);
  await expect(m.locator('#Descricao')).toHaveValue(d.descricao);
  await expect(m.locator('#Valor')).toHaveValue(d.valor);
  await expect(m.locator('#DataRecebimento')).toHaveValue(d.dataRecebimento);
  await expect(page.locator('#s2id_DestinatarioValue .select2-chosen')).toHaveText(new RegExp(`^\\s*${escaparRegex(d.destino)}`));
  await expect(page.locator('#s2id_OrigemDoRecurso .select2-chosen')).toHaveText(textoExato(d.origemRecurso));

  await voltarParaConsultaCentroCustos(page, 'receita');
  await pesquisarCentroCustos(page, 'receita', d.descricao);
  const linha = linhasCentroCustos(page, 'receita', d.descricao);
  await expect(linha).toHaveCount(1);
  const celula = (n: number) => linha.locator(`td:nth-child(${n})`);
  await expect(celula(2)).toHaveText(textoExato(d.dataRecebimento));
  await expect(celula(4)).toHaveText(new RegExp(`^\\s*${escaparRegex(d.destino)}(\\s+-\\s+\\d+)?\\s*$`));
  await expect(celula(5)).toHaveText(textoExato(`R$ ${d.valor}`));
  if (d.categoria) await expect(celula(7)).toHaveText(textoExato(d.categoria));
  console.log(`[QAAUTO] Lançamento de Receita criado e conferido: ${d.descricao}`);
  return d;
}
