import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { getByRoleSge, loginSge, waitForSgeLoaders } from '../../../../src/helpers';

interface ConfiguracaoCriacao {
  quantidade: number;
  descricao: string;
}

function lerConfiguracao(): ConfiguracaoCriacao {
  const arquivo = path.resolve(__dirname, 'dados_tipo_estrutura_curricular.json');
  const conteudo: unknown = JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error('dados_tipo_estrutura_curricular.json deve conter um objeto JSON.');
  }

  const config = conteudo as Partial<ConfiguracaoCriacao>;
  const quantidade = config.quantidade === undefined ? 1 : Number(config.quantidade);
  const descricao = typeof config.descricao === 'string' ? config.descricao.trim() : '';
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo.');
  }
  if (!/^QAAUTO\b/i.test(descricao)) {
    throw new Error('"descricao" deve começar com QAAUTO.');
  }
  return { quantidade, descricao };
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

test('cria e consulta tipos de estrutura curricular QAAUTO no sandbox', async ({ page }) => {
  const config = lerConfiguracao();
  const baseUrl = urlSandbox();
  const descricoes = Array.from({ length: config.quantidade }, (_, indice) => `${config.descricao} ${indice + 1}`);

  await loginSge(page, { baseUrl });
  await abrirConsulta(page);

  for (const descricao of descricoes) {
    console.log(`[QAAUTO] Registro que será criado: ${descricao}`);
    await page.locator('#adicionarTipoEstruturaCurricular').click();
    const modal = page.locator('#modalTipoEstruturaCurricular');
    const campoDescricao = modal.locator('#Descricao');
    await expect(campoDescricao).toBeVisible();
    await campoDescricao.fill(descricao);
    await modal.locator('#botaoSalvarTipoEstruturaCurricular').click();

    const retorno = page.locator('.swal2-popup:visible');
    await expect(retorno).toContainText(/sucesso/i);
    const mensagem = await retorno.innerText();
    await retorno.getByRole('button', { name: /^(Ok|OK)$/ }).click();

    await pesquisar(page, descricao);
    const linha = linhaTipoEstruturaCurricular(page, descricao);
    await expect(linha).toHaveCount(1);
    await expect(linha.locator('td').first()).toHaveText(descricao);
    console.log(`[QAAUTO] Registro criado com sucesso e conferido na consulta: ${descricao}`);
  }

  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
  console.log(`[QAAUTO] Criação concluída: ${descricoes.length} tipo(s) de estrutura curricular.`);
});
