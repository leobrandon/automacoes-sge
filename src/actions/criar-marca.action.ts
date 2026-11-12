import { expect, type Page } from '@playwright/test';
import { buildMarca, type BuildMarcaOptions, type MarcaData } from '../factories/marca.factory';
import {
  abrirEdicaoMarca,
  fecharModalMarca,
  linhaMarca,
  modalMarca,
  navegarParaAdicionarMarca,
  pesquisarMarca,
  proximaSequenciaLivreMarca,
} from '../helpers/navigation/marca.navigation';

export interface MarcaCriada extends MarcaData {
  url: string;
}

/** Cria pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarMarca(
  page: Page,
  options: BuildMarcaOptions = {},
  sequencia = 1,
): Promise<MarcaCriada> {
  // O SGE recusa descrição repetida; usa a primeira sequência livre.
  const sequenciaLivre = await proximaSequenciaLivreMarca(page, options, sequencia);
  const dados = buildMarca(options, sequenciaLivre);
  await navegarParaAdicionarMarca(page);

  const modal = modalMarca(page);
  await modal.locator('#Descricao').fill(dados.descricao);
  await modal.locator('#btnSalvar').click();

  // O sucesso não exibe aviso: o modal passa a mostrar a seção "Modelos" da marca gravada.
  const sucesso = modal.locator('#formTableEditarModelo');
  const atencao = page.locator('.swal2-popup').filter({ hasText: 'Atenção' });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.isVisible()) {
    const mensagem = (await atencao.innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`O SGE não aceitou a Marca "${dados.descricao}": ${mensagem}`);
  }
  await fecharModalMarca(page);

  await pesquisarMarca(page, dados.descricao);
  await expect(linhaMarca(page, dados.descricao)).toHaveCount(1, { timeout: 15000 });

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoMarca(page, dados.descricao);
  await expect(modal.locator('#Descricao')).toHaveValue(dados.descricao);
  await fecharModalMarca(page);

  console.log(`[QAAUTO] Marca criada e conferida: ${dados.descricao}`);
  return { ...dados, url: page.url() };
}
