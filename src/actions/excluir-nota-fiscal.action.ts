import {expect, type Page} from '@playwright/test';
import {protegerExclusaoNotaFiscal, type NotaFiscalMontada} from '../factories/nota-fiscal.factory';
import {abrirNotaFiscal, excluirNotaFiscalAberta, linhasNotaFiscal, pesquisarNotaFiscal} from '../helpers/navigation/nota-fiscal.navigation';

/** Recebe somente a identificação de uma nota criada pela execução (nunca lote). */
export async function excluirNotaFiscal(page: Page, nota: NotaFiscalMontada): Promise<void> {
  protegerExclusaoNotaFiscal(nota);
  await abrirNotaFiscal(page, nota);
  await excluirNotaFiscalAberta(page);
  await pesquisarNotaFiscal(page, nota.fornecedor, nota.chaveAcesso);
  await expect(linhasNotaFiscal(page, nota.chaveAcesso)).toHaveCount(0);
  console.log(`Nota Fiscal removida: ${nota.numero}/${nota.serie} — ${nota.chaveAcesso}`);
}

/** Usado na limpeza quando o resultado da gravação ainda é incerto. */
export async function excluirNotaFiscalSeExistir(page: Page, nota: NotaFiscalMontada): Promise<void> {
  protegerExclusaoNotaFiscal(nota);
  await pesquisarNotaFiscal(page, nota.fornecedor, nota.chaveAcesso);
  const linhas = linhasNotaFiscal(page, nota.chaveAcesso);
  const total = await linhas.count();
  if (total === 0) return;
  await expect(linhas).toHaveCount(1);
  await excluirNotaFiscal(page, nota);
}
