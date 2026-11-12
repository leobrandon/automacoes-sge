import { expect, test } from '@playwright/test';
import { criarCargo } from '../../../../src/actions/criar-cargo.action';
import {
  linhaCargo,
  navegarParaAdicionarCargo,
  pesquisarCargo,
  voltarParaConsultaCargo,
} from '../../../../src/helpers/navigation/cargo.navigation';
import { getByRoleSge, loginSge } from '../../../../src/helpers';
import { lerDadosCargo, validarUrlSandbox } from './cargo-test-config';

test('valida os campos obrigatórios, cria um Cargo QAAUTO e o encontra na consulta', async ({ page }) => {
  const dados = lerDadosCargo('dados_cargo.json');
  const sequencia = Date.now();
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );

  await loginSge(page, { baseUrl });

  const formulario = page.locator('#main');
  await navegarParaAdicionarCargo(page);
  await getByRoleSge(formulario, 'button', { name: /Salvar/i }).click();
  await expect(formulario.getByText('A Descrição é obrigatória.', { exact: true })).toBeVisible();
  await expect(formulario.getByText('Tipo do cargo é obrigatório.', { exact: true })).toBeVisible();

  const criado = await criarCargo(page, dados, sequencia);

  await voltarParaConsultaCargo(page);
  await pesquisarCargo(page, criado.descricao);
  const linha = linhaCargo(page, criado.descricao);
  await expect(linha).toHaveCount(1);
  await expect(linha.getByText(criado.descricao, { exact: true })).toBeVisible();
  await expect(linha).toContainText(criado.tipo);
  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
  console.log(`[QAAUTO] Cargo criado e conferido na consulta: ${criado.descricao}`);
});
