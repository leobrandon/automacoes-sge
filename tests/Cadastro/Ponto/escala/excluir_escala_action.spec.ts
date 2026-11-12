import { expect, test } from '@playwright/test';
import { criarEscala } from '../../../../src/actions/criar-escala.action';
import { excluirEscala } from '../../../../src/actions/excluir-escala.action';
import { linhaEscala, pesquisarEscala } from '../../../../src/helpers/navigation/escala.navigation';
import { loginSge } from '../../../../src/helpers';
import { lerDadosEscala } from './escala-test-config';

test('cria uma Escala QAAUTO própria, confirma a exclusão e verifica sua ausência', async ({ page }) => {
  const dados = lerDadosEscala('dados_exclusao_escala.json');

  await loginSge(page);
  const criada = await criarEscala(page, dados, 1);
  const excluida = await excluirEscala(page, criada);

  expect(excluida.descricao).toBe(criada.descricao);
  await pesquisarEscala(page, criada.descricao);
  await expect(linhaEscala(page, criada.descricao)).toHaveCount(0);
  console.log(`[QAAUTO] Pré-condição e exclusão concluídas: ${excluida.descricao}`);
});
