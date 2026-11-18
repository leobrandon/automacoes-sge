import { expect, test } from '@playwright/test';
import { criarEscala } from '../../../../src/actions/criar-escala.action';
import {
  linhaEscala,
  navegarParaAdicionarEscala,
  pesquisarEscala,
  voltarParaConsultaEscala,
} from '../../../../src/helpers/navigation/escala.navigation';
import { getByRoleSge, loginSge } from '../../../../src/helpers';
import { lerDadosEscala } from './escala-test-config';

test('valida os campos obrigatórios, cria uma Escala QAAUTO e a encontra na consulta', async ({ page }) => {
  const dados = lerDadosEscala('dados_escala.json');

  await loginSge(page);

  const formulario = page.locator('#main');
  await navegarParaAdicionarEscala(page);
  await getByRoleSge(formulario, 'button', { name: /Salvar/i }).click();
  await expect(formulario.getByText('Descrição é obrigatória.', { exact: true })).toBeVisible();

  const criada = await criarEscala(page, dados, 1);

  await voltarParaConsultaEscala(page);
  await pesquisarEscala(page, criada.descricao);
  const linha = linhaEscala(page, criada.descricao);
  await expect(linha).toHaveCount(1);
  await expect(linha.getByText(criada.descricao, { exact: true })).toBeVisible();
  await expect(linha).toContainText(criada.tipo.replace('Cíclica', 'Ciclica'));
  console.log(`[QAAUTO] Escala criada e conferida na consulta: ${criada.descricao}`);
});
