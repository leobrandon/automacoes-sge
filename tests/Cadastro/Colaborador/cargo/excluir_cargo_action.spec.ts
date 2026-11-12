import { expect, test } from '@playwright/test';
import { criarCargo } from '../../../../src/actions/criar-cargo.action';
import { excluirCargo } from '../../../../src/actions/excluir-cargo.action';
import { loginSge } from '../../../../src/helpers';
import { lerDadosCargo, validarUrlSandbox } from './cargo-test-config';

test('cria um Cargo QAAUTO próprio, confirma a exclusão e verifica sua ausência', async ({ page }) => {
  const dados = lerDadosCargo('dados_exclusao_cargo.json');
  const sequencia = Date.now();
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );

  await loginSge(page, { baseUrl });
  const criado = await criarCargo(page, dados, sequencia);
  const excluido = await excluirCargo(page, criado);

  expect(excluido.descricao).toBe(criado.descricao);
  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
  console.log(`[QAAUTO] Pré-condição e exclusão concluídas: ${excluido.descricao}`);
});
