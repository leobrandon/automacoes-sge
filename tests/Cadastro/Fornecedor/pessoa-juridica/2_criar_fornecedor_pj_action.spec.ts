import { expect, test } from '@playwright/test';
import { criarFornecedorPessoaJuridica } from '../../../../src/actions/criar-fornecedor-pessoa-juridica.action';
import { getByRoleSge, loginSge } from '../../../../src/helpers';
import {
  linhaFornecedor,
  navegarParaAdicionarFornecedor,
  pesquisarFornecedor,
  voltarParaConsultaFornecedor,
} from '../../../../src/helpers/navigation/fornecedor.navigation';
import { baseUrlFornecedor, lerDadosFornecedorPj } from './fornecedor_pj_config';

test('valida os campos obrigatórios, cria um Fornecedor Pessoa Jurídica QAAUTO e o encontra na consulta', async ({ page }) => {
  const dados = lerDadosFornecedorPj('dados_fornecedor_pj.json');
  const baseUrl = baseUrlFornecedor();

  await loginSge(page, { baseUrl });

  const formulario = page.locator('#main');
  const criado = await criarFornecedorPessoaJuridica(page, dados);

  await voltarParaConsultaFornecedor(page);
  await pesquisarFornecedor(page, criado.razaoSocial);
  const linha = linhaFornecedor(page, criado.razaoSocial, criado.cnpjFormatado);
  await expect(linha).toHaveCount(1);
  await expect(linha).toContainText('Pessoa Jurídica');
  await expect(linha).toContainText(criado.nomeFantasia);

  // A validação fica depois da criação: salvar o formulário vazio antes impede o POST seguinte do mesmo formulário.
  await navegarParaAdicionarFornecedor(page, 'Pessoa Jurídica');
  await getByRoleSge(formulario, 'button', { name: /Salvar/i }).click();
  await expect(formulario.locator('.field-validation-error').first()).toBeVisible();
  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
  console.log(`[QAAUTO] Fornecedor Pessoa Jurídica criado e conferido na consulta: ${criado.razaoSocial}`);
});
