import { expect, type Page } from '@playwright/test';
import {
  buildClassificacaoUnidades,
  type BuildClassificacaoUnidadesOptions,
  type ClassificacaoUnidadesData,
} from '../factories/classificacao-unidades.factory';
import {
  abrirEdicaoClassificacaoUnidades,
  confirmarAvisoClassificacaoUnidades,
  fecharModalClassificacaoUnidades,
  linhaClassificacaoUnidades,
  modalClassificacaoUnidades,
  navegarParaAdicionarClassificacaoUnidades,
  pesquisarClassificacaoUnidades,
  proximaSequenciaLivreClassificacaoUnidades,
} from '../helpers/navigation/classificacao-unidades.navigation';

export interface ClassificacaoUnidadesCriada extends ClassificacaoUnidadesData {
  url: string;
}

/** Cria pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarClassificacaoUnidades(
  page: Page,
  options: BuildClassificacaoUnidadesOptions = {},
  sequencia = 1,
): Promise<ClassificacaoUnidadesCriada> {
  // O SGE recusa descrição repetida; usa a primeira sequência livre.
  const sequenciaLivre = await proximaSequenciaLivreClassificacaoUnidades(page, options, sequencia);
  const dados = buildClassificacaoUnidades(options, sequenciaLivre);
  await navegarParaAdicionarClassificacaoUnidades(page);

  const modal = modalClassificacaoUnidades(page);
  await modal.locator('#Descricao').fill(dados.descricao);
  await modal.locator('#btnSalvar').click();

  const sucesso = page.locator('.swal2-popup').filter({ hasText: 'Classificação adicionada.' });
  const atencao = page.locator('.swal2-popup').filter({ hasText: 'Atenção' });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.isVisible()) {
    const mensagem = (await atencao.innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`O SGE não aceitou a Classificação "${dados.descricao}": ${mensagem}`);
  }
  await confirmarAvisoClassificacaoUnidades(page);
  await expect(modal).toBeHidden({ timeout: 15000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0, { timeout: 15000 });

  await pesquisarClassificacaoUnidades(page, dados.descricao);
  await expect(linhaClassificacaoUnidades(page, dados.descricao)).toHaveCount(1, { timeout: 15000 });

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoClassificacaoUnidades(page, dados.descricao);
  await expect(modal.locator('#Descricao')).toHaveValue(dados.descricao);
  await fecharModalClassificacaoUnidades(page);

  console.log(`[QAAUTO] Classificação de Unidades criada e conferida: ${dados.descricao}`);
  return { ...dados, url: page.url() };
}
