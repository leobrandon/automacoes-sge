import { expect, type Page } from '@playwright/test';
import {
  buildMotivoMovimentacao,
  type BuildMotivoMovimentacaoOptions,
  type MotivoMovimentacaoData,
} from '../factories/motivo-movimentacao.factory';
import {
  abrirEdicaoMotivoMovimentacao,
  linhaMotivoMovimentacao,
  navegarParaAdicionarMotivoMovimentacao,
  pesquisarMotivoMovimentacao,
  proximaSequenciaLivreMotivoMovimentacao,
  tituloConsultaMotivoMovimentacao,
  voltarParaConsultaMotivoMovimentacao,
} from '../helpers/navigation/motivo-movimentacao.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface MotivoMovimentacaoCriado extends MotivoMovimentacaoData {
  url: string;
}

/** Cria pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarMotivoMovimentacao(
  page: Page,
  options: BuildMotivoMovimentacaoOptions = {},
  sequencia = 1,
): Promise<MotivoMovimentacaoCriado> {
  // O SGE recusa descrição repetida; usa a primeira sequência livre.
  const sequenciaLivre = await proximaSequenciaLivreMotivoMovimentacao(page, options, sequencia);
  const dados = buildMotivoMovimentacao(options, sequenciaLivre);
  await navegarParaAdicionarMotivoMovimentacao(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  // O Ativo nasce marcado; só é alterado quando o JSON pede outro valor.
  if (await formulario.locator('#Ativo').isChecked() !== dados.ativo) {
    await formulario.locator('label.checkbox').filter({ hasText: 'Ativo' }).click();
  }
  if (dados.ativo) {
    await expect(formulario.locator('#Ativo')).toBeChecked();
  } else {
    await expect(formulario.locator('#Ativo')).not.toBeChecked();
  }

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/ });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('O motivo foi salvo com sucesso.');
  const atencao = page.locator('.alert-danger').filter({ hasText: 'Atenção' });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const mensagem = (await atencao.first().innerText()).replace(/[×\s]+/g, ' ').trim();
    throw new Error(`O SGE não aceitou o Motivo de Movimentação "${dados.descricao}": ${mensagem}`);
  }
  await expect(tituloConsultaMotivoMovimentacao(page)).toBeVisible({ timeout: 20000 });

  await pesquisarMotivoMovimentacao(page, dados.descricao);
  await expect(linhaMotivoMovimentacao(page, dados.descricao)).toHaveCount(1, { timeout: 15000 });

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoMotivoMovimentacao(page, dados.descricao);
  if (dados.ativo) {
    await expect(formulario.locator('#Ativo')).toBeChecked();
  } else {
    await expect(formulario.locator('#Ativo')).not.toBeChecked();
  }
  await voltarParaConsultaMotivoMovimentacao(page);

  console.log(`[QAAUTO] Motivo de Movimentação criado e conferido: ${dados.descricao} | Ativo: ${dados.ativo}`);
  return { ...dados, url: page.url() };
}
