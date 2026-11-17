import { expect, type Page } from '@playwright/test';
import {
  buildConfiguracaoAnoEscolar,
  type ConfiguracaoAnoEscolarAlvo,
  type ConfiguracaoAnoEscolarDados,
} from '../factories/configurar-ano-escolar.factory';
import {
  consultaConfiguracaoAnoEscolar,
  linhaConfiguracaoAnoEscolar,
  pesquisarConfiguracaoAnoEscolar,
} from '../helpers/navigation/configurar-ano-escolar.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

async function selecionar(page: Page, id: string, texto: string, apoio: string): Promise<void> {
  const container = page.locator(`#s2id_${id}`);
  await expect(container).toBeVisible();
  // Selects em cascata carregam as opções (além da vazia) depois do campo anterior.
  try {
    await expect.poll(() => page.locator(`#${id} option`).count(), { timeout: 15000 }).toBeGreaterThan(1);
  } catch (erro) {
    throw new Error(
      `As opções de ${apoio} não carregaram em 15s: a lista está vazia (cadastre o apoio antes de executar) ou o campo anterior da cascata não carregou.`,
      { cause: erro },
    );
  }
  await container.locator('.select2-choice').click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const textos = (await opcoes.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  if (!textos.includes(texto)) {
    await page.keyboard.press('Escape');
    throw new Error(
      textos.length
        ? `${apoio} "${texto}" não encontrado. Opções: ${textos.join(' | ')}.`
        : `Nenhum ${apoio} disponível; cadastre-o antes de executar.`,
    );
  }
  // O tenant pode ter composições homônimas no mesmo calendário; usa a primeira.
  await opcoes.getByText(texto, { exact: true }).first().click();
  await expect(container.locator('.select2-chosen')).toHaveText(texto);
}

export async function criarConfiguracaoAnoEscolar(
  page: Page,
  dados: ConfiguracaoAnoEscolarDados,
  aoCriar?: (alvo: ConfiguracaoAnoEscolarAlvo) => void,
): Promise<ConfiguracaoAnoEscolarAlvo> {
  const d = buildConfiguracaoAnoEscolar(dados);
  const alvo: ConfiguracaoAnoEscolarAlvo = {
    calendarioEscolar: d.calendarioEscolar,
    composicaoEnsino: d.composicaoEnsino,
    anoEscolar: d.anoEscolar,
  };
  const main = page.locator('#main');
  await consultaConfiguracaoAnoEscolar(page);
  await getByRoleSge(main, 'button', { name: /Adicionar/ }).click();
  const form = main.locator('#formSerieComposicao');
  await expect(form).toBeVisible();
  // Campos em cascata: cada um só carrega depois do anterior.
  await selecionar(page, 'ComposicaoCalendarioCalendarioEscolarAnoLetivoId', d.anoLetivo, 'ano letivo');
  await selecionar(page, 'ComposicaoCalendarioCalendarioEscolarId', d.calendarioEscolar, 'calendário escolar');
  await selecionar(page, 'ComposicaoCalendarioId', d.composicaoEnsino, 'composição de ensino');
  await selecionar(page, 'SerieId', d.anoEscolar, 'ano escolar');
  await selecionar(page, 'TipoDiario', d.tipoDiario, 'tipo do diário');
  await selecionar(page, 'FormaAvaliacao', d.formaAvaliacao, 'forma de avaliação');
  await selecionar(page, 'SerieDestinoId', d.anoEscolarDestino, 'ano escolar de destino');
  if (d.capacidadeMinima) await form.locator('#CapacidadeMinima').fill(d.capacidadeMinima);
  if (d.capacidadeMaxima) await form.locator('#VagasDisponiveis').fill(d.capacidadeMaxima);
  if (d.observacaoDiarioClasse)
    await form.locator('#ObservacaoParaDiarioDeClasse').fill(d.observacaoDiarioClasse);
  await form.getByRole('button', { name: 'Salvar' }).click();

  const sucesso = page.getByRole('dialog').filter({ hasText: 'Configuração salva com sucesso!' });
  const recusa = page.getByText('Já existe um registro cadastrado para o Ano Escolar informado.').first();
  await expect(sucesso.or(recusa)).toBeVisible();
  if (await recusa.isVisible())
    throw new Error(
      `O SGE recusou: já existe configuração de "${d.anoEscolar}" em "${d.composicaoEnsino}" do calendário "${d.calendarioEscolar}".`,
    );
  // Anuncia assim que o SGE confirma, para a limpeza do ciclo cobrir falhas nos passos seguintes.
  aoCriar?.(alvo);
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(main.locator('#Id')).not.toHaveValue('0');

  // Persistência: reabre pela grade e confere os valores gravados.
  await pesquisarConfiguracaoAnoEscolar(page, d.calendarioEscolar);
  const linha = linhaConfiguracaoAnoEscolar(page, alvo);
  await expect(linha).toHaveCount(1);
  await linha.click();
  await expect(form).toBeVisible();
  await expect(form.locator('#ComposicaoCalendarioCalendarioEscolarId option:checked')).toHaveText(d.calendarioEscolar);
  await expect(form.locator('#SerieId option:checked')).toHaveText(d.anoEscolar);
  await expect(form.locator('#TipoDiario option:checked')).toHaveText(d.tipoDiario);
  await expect(form.locator('#FormaAvaliacao option:checked')).toHaveText(d.formaAvaliacao);
  await expect(form.locator('#SerieDestinoId option:checked')).toHaveText(d.anoEscolarDestino);
  if (d.capacidadeMinima) await expect(form.locator('#CapacidadeMinima')).toHaveValue(d.capacidadeMinima);
  if (d.capacidadeMaxima) await expect(form.locator('#VagasDisponiveis')).toHaveValue(d.capacidadeMaxima);
  if (d.observacaoDiarioClasse)
    await expect(form.locator('#ObservacaoParaDiarioDeClasse')).toHaveValue(d.observacaoDiarioClasse);
  return alvo;
}
