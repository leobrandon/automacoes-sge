import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  buildCategoriaDaTurma,
  obterDescricaoBaseCategoriaDaTurma,
} from '../../../src/factories/categoria-da-turma.factory';
import { loginSge } from '../../../src/helpers/navigation/common.navigation';
import {
  linhaCategoriaDaTurma,
  navegarParaAdicionarCategoriaDaTurma,
  pesquisarCategoriaDaTurma,
} from '../../../src/helpers/navigation/categoria-da-turma.navigation';

interface ConfiguracaoCategoriaDaTurma {
  quantidade?: number | string;
  descricao?: string;
}

interface ConfiguracaoNormalizadaCategoriaDaTurma {
  quantidade: number;
  descricao?: string;
}

function lerConfiguracao(): ConfiguracaoNormalizadaCategoriaDaTurma {
  const caminhoJson = path.resolve(__dirname, 'dados_categoria_da_turma.json');
  const conteudo = JSON.parse(fs.readFileSync(caminhoJson, 'utf-8')) as unknown;
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error('dados_categoria_da_turma.json deve conter um objeto JSON.');
  }

  const configuracao = conteudo as ConfiguracaoCategoriaDaTurma;
  const quantidadeEmBranco = configuracao.quantidade === undefined
    || (typeof configuracao.quantidade === 'string' && configuracao.quantidade.trim() === '');
  if (!quantidadeEmBranco && typeof configuracao.quantidade !== 'number' && typeof configuracao.quantidade !== 'string') {
    throw new Error('"quantidade" em dados_categoria_da_turma.json deve ser um número inteiro positivo.');
  }
  const quantidade = quantidadeEmBranco
    ? 1
    : Number(configuracao.quantidade);

  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" em dados_categoria_da_turma.json deve ser um inteiro positivo.');
  }
  if (configuracao.descricao !== undefined && typeof configuracao.descricao !== 'string') {
    throw new Error('"descricao" em dados_categoria_da_turma.json deve ser texto.');
  }

  return { ...configuracao, quantidade };
}

test.describe('Cadastro > Categoria da Turma', () => {
  test('cria uma categoria de turma', async ({ page }) => {
    const configuracao = lerConfiguracao();
    const descricaoBase = obterDescricaoBaseCategoriaDaTurma(configuracao.descricao);
    test.setTimeout(Math.max(120000, configuracao.quantidade * 60000));

    await loginSge(page);

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const categoria = buildCategoriaDaTurma({ descricao: descricaoBase }, sequencia);
      console.log(`\n🚀 Criando Categoria da Turma [${sequencia} de ${configuracao.quantidade}]: "${categoria.descricao}"`);

      await navegarParaAdicionarCategoriaDaTurma(page);
      const formulario = page.locator('#modalEditar');
      await formulario.locator('#Descricao').fill(categoria.descricao);
      await formulario.locator('#btn-save').click();

      const confirmacao = page.locator('.swal2-popup:visible');
      await expect(confirmacao).toContainText(/sucesso/i);
      await confirmacao.getByRole('button', { name: /^(Ok|OK)$/ }).click();

      await pesquisarCategoriaDaTurma(page, categoria.descricao);
      await expect(linhaCategoriaDaTurma(page, categoria.descricao)).toBeVisible();
      console.log(`✅ Categoria da Turma criada: "${categoria.descricao}"`);
    }
  });
});
