import type { Locator, Page } from '@playwright/test';
import { isComposicaoEnsinoQAAuto } from '../factories/composicao-ensino.factory';
import {
  linhaComposicaoEnsino,
  navegarParaConsultaComposicaoEnsino,
  pesquisarComposicaoEnsino,
} from '../helpers/navigation/composicao-ensino.navigation';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';

export interface ComposicaoEnsinoExcluida {
  descricao: string;
  url: string;
}

export interface LoteExclusaoComposicaoEnsinoResultado {
  totalExcluidas: number;
  composicoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

function textoCelulaDescricao(linha: Locator): Locator {
  return linha.locator('td:visible').first();
}

async function confirmarExclusao(page: Page): Promise<void> {
  // O botão Excluir abre o SmartMessageBox legado, não um popup SweetAlert2.
  const confirmacao = page.locator('#MsgBoxBack, .divMessageBox, .MessageBoxContainer').first();
  await confirmacao.waitFor({ state: 'visible', timeout: 15000 });
  const botaoSim = page.locator(
    '#bot2-Msg1, #MsgBoxBack button:has-text("Sim"), .MessageBoxButtonSection button:has-text("Sim"), button.botTempo:has-text("Sim")',
  ).first();
  await botaoSim.waitFor({ state: 'visible', timeout: 10000 });
  await botaoSim.click();
  await confirmacao.waitFor({ state: 'hidden', timeout: 15000 });
}

/** Exclui uma composição marcada QAAUTO identificada por descrição exata e única. */
export async function excluirComposicaoEnsino(
  page: Page,
  descricao: string,
): Promise<ComposicaoEnsinoExcluida> {
  const alvo = descricao.trim();
  if (!isComposicaoEnsinoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada está limitada a descrições que contenham QAAUTO.');
  }

  await pesquisarComposicaoEnsino(page, alvo);
  const linha = linhaComposicaoEnsino(page, alvo);
  await linha.waitFor({ state: 'visible', timeout: 15000 });
  const quantidade = await linha.count();
  if (quantidade !== 1) {
    throw new Error(`A exclusão exata requer uma linha para "${alvo}"; encontradas ${quantidade}.`);
  }

  await textoCelulaDescricao(linha).click();
  const formulario = page.locator('#main');
  await formulario.getByRole('heading', { name: /Editar Composição de Ensino/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  const descricaoDoFormulario = (await formulario.locator('#Descricao').inputValue()).trim();
  if (descricaoDoFormulario.toLocaleUpperCase('pt-BR') !== alvo.toLocaleUpperCase('pt-BR')) {
    throw new Error(`O formulário aberto pertence a "${descricaoDoFormulario}", não a "${alvo}".`);
  }

  await formulario.getByRole('button', { name: /Excluir/i, includeHidden: true }).click();
  await confirmarExclusao(page);
  await waitForSgeLoaders(page);

  const tituloConsulta = formulario.getByRole('heading', { name: /Consulta de Composição de Ensino/i, includeHidden: true });
  if (!await tituloConsulta.isVisible().catch(() => false)) {
    const voltar = formulario.getByRole('button', { name: /Voltar/i, includeHidden: true });
    if (await voltar.isVisible().catch(() => false)) {
      // O SGE pode substituir #main enquanto o clique AJAX de Voltar termina.
      const [resposta] = await Promise.all([
        page.waitForResponse((response) => {
          const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
          return caminho === '/composicaoensino/index' && response.request().method() === 'GET';
        }, { timeout: 20000 }),
        voltar.click({ timeout: 5000 }).catch(() => undefined),
      ]);
      if (!resposta.ok()) {
        throw new Error(`O retorno à consulta de Composição de Ensino retornou HTTP ${resposta.status()}.`);
      }
    }
  }

  await tituloConsulta.waitFor({ state: 'visible', timeout: 20000 });
  await pesquisarComposicaoEnsino(page, alvo);
  await linha.waitFor({ state: 'hidden', timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

async function avancarPaginaDaGrade(page: Page): Promise<boolean> {
  const proxima = page.locator('#main').getByRole('link', { name: 'Próxima', exact: true, includeHidden: true });
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
  await proxima.click();
  await waitForSgeLoaders(page);
  return (await marcador()) !== antes;
}

/** Limpa pela grade apenas registros cuja descrição contenha o termo QAAUTO. */
export async function excluirComposicoesEnsinoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<LoteExclusaoComposicaoEnsinoResultado> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo "QAAUTO".');
  }

  const resultado: LoteExclusaoComposicaoEnsinoResultado = {
    totalExcluidas: 0,
    composicoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();
  await pesquisarComposicaoEnsino(page, 'QAAUTO');

  while (true) {
    const linhas = page.locator('#main table tbody tr');
    let descricaoPendente: string | undefined;

    for (let indice = 0; indice < await linhas.count(); indice++) {
      const descricao = (await textoCelulaDescricao(linhas.nth(indice)).innerText().catch(() => '')).trim();
      if (isComposicaoEnsinoQAAuto(descricao) && !tentadas.has(descricao)) {
        descricaoPendente = descricao;
        break;
      }
    }

    if (descricaoPendente) {
      tentadas.add(descricaoPendente);
      try {
        await excluirComposicaoEnsino(page, descricaoPendente);
        resultado.composicoesExcluidas.push(descricaoPendente);
      } catch (erro) {
        resultado.falhas.push({
          descricao: descricaoPendente,
          motivo: erro instanceof Error ? erro.message : String(erro),
        });
      }
      await pesquisarComposicaoEnsino(page, 'QAAUTO');
      continue;
    }

    if (!await avancarPaginaDaGrade(page)) break;
  }

  resultado.totalExcluidas = resultado.composicoesExcluidas.length;
  return resultado;
}
