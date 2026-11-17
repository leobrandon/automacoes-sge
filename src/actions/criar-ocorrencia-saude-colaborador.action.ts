import { expect, type Page } from '@playwright/test';
import type { OpcoesOcorrenciaSaudeColaborador } from '../factories/ocorrencia-saude-colaborador.factory';
import { datepicker } from '../helpers/datepicker.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirFormularioOcorrenciaSaudeColaborador,
  confirmarSucessoOcorrenciaSaude,
} from '../helpers/navigation/ocorrencia-saude-colaborador.navigation';

type DadosOcorrencia = Required<OpcoesOcorrenciaSaudeColaborador>;

async function selecionarOpcao(page: Page, campo: 'EscolaId' | 'JustificativaId', texto: string): Promise<void> {
  const seletor = page.locator(`#main #s2id_${campo}`);
  await seletor.locator('a.select2-choice').click();
  const lista = page.locator('.select2-drop-active:visible');
  await expect(lista).toBeVisible();
  const opcoes = lista.locator('.select2-result-label');
  const opcao = lista.getByText(texto, { exact: true });
  if (await opcao.count() !== 1) {
    const disponiveis = (await opcoes.allTextContents()).map((item) => item.trim()).filter(Boolean);
    throw new Error(`Seleção inválida em ${campo}: "${texto}". Opções exibidas: ${disponiveis.join(' | ') || 'nenhuma'}.`);
  }
  await opcao.click();
  await expect(lista).toBeHidden();
  await expect(seletor.locator('.select2-chosen')).toHaveText(texto);
}

async function selecionarColaborador(page: Page, nome: string): Promise<void> {
  const seletor = page.locator('#main #s2id_PessoaId');
  await expect(seletor).not.toHaveClass(/select2-container-disabled/);
  await seletor.locator('a.select2-choice').click();
  const lista = page.locator('.select2-drop-active:visible');
  const busca = lista.locator('input.select2-input:visible');
  const nomeEscapado = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nomeComCodigo = new RegExp(`^\\s*${nomeEscapado}(?=\\s*\\d)`, 'i');
  const opcoes = lista.locator('.select2-result-label');
  const nomeNaOpcao = page.locator('td:has(> br)').filter({ hasText: nomeComCodigo });
  const opcao = opcoes.filter({ has: nomeNaOpcao });
  await busca.fill(nome);
  await expect(opcao.or(lista.locator('.select2-no-results')), `Procure o colaborador QAAUTO "${nome}" vinculado à escola.`)
    .not.toHaveCount(0);
  await expect(opcao, `O nome "${nome}" deve identificar um único colaborador na escola.`).toHaveCount(1);
  // O nome é a primeira linha da célula. O código e os demais dados vêm depois da quebra.
  const nomeExibido = await opcao.locator(nomeNaOpcao).evaluate((celula) => celula.firstChild?.textContent?.trim());
  expect(nomeExibido).toBe(nome);
  await opcao.click();
  await expect(lista).toBeHidden();
  await expect(seletor.locator('.select2-chosen')).toContainText(nome);
}

export async function criarOcorrenciaSaudeColaborador(
  page: Page,
  dados: DadosOcorrencia,
  registrarCriacao: (id: string) => void,
): Promise<void> {
  if (!/\bQAAUTO\b/i.test(dados.colaborador)) throw new Error('Use somente um colaborador de teste QAAUTO.');
  await abrirFormularioOcorrenciaSaudeColaborador(page);
  await selecionarOpcao(page, 'EscolaId', dados.escola);
  await selecionarColaborador(page, dados.colaborador);
  await selecionarOpcao(page, 'JustificativaId', dados.justificativa);

  const main = page.locator('#main');
  const dias = main.locator('#TotalDeDiasDeAtestado');
  await expect(dias).toBeVisible();
  await expect.poll(async () => await dias.isEditable() || (await dias.inputValue()) !== '', {
    message: 'A justificativa deve liberar o campo Total de Dias ou preencher o valor fixo.',
  }).toBe(true);
  if (await dias.isEditable()) await dias.fill(String(dados.totalDias));
  await expect(dias, 'Confira os dias configurados no cadastro da justificativa.').toHaveValue(String(dados.totalDias));

  await datepicker.fill(page, '#main #DataInicio', dados.dataInicio, { dispatchEvents: false });
  const cidNaoInformado = main.locator('#CidNaoInformado');
  if (!await cidNaoInformado.isChecked()) {
    const toggle = main.locator('[data-toggle="toggle"]').filter({ has: page.locator('#CidNaoInformado') });
    await expect(toggle).toBeVisible();
    await toggle.click();
  }
  await expect(cidNaoInformado).toBeChecked();
  const campoFim = main.locator('#DataFim');
  await expect(campoFim).toHaveValue(/^\d{2}\/\d{2}\/\d{4}$/);
  const dataFim = await campoFim.inputValue();

  const salvar = getByRoleSge(main, 'button', { name: /Salvar/ });
  await expect(salvar).toBeVisible();
  await salvar.click();
  await confirmarSucessoOcorrenciaSaude(page, 'A ocorrência de saúde foi cadastrada.');

  await expect(getByRoleSge(main, 'heading', { name: /Editar Ocorrência de Saúde de Colaborador/ })).toBeVisible();
  const id = main.locator('form input[type="hidden"]#Id');
  await expect(id).toHaveValue(/\S/);
  registrarCriacao(await id.inputValue());
  await expect(main.locator('#SituacaoDescricao')).toHaveValue('Rascunho');
  await expect(main.locator('#PessoaNome')).toHaveValue(dados.colaborador);
  await expect(main.locator('#s2id_JustificativaId .select2-chosen')).toHaveText(dados.justificativa);
  await expect(main.locator('#DataInicio')).toHaveValue(dados.dataInicio);
  await expect(campoFim).toHaveValue(dataFim);
  await expect(dias).toHaveValue(String(dados.totalDias));
  await expect(cidNaoInformado).toBeChecked();
}
