import { expect, test } from '@playwright/test';
import { criarFornecedorPessoaFisica } from '../../../../src/actions/criar-fornecedor-pessoa-fisica.action';
import { excluirFornecedor } from '../../../../src/actions/excluir-fornecedor.action';
import { loginSge } from '../../../../src/helpers';
import {
  abrirFornecedorNaConsulta,
  linhaFornecedor,
  pesquisarFornecedor,
  voltarParaConsultaFornecedor,
} from '../../../../src/helpers/navigation/fornecedor.navigation';
import { baseUrlFornecedor, lerDadosFornecedorPf } from './fornecedor_pf_config';

// Ciclo completo: remove somente o registro criado nesta execução (nome + CPF únicos).
test('cria, consulta e exclui o Fornecedor Pessoa Física QAAUTO criado nesta execução', async ({ page }) => {
  const dados = lerDadosFornecedorPf('dados_fornecedor_pf.json');
  const baseUrl = baseUrlFornecedor();

  await loginSge(page, { baseUrl });
  const criado = await criarFornecedorPessoaFisica(page, dados);

  await voltarParaConsultaFornecedor(page);
  await pesquisarFornecedor(page, criado.nome);
  await expect(linhaFornecedor(page, criado.nome, criado.cpfFormatado)).toHaveCount(1);

  await abrirFornecedorNaConsulta(page, criado.nome, criado.cpfFormatado, 'Pessoa Física');
  const excluido = await excluirFornecedor(page, {
    tipo: 'Pessoa Física',
    nome: criado.nome,
    documentoFormatado: criado.cpfFormatado,
  });

  expect(excluido.nome).toBe(criado.nome);
  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
  console.log(`[QAAUTO] Ciclo completo concluído: ${excluido.nome}`);
});
