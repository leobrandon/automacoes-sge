import { expect, type Page } from '@playwright/test';
import {
  buildFormulaAprovacao,
  type FormulaAprovacaoDados,
} from '../factories/formula-aprovacao.factory';
import {
  consultaFormulaAprovacao,
  linhaFormulaAprovacao,
  pesquisarFormulaAprovacao,
} from '../helpers/navigation/formula-aprovacao.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export async function criarFormulaAprovacao(
  page: Page,
  dados: FormulaAprovacaoDados,
  sequencia = 1,
  aoCriar?: (descricao: string) => void,
): Promise<string> {
  const d = buildFormulaAprovacao(dados, sequencia);
  const main = page.locator('#main');
  await consultaFormulaAprovacao(page);
  await getByRoleSge(main, 'button', { name: /Adicionar/ }).click();
  const modal = page.locator('#_modalFormulaAprovacao');
  await expect(modal).toBeVisible();
  await modal.locator('#Descricao').fill(d.descricao);
  await modal.locator('#FrequenciaMinima').fill(d.frequenciaMinima);
  await modal.locator('#ArredondamentoNota').selectOption({ label: d.arredondamento });
  await modal.locator('#DropDownConselhoDeClasse').selectOption({ label: d.conselhoClasse });
  await modal.locator('#DropDownLancamentos').selectOption({ label: d.lancamentos });
  await modal.locator('#FormulaDeAprovacao').fill(d.formulaAprovacao);
  await modal.locator('#FormulaDeAprovacaoConceito').fill(d.formulaConceitoFinal);
  // Qtd de casas decimais é um Select2 (o select nativo fica oculto). Deve vir ANTES da nota
  // máxima e da média: ao mudar, o SGE zera esses dois campos e eles seriam gravados como 0.
  const casas = modal.locator('#s2id_ConfiguracaoDeCasasDecimais');
  await casas.locator('.select2-choice').click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const textos = (await opcoes.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  if (!textos.includes(d.casasDecimais)) {
    await page.keyboard.press('Escape');
    throw new Error(`Casas decimais "${d.casasDecimais}" não encontrado. Opções: ${textos.join(' | ')}.`);
  }
  await opcoes.getByText(d.casasDecimais, { exact: true }).click();
  await expect(casas.locator('.select2-chosen')).toHaveText(d.casasDecimais);
  await modal.locator('#NotaMaximaMediaFinal').fill(d.notaMaximaMediaFinal);
  await modal.locator('#MediaAprovacao').fill(d.mediaAprovacao);
  await modal.locator('#QuantidadeDisciplinaRecuperacao').fill(d.quantidadeDisciplinasRecuperacao);

  await modal.getByRole('button', { name: /Salvar/ }).click();
  const sucesso = page.getByRole('dialog').filter({ hasText: 'Fórmula de aprovação adicionada!' });
  const recusa = page
    .getByRole('dialog')
    .filter({ hasText: 'Já existe uma outra fórmula de aprovação cadastrada com essa mesma descrição.' });
  await expect(sucesso.or(recusa)).toBeVisible();
  if (await recusa.isVisible())
    throw new Error(`O SGE recusou: já existe fórmula de aprovação "${d.descricao}".`);
  // Anuncia assim que o SGE confirma, para a limpeza do ciclo cobrir falhas seguintes.
  aoCriar?.(d.descricao);
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  // Divergência observada: após o sucesso o SGE mantém o modal de Adicionar aberto
  // (e o GET /formulaaprovacao/Editar/<id> que ele dispara retorna HTTP 500); fecha como o usuário.
  await modal.getByRole('button', { name: /Fechar/ }).click();
  await expect(modal).toBeHidden();

  // Persistência: reabre pela grade e confere os valores gravados.
  await pesquisarFormulaAprovacao(page, d.descricao);
  const linha = linhaFormulaAprovacao(page, d.descricao);
  await expect(linha).toHaveCount(1);
  await linha.locator('a[onclick^="abrirModalFormulaDeAprovacao"]').click();
  await expect(modal).toBeVisible();
  await expect(modal.locator('#Id')).not.toHaveValue('0');
  await expect(modal.locator('#Descricao')).toHaveValue(d.descricao);
  await expect(modal.locator('#FrequenciaMinima')).toHaveValue(d.frequenciaMinima);
  await expect(modal.locator('#ArredondamentoNota option:checked')).toHaveText(d.arredondamento);
  await expect(modal.locator('#DropDownConselhoDeClasse option:checked')).toHaveText(d.conselhoClasse);
  await expect(modal.locator('#DropDownLancamentos option:checked')).toHaveText(d.lancamentos);
  await expect(modal.locator('#FormulaDeAprovacao')).toHaveValue(d.formulaAprovacao);
  await expect(modal.locator('#FormulaDeAprovacaoConceito')).toHaveValue(d.formulaConceitoFinal);
  await expect(modal.locator('#ConfiguracaoDeCasasDecimais option:checked')).toHaveText(d.casasDecimais);
  await expect(modal.locator('#NotaMaximaMediaFinal')).toHaveValue(d.notaMaximaMediaFinal);
  await expect(modal.locator('#MediaAprovacao')).toHaveValue(d.mediaAprovacao);
  await expect(modal.locator('#QuantidadeDisciplinaRecuperacao')).toHaveValue(
    d.quantidadeDisciplinasRecuperacao,
  );
  await modal.getByRole('button', { name: /Fechar/ }).click();
  await expect(modal).toBeHidden();
  return d.descricao;
}
