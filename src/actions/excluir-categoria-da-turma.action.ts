import type { Page } from '@playwright/test';
import {
  linhaCategoriaDaTurma,
  pesquisarCategoriaDaTurma,
} from '../helpers/navigation/categoria-da-turma.navigation';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';

export interface CategoriaDaTurmaExcluida {
  descricao: string;
  url: string;
}

export interface LoteExclusaoCategoriaDaTurmaResultado {
  totalExcluidas: number;
  categoriasExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui uma categoria encontrada por sua descrição exata e única na grade. */
export async function excluirCategoriaDaTurma(
  page: Page,
  descricao: string,
): Promise<CategoriaDaTurmaExcluida> {
  const descricaoAlvo = descricao.trim();
  if (!descricaoAlvo) throw new Error('Informe a descrição exata da Categoria da Turma.');

  console.log(`\n🧹 Categoria da Turma a ser excluída: "${descricaoAlvo}"`);
  await pesquisarCategoriaDaTurma(page, descricaoAlvo);
  const linha = linhaCategoriaDaTurma(page, descricaoAlvo);
  await linha.waitFor({ state: 'visible' });
  if (await linha.count() !== 1) {
    throw new Error('A exclusão requer exatamente uma Categoria da Turma com essa descrição na grade.');
  }

  // Busca os links na coluna de acoes desta linha: editar primeiro, lixeira em segundo.
  const linksDaColunaAcoes = linha.locator('td').last().locator('a');
  const quantidadeAcoes = await linksDaColunaAcoes.count();
  if (quantidadeAcoes !== 2) {
    throw new Error(`Esperados dois links na coluna de acoes; encontrados ${quantidadeAcoes}.`);
  }

  const lixeira = linksDaColunaAcoes.nth(1);
  const descricaoDaLinhaDaLixeira = (await lixeira.locator('xpath=ancestor::tr[1]').locator('td').first().innerText()).trim();
  if (descricaoDaLinhaDaLixeira !== descricaoAlvo) {
    throw new Error(`O link identificado não pertence à Categoria da Turma "${descricaoAlvo}".`);
  }
  await lixeira.click();
  const alerta = page.locator('.swal2-popup:visible');
  await alerta.getByRole('button', { name: 'Sim', exact: true }).click();
  const botaoOk = alerta.getByRole('button', { name: /^(Ok|OK)$/ });
  await botaoOk.waitFor({ state: 'visible' });
  const feedback = await alerta.innerText();
  await botaoOk.click();
  if (!/sucesso/i.test(feedback)) throw new Error(`Exclusão não confirmada: ${feedback}`);

  await pesquisarCategoriaDaTurma(page, descricaoAlvo);
  await linha.waitFor({ state: 'hidden' });
  console.log(`✅ Categoria da Turma excluída e ausente da consulta: "${descricaoAlvo}"`);
  return { descricao: descricaoAlvo, url: page.url() };
}

async function avancarPaginaDaGrade(page: Page): Promise<boolean> {
  const proxima = page.getByRole('link', { name: 'Próxima', exact: true });
  if (!await proxima.isVisible().catch(() => false)) return false;

  const desabilitada = await proxima.evaluate((elemento) => {
    const link = elemento as HTMLAnchorElement;
    const item = link.closest('li');
    return link.getAttribute('aria-disabled') === 'true'
      || link.hasAttribute('disabled')
      || link.classList.contains('disabled')
      || item?.classList.contains('disabled') === true
      || item?.getAttribute('aria-disabled') === 'true';
  });
  if (desabilitada) return false;

  const marcador = async (): Promise<string> => {
    const info = page.locator('#main .dataTables_info, #main [role="status"]').first();
    const textoInfo = await info.innerText().catch(() => '');
    const paginaAtiva = await page.locator('#main .pagination .active, #main .paginate_button.current')
      .first().innerText().catch(() => '');
    const primeiraLinha = await page.locator('#main table tbody tr').first().innerText().catch(() => '');
    return `${textoInfo}|${paginaAtiva}|${primeiraLinha}`;
  };

  const antes = await marcador();
  await Promise.all([
    page.waitForResponse((resposta) => {
      const caminho = new URL(resposta.url()).pathname.toLowerCase();
      return caminho.includes('/categoriadaturma/indexgrid') && resposta.request().method() === 'GET';
    }, { timeout: 15000 }).catch(() => undefined),
    proxima.click(),
  ]);
  await waitForSgeLoaders(page);
  return (await marcador()) !== antes;
}

/** Exclui as categorias cuja descrição contém QAAUTO, usando somente a grade visível do SGE. */
export async function excluirCategoriasDaTurmaEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<LoteExclusaoCategoriaDaTurmaResultado> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote de Categoria da Turma aceita somente o termo QAAUTO.');
  }

  const resultado: LoteExclusaoCategoriaDaTurmaResultado = {
    totalExcluidas: 0,
    categoriasExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();
  const termoNormalizado = termo.toLocaleUpperCase('pt-BR');

  await pesquisarCategoriaDaTurma(page, termo);

  while (true) {
    const linhas = page.locator('#main table tbody tr');
    const quantidadeLinhas = await linhas.count();
    let descricaoPendente: string | undefined;

    for (let indice = 0; indice < quantidadeLinhas; indice++) {
      const descricao = (await linhas.nth(indice).locator('td').first().innerText().catch(() => '')).trim();
      if (descricao.toLocaleUpperCase('pt-BR').includes(termoNormalizado) && !tentadas.has(descricao)) {
        descricaoPendente = descricao;
        break;
      }
    }

    if (descricaoPendente) {
      tentadas.add(descricaoPendente);
      try {
        await excluirCategoriaDaTurma(page, descricaoPendente);
        resultado.categoriasExcluidas.push(descricaoPendente);
      } catch (erro) {
        resultado.falhas.push({
          descricao: descricaoPendente,
          motivo: erro instanceof Error ? erro.message : String(erro),
        });
      }
      await pesquisarCategoriaDaTurma(page, termo);
      continue;
    }

    if (!await avancarPaginaDaGrade(page)) break;
  }

  resultado.totalExcluidas = resultado.categoriasExcluidas.length;
  return resultado;
}
