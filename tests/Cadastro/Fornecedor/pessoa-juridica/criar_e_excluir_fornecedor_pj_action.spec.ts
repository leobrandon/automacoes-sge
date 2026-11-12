import { expect, test } from '@playwright/test';
import { criarFornecedorPessoaJuridica } from '../../../../src/actions/criar-fornecedor-pessoa-juridica.action';
import { excluirFornecedor } from '../../../../src/actions/excluir-fornecedor.action';
import { loginSge } from '../../../../src/helpers';
import {
  abrirFornecedorNaConsulta,
  linhaFornecedor,
  pesquisarFornecedor,
  voltarParaConsultaFornecedor,
} from '../../../../src/helpers/navigation/fornecedor.navigation';
import { baseUrlFornecedor, lerDadosFornecedorPj } from './fornecedor_pj_config';

// Ciclo completo: remove somente o registro criado nesta execução (razão social + CNPJ únicos).
test('cria, consulta e exclui o Fornecedor Pessoa Jurídica QAAUTO criado nesta execução', async ({ page }) => {
  const dados = lerDadosFornecedorPj('dados_fornecedor_pj.json');
  const baseUrl = baseUrlFornecedor();

  await loginSge(page, { baseUrl });
  const criado = await criarFornecedorPessoaJuridica(page, dados);

  await voltarParaConsultaFornecedor(page);
  await pesquisarFornecedor(page, criado.razaoSocial);
  await expect(linhaFornecedor(page, criado.razaoSocial, criado.cnpjFormatado)).toHaveCount(1);

  await abrirFornecedorNaConsulta(page, criado.razaoSocial, criado.cnpjFormatado, 'Pessoa Jurídica');
  const excluido = await excluirFornecedor(page, {
    tipo: 'Pessoa Jurídica',
    nome: criado.razaoSocial,
    documentoFormatado: criado.cnpjFormatado,
  });

  expect(excluido.nome).toBe(criado.razaoSocial);
  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
  console.log(`[QAAUTO] Ciclo completo concluído: ${excluido.nome}`);
});
