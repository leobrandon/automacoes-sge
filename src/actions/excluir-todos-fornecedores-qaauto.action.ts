import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  pesquisarFornecedor,
  type TipoFornecedor,
} from '../helpers/navigation/fornecedor.navigation';
import { confirmarExclusaoFornecedor } from './fornecedor-comum';

export interface ConfiguracaoExclusaoGeralFornecedor {
  excluirTodasQAAUTO?: boolean;
  termoBusca?: string;
}

const LIMITE_EXCLUSOES = 500;

/**
 * Exclusão geral: remove, pela interface, todos os Fornecedores do tipo informado cujo nome comece
 * com QAAUTO. Só roda com `excluirTodasQAAUTO: true` e um termo de busca iniciado por QAAUTO.
 */
export async function excluirTodosFornecedoresQAAuto(
  page: Page,
  tipo: TipoFornecedor,
  configuracao: ConfiguracaoExclusaoGeralFornecedor,
): Promise<number> {
  if (configuracao.excluirTodasQAAUTO !== true) {
    throw new Error('A exclusão geral exige "excluirTodasQAAUTO": true no JSON de exclusão.');
  }
  const termo = configuracao.termoBusca?.trim() || 'QAAUTO';
  if (!/^QAAUTO\b/i.test(termo)) {
    throw new Error('O termo de busca da exclusão geral deve começar com "QAAUTO".');
  }

  const conteudo = page.locator('#main');
  let excluidos = 0;

  while (excluidos < LIMITE_EXCLUSOES) {
    await pesquisarFornecedor(page, termo);
    const linhas = conteudo.locator('table tbody tr')
      .filter({ hasText: tipo })
      .filter({ has: page.getByText(/^QAAUTO\b/i) });
    if (await linhas.count() === 0) break;

    const nome = (await linhas.first().getByText(/^QAAUTO\b/i).first().innerText()).trim();
    await linhas.first().getByText(nome, { exact: true }).first().click();
    await expect(getByRoleSge(conteudo, 'heading', { name: new RegExp(`Editar Fornecedor ${tipo}`, 'i') }))
      .toBeVisible({ timeout: 20000 });
    await confirmarExclusaoFornecedor(page);
    await expect(getByRoleSge(conteudo, 'heading', { name: /^\W*Fornecedor\W*$/i }))
      .toBeVisible({ timeout: 20000 });

    excluidos++;
    console.log(`[QAAUTO] Fornecedor ${tipo} excluído (${excluidos}): ${nome}`);
  }

  if (excluidos >= LIMITE_EXCLUSOES) {
    throw new Error(`Limite de ${LIMITE_EXCLUSOES} exclusões atingido; execute novamente para continuar.`);
  }
  await pesquisarFornecedor(page, termo);
  await expect(conteudo.locator('table tbody tr').filter({ hasText: tipo })
    .filter({ has: page.getByText(/^QAAUTO\b/i) })).toHaveCount(0);

  console.log(`[QAAUTO] Exclusão geral de Fornecedor ${tipo} concluída: ${excluidos} registro(s).`);
  return excluidos;
}
