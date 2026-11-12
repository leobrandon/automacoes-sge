import { Page } from '@playwright/test';
import { linhaMotivoAlteracao, pesquisarMotivoAlteracao } from '../helpers/navigation/motivo-alteracao.navigation';

export interface MotivoAlteracaoExcluido { descricao: string; url: string; }
export interface LoteExclusaoMotivoAlteracaoResultado {
  totalExcluidos: number;
  motivosExcluidos: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

export async function excluirMotivoAlteracao(page: Page, descricao: string): Promise<MotivoAlteracaoExcluido> {
  if (!/^QAAUTO\b/.test(descricao)) throw new Error('Exclusão permitida apenas para registros QAAUTO.');
  await pesquisarMotivoAlteracao(page, descricao);
  const linha = linhaMotivoAlteracao(page, descricao);
  await linha.waitFor({ state: 'visible' });
  if (await linha.count() !== 1) throw new Error('Exclusão requer exatamente um registro na grade.');
  await linha.locator('a[title="Excluir"]').click();
  const alerta = page.locator('.swal2-popup:visible');
  await alerta.getByRole('button', { name: 'Sim', exact: true }).click();
  await alerta.getByRole('button', { name: /^(Ok|OK)$/ }).waitFor({ state: 'visible' });
  const feedback = await alerta.innerText();
  await alerta.getByRole('button', { name: /^(Ok|OK)$/ }).click();
  if (!/sucesso/i.test(feedback)) throw new Error(`Exclusão não confirmada: ${feedback}`);
  await pesquisarMotivoAlteracao(page, descricao);
  await linha.waitFor({ state: 'hidden' });
  return { descricao, url: page.url() };
}

/**
 * Remove em lote registros de motivo de alteração com prefixo QAAUTO.
 * Suporta tanto uma lista explícita de descrições quanto um termo de pesquisa (ex.: 'QAAUTO')
 * para varredura e limpeza direta da grade no SGE.
 */
export async function excluirMotivosAlteracaoEmLote(
  page: Page,
  alvo: string[] | string = 'QAAUTO'
): Promise<LoteExclusaoMotivoAlteracaoResultado> {
  const resultado: LoteExclusaoMotivoAlteracaoResultado = { totalExcluidos: 0, motivosExcluidos: [], falhas: [] };

  if (Array.isArray(alvo)) {
    if (alvo.some(d => !/^QAAUTO\b/.test(d))) throw new Error('Lote contém registro sem prefixo QAAUTO.');
    for (const descricao of new Set(alvo)) {
      try {
        await excluirMotivoAlteracao(page, descricao);
        resultado.motivosExcluidos.push(descricao);
      } catch (error) {
        resultado.falhas.push({ descricao, motivo: error instanceof Error ? error.message : String(error) });
      }
    }
  } else {
    const termo = alvo.trim();
    if (!termo.startsWith('QAAUTO')) throw new Error('Limpeza permitida apenas para registros com prefixo QAAUTO.');
    await pesquisarMotivoAlteracao(page, termo);

    let iteracao = 0;
    const maxExclusoes = 50;

    while (iteracao < maxExclusoes) {
      const candidateRows = page.locator('table tbody tr').filter({
        has: page.locator('td').filter({ hasText: /^QAAUTO/ })
      });
      const count = await candidateRows.count();
      if (count === 0) break;

      let pendenteDesc = '';
      for (let i = 0; i < count; i++) {
        const text = (await candidateRows.nth(i).locator('td').first().innerText().catch(() => '')).trim();
        if (text && text.startsWith('QAAUTO') && !resultado.falhas.some(f => f.descricao === text)) {
          pendenteDesc = text;
          break;
        }
      }
      if (!pendenteDesc) break;

      iteracao++;
      try {
        await excluirMotivoAlteracao(page, pendenteDesc);
        resultado.motivosExcluidos.push(pendenteDesc);
      } catch (error) {
        resultado.falhas.push({ descricao: pendenteDesc, motivo: error instanceof Error ? error.message : String(error) });
      }
      await pesquisarMotivoAlteracao(page, termo);
    }
  }

  resultado.totalExcluidos = resultado.motivosExcluidos.length;
  return resultado;
}
