import { expect, test } from '@playwright/test';
import { criarFornecedorPessoaFisica } from '../../../../src/actions/criar-fornecedor-pessoa-fisica.action';
import { getByRoleSge, loginSge } from '../../../../src/helpers';
import {
  linhaFornecedor,
  navegarParaAdicionarFornecedor,
  pesquisarFornecedor,
  voltarParaConsultaFornecedor,
} from '../../../../src/helpers/navigation/fornecedor.navigation';
import { baseUrlFornecedor, lerDadosFornecedorPf } from './fornecedor_pf_config';

test('valida os campos obrigatórios, cria um Fornecedor Pessoa Física QAAUTO e o encontra na consulta', async ({ page }) => {
  const dados = lerDadosFornecedorPf('dados_fornecedor_pf.json');
  const baseUrl = baseUrlFornecedor();

  await loginSge(page, { baseUrl });

  const formulario = page.locator('#main');
  await navegarParaAdicionarFornecedor(page, 'Pessoa Física');
  await getByRoleSge(formulario, 'button', { name: /Salvar/i }).click();
  await expect(formulario.getByText('Qual o nome?', { exact: true })).toBeVisible();
  await expect(formulario.getByText('Necessário informar o CPF.', { exact: true })).toBeVisible();

  const criado = await criarFornecedorPessoaFisica(page, dados);

  await voltarParaConsultaFornecedor(page);
  await pesquisarFornecedor(page, criado.nome);
  const linha = linhaFornecedor(page, criado.nome, criado.cpfFormatado);
  await expect(linha).toHaveCount(1);
  await expect(linha).toContainText('Pessoa Física');
  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
  console.log(`[QAAUTO] Fornecedor Pessoa Física criado e conferido na consulta: ${criado.nome}`);
});
