import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { getByRoleSge, loginSge, waitForSgeLoaders } from '../../../../src/helpers';

interface ConfiguracaoExclusao {
  excluirSomenteDescricoesConfiguradas: boolean;
  descricoes: string[];
}

function lerConfiguracao(): ConfiguracaoExclusao {
  const arquivo = path.resolve(__dirname, 'dados_exclusao_tipo_estrutura_curricular.json');
  const conteudo: unknown = JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error('dados_exclusao_tipo_estrutura_curricular.json deve conter um objeto JSON.');
  }

  const config = conteudo as Partial<ConfiguracaoExclusao>;
  if (config.excluirSomenteDescricoesConfiguradas !== true) {
    throw new Error('A exclusão exige excluirSomenteDescricoesConfiguradas=true.');
  }
  if (!Array.isArray(config.descricoes) || config.descricoes.length === 0
    || config.descricoes.some((descricao) => typeof descricao !== 'string' || !/^QAAUTO\b/i.test(descricao.trim()))) {
    throw new Error('Informe descrições QAAUTO explícitas em "descricoes".');
  }
  const descricoes = config.descricoes.map((descricao) => descricao.trim());
  if (new Set(descricoes.map((descricao) => descricao.toLocaleLowerCase('pt-BR'))).size !== descricoes.length) {
    throw new Error('A lista de exclusão contém descrições duplicadas.');
  }
  return { excluirSomenteDescricoesConfiguradas: true, descricoes };
}

function urlSandbox(): string {
  const baseUrl = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';
  return baseUrl;
}

async function abrirConsulta(page: Parameters<typeof loginSge>[0]): Promise<void> {
  const nav = page.locator('nav');
  // O ícone de edição identifica o Cadastro principal no snapshot do menu lateral.
  const nomeCadastro = /^\s*\uF044\s*Cadastro(?:\s|$)/;
  const cadastro = getByRoleSge(nav, 'link', { name: nomeCadastro });
  const itemCadastro = nav.locator('li').filter({ has: getByRoleSge(page, 'link', { name: nomeCadastro }) });
  const ensino = getByRoleSge(itemCadastro, 'link', { name: /^Ensino(?:\s|$)/ });
  const destino = getByRoleSge(itemCadastro, 'link', { name: 'Tipo de Estrutura Curricular', exact: true });

  await expect(cadastro).toHaveCount(1);
  await expect(cadastro).toBeVisible();
  if (!await ensino.isVisible()) {
    console.log('[QAAUTO] Abrindo o menu Cadastro...');
    await cadastro.click();
  }
  await expect(ensino).toBeVisible();
  if (!await destino.isVisible()) {
    console.log('[QAAUTO] Abrindo Cadastro > Ensino...');
    await ensino.click();
  }
  await expect(destino).toBeVisible();
  await destino.click();
  await waitForSgeLoaders(page);
  await expect(getByRoleSge(page, 'heading', { name: /Consulta de tipos de estrutura curricular/i })).toBeVisible();
  await expect(page.locator('#adicionarTipoEstruturaCurricular')).toBeVisible();
}

async function pesquisar(page: Parameters<typeof loginSge>[0], descricao: string): Promise<void> {
  const campo = page.locator('#main #SearchTerm');
  await expect(campo).toBeVisible();
  await campo.fill(descricao);
  const busca = page.locator('#main #searchForm button').filter({ hasNotText: /Adicionar/i });
  await expect(busca).toHaveCount(1);
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR').endsWith('/tipoestruturacurricular/indexgrid')
        && response.request().method() === 'GET';
    }),
    busca.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A consulta retornou HTTP ${resposta.status()}.`);
  await waitForSgeLoaders(page);
}

function linhaTipoEstruturaCurricular(page: Parameters<typeof loginSge>[0], descricao: string) {
  return page.locator('#main table tbody tr').filter({
    has: page.getByText(descricao, { exact: true }),
  });
}

test('exclui somente os tipos de estrutura curricular QAAUTO listados no JSON', async ({ page }) => {
  const config = lerConfiguracao();
  const baseUrl = urlSandbox();

  await loginSge(page, { baseUrl });
  await abrirConsulta(page);

  for (const descricao of config.descricoes) {
    console.log(`[QAAUTO] Registro indicado para exclusão: ${descricao}`);
    await pesquisar(page, descricao);
    const linha = linhaTipoEstruturaCurricular(page, descricao);
    await expect(linha).toHaveCount(1);
    await expect(linha.locator('td').first()).toHaveText(descricao);

    // A ação é um <a title="Excluir"> sem href, portanto não possui o papel link.
    const excluir = linha.getByTitle('Excluir', { exact: true });
    await expect(excluir).toHaveCount(1);
    await expect(excluir).toBeVisible();
    await excluir.click();

    const confirmacao = page.locator('.swal2-popup:visible');
    await expect(confirmacao.getByText('Deseja realmente excluir o tipo da estrutura curricular?', { exact: true }))
      .toBeVisible();
    await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

    const retorno = page.locator('.swal2-popup:visible');
    await expect(retorno).toContainText(/sucesso/i);
    const mensagem = await retorno.innerText();
    if (!/sucesso/i.test(mensagem)) throw new Error(`A exclusão de "${descricao}" não foi confirmada: ${mensagem}`);
    await retorno.getByRole('button', { name: /^(Ok|OK)$/ }).click();

    await pesquisar(page, descricao);
    await expect(linhaTipoEstruturaCurricular(page, descricao)).toHaveCount(0);
    console.log(`[QAAUTO] Registro excluído com sucesso e ausente da consulta: ${descricao}`);
  }

  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
  console.log(`[QAAUTO] Exclusão concluída: ${config.descricoes.length} tipo(s) de estrutura curricular.`);
});
