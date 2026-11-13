import { expect, type Page } from '@playwright/test';
import {
  buildAreaAtuacao,
  type AreaAtuacaoData,
  type BuildAreaAtuacaoOptions,
} from '../factories/area-atuacao.factory';
import {
  abrirModalAdicionarAreaAtuacao,
  confirmarAvisoAreaAtuacao,
  linhaAreaAtuacao,
  modalAreaAtuacao,
  pesquisarAreaAtuacao,
  proximaSequenciaLivreAreaAtuacao,
} from '../helpers/navigation/area-atuacao.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface AreaAtuacaoCriada extends AreaAtuacaoData {
  url: string;
}

/** Cria pelo modal e prova a persistência na grade e reabrindo o registro. */
export async function criarAreaAtuacao(
  page: Page,
  options: BuildAreaAtuacaoOptions = {},
  sequencia = 1,
): Promise<AreaAtuacaoCriada> {
  // O SGE recusa nome repetido no mesmo eixo; usa a primeira sequência livre para a conferência ser inequívoca.
  const sequenciaLivre = await proximaSequenciaLivreAreaAtuacao(page, options, sequencia);
  const dados = buildAreaAtuacao(options, sequenciaLivre);

  const modal = await abrirModalAdicionarAreaAtuacao(page);
  await modal.locator('#Eixo').selectOption({ label: dados.eixo });
  await modal.locator('#Nome').fill(dados.descricao);
  await expect(modal.locator('#Eixo option:checked')).toHaveText(dados.eixo);

  const salvar = getByRoleSge(modal, 'button', { name: 'Salvar' });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /Área de atuação salva com sucesso/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`O SGE não aceitou a Área de atuação "${dados.descricao}": ${aviso}`);
  }

  await confirmarAvisoAreaAtuacao(page, 'Ok');
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarAreaAtuacao(page, dados.descricao);
  const linha = linhaAreaAtuacao(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(getByRoleSge(linha, 'cell', { name: dados.eixo, exact: true })).toBeVisible();

  // Reabre pelo botão Editar para conferir o que foi gravado.
  // Botão só com ícone: o glifo do Font Awesome vira o nome acessível, então o title é o identificador estável.
  const editar = linha.locator('button[title="Editar"]');
  await expect(editar).toBeVisible();
  await editar.click();
  await expect(modalAreaAtuacao(page)).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('#Nome')).toHaveValue(dados.descricao, { timeout: 15000 });
  await expect(modal.locator('#Eixo option:checked')).toHaveText(dados.eixo);
  await expect(modal.locator('#Ativo')).toBeChecked();
  await getByRoleSge(modal, 'button', { name: 'Cancelar' }).click();
  await expect(modal).toBeHidden({ timeout: 15000 });

  console.log(`[QAAUTO] Área de atuação criada e conferida: ${dados.descricao}`);
  return { ...dados, url: page.url() };
}
