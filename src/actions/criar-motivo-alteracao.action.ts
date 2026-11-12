import { Page } from '@playwright/test';
import { buildMotivoAlteracao, BuildMotivoAlteracaoOptions, MotivoAlteracaoData } from '../factories/motivo-alteracao.factory';
import { navegarParaAdicionarMotivoAlteracao, pesquisarMotivoAlteracao, linhaMotivoAlteracao } from '../helpers/navigation/motivo-alteracao.navigation';
import { excluirMotivoAlteracao } from './excluir-motivo-alteracao.action';

export interface MotivoAlteracaoCriado extends MotivoAlteracaoData { url: string; }

export async function criarMotivoAlteracao(page: Page, options: BuildMotivoAlteracaoOptions = {}): Promise<MotivoAlteracaoCriado> {
  const dados = buildMotivoAlteracao(options);
  await pesquisarMotivoAlteracao(page, dados.descricao);
  await linhaMotivoAlteracao(page, dados.descricao).waitFor({ state: 'hidden' });
  await navegarParaAdicionarMotivoAlteracao(page);
  await page.locator('.modal:visible #Motivo').fill(dados.descricao);
  await page.locator('.modal:visible #btnSalvar').click();
  const alerta = page.locator('.swal2-popup:visible');
  await alerta.getByRole('button', { name: /^(Ok|OK)$/ }).waitFor({ state: 'visible' });
  const feedback = await alerta.innerText();
  await alerta.getByRole('button', { name: /^(Ok|OK)$/ }).click();
  if (!/sucesso/i.test(feedback)) throw new Error(`Criação não confirmada: ${feedback}`);
  // Depois da confirmação, qualquer falha de validação também tenta limpar o registro criado.
  try {
    await pesquisarMotivoAlteracao(page, dados.descricao);
    const linha = linhaMotivoAlteracao(page, dados.descricao);
    await linha.waitFor({ state: 'visible' });
    if (await linha.count() !== 1) throw new Error('O motivo não é único na grade.');
    await linha.locator('[title="Ativo"]').waitFor({ state: 'visible' });
    if (dados.situacao === 'Inativo') {
      await linha.locator('a[title="Editar"]').click();
      const modal = page.locator('.modal:visible');
      await modal.locator('#Ativo').waitFor({ state: 'attached' });
      await modal.locator('.toggle').click();
      if (await modal.locator('#Ativo').isChecked()) throw new Error('O controle Ativo não foi desmarcado.');
      await modal.locator('#btnSalvar').click();
      await alerta.getByRole('button', { name: /^(Ok|OK)$/ }).waitFor({ state: 'visible' });
      const retorno = await alerta.innerText();
      await alerta.getByRole('button', { name: /^(Ok|OK)$/ }).click();
      if (!/sucesso/i.test(retorno)) throw new Error(`Situação não confirmada: ${retorno}`);
      await pesquisarMotivoAlteracao(page, dados.descricao);
      await linha.locator('[title="Inativo"]').waitFor({ state: 'visible' });
    }
    return { ...dados, url: page.url() };
  } catch (error) {
    try { await excluirMotivoAlteracao(page, dados.descricao); }
    catch (cleanup) { throw new AggregateError([error, cleanup], `Falha na validação e limpeza de ${dados.descricao}`); }
    throw error;
  }
}
