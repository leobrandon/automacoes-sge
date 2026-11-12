import {expect, type Page} from '@playwright/test';
import {avisoNecessidade, linhaNecessidade, pesquisarNecessidade} from '../helpers/navigation/necessidade-nutricional.navigation';
import type {NecessidadeCriada} from './criar-necessidade-nutricional.action';

export async function excluirNecessidadeNutricional(page: Page, alvo: NecessidadeCriada): Promise<void> {
  if (!/^QAAUTO\b/i.test(alvo.resolucao.trim()) || !/^QAAUTO\b/i.test(alvo.grupo.trim())) {
    throw new Error('Exclusão exige resolução e grupo de apoio QAAUTO.');
  }
  await pesquisarNecessidade(page, alvo.resolucao);
  const linha = linhaNecessidade(page, alvo.resolucao, alvo.grupo, alvo.atendimento);
  await expect(linha).toHaveCount(1);
  const botao = linha.getByTitle('Excluir', {exact: true});
  await expect(botao).toBeVisible();
  await botao.click();
  const d = page.getByRole('dialog').filter({hasText: 'Tem certeza que deseja excluir essa necessidade nutricional?'});
  await expect(d).toBeVisible();
  await d.getByRole('button', {name: 'Sim', exact: true}).click();
  await avisoNecessidade(page, /Necessidade nutricional excluída\./i);
  await pesquisarNecessidade(page, alvo.resolucao);
  await expect(linhaNecessidade(page, alvo.resolucao, alvo.grupo, alvo.atendimento)).toHaveCount(0);
}
