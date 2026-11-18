import { expect, test, type Page } from '@playwright/test';
import { cancelarOcorrenciaSaudeColaborador, criarOcorrenciaSaudeColaborador } from '../../../src/actions';
import type { OpcoesOcorrenciaSaudeColaborador } from '../../../src/factories/ocorrencia-saude-colaborador.factory';
import { abrirConsultaOcorrenciaSaudeColaborador } from '../../../src/helpers/navigation/ocorrencia-saude-colaborador.navigation';

const DIA = 86_400_000;

function dataDaConsulta(data: string): number {
  const [dia, mes, ano] = data.split('/');
  const instante = Date.parse(`${ano}-${mes}-${dia}T00:00:00Z`);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data) || !Number.isFinite(instante)) {
    throw new Error(`Data de ocorrência inválida na consulta: "${data}".`);
  }
  return instante;
}

export async function pesquisarOcorrenciasDoColaborador(page: Page, colaborador: string): Promise<void> {
  await abrirConsultaOcorrenciaSaudeColaborador(page);
  const main = page.locator('#main');
  const tabela = main.locator('table');
  const tabelaAnterior = await tabela.elementHandle();
  await main.locator('#searchTerm').fill(colaborador);
  await main.locator('#btn-search').click();
  await page.waitForFunction((elemento) => !elemento.isConnected, tabelaAnterior, { timeout: 10000 });
  await expect(tabela).toBeVisible();
}

export async function avancarPaginaDeOcorrencias(page: Page): Promise<boolean> {
  const paginacao = page.locator('#main .pagination');
  const proxima = paginacao.locator('li.next:not(.disabled)').getByRole('link', { name: 'Próxima' });
  if (!await proxima.isVisible()) return false;
  const paginaAtual = paginacao.locator('li.active');
  const numeroAtual = Number(await paginaAtual.innerText());
  await proxima.click();
  await expect(paginaAtual).toHaveText(String(numeroAtual + 1));
  return true;
}

export async function encontrarDataLivreParaRascunho(
  page: Page,
  dados: Required<OpcoesOcorrenciaSaudeColaborador>,
): Promise<string> {
  await pesquisarOcorrenciasDoColaborador(page, dados.colaborador);
  const main = page.locator('#main');
  const linhas = main.locator('table tbody tr:visible');
  const periodos = [];
  do {
    const daPagina = await linhas.evaluateAll((elementos, colaborador) =>
      elementos.map((elemento) => Array.from((elemento as HTMLTableRowElement).cells, (celula) => celula.innerText.trim()))
        .filter((celulas) => celulas[2] === colaborador && celulas[7] !== 'Cancelada')
        .map((celulas) => ({ inicio: celulas[5], fim: celulas[6] })), dados.colaborador);
    periodos.push(...daPagina.map(({ inicio, fim }) => ({ inicio: dataDaConsulta(inicio), fim: dataDaConsulta(fim) })));
  } while (await avancarPaginaDeOcorrencias(page));

  let inicioLivre = dataDaConsulta(dados.dataInicio);
  const duracao = Math.max(dados.totalDias, 1) * DIA;
  for (const periodo of periodos.sort((a, b) => a.inicio - b.inicio)) {
    if (periodo.inicio >= inicioLivre + duracao) break;
    inicioLivre = Math.max(inicioLivre, periodo.fim + DIA);
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(inicioLivre);
}

export async function criarECancelarRascunhoDeTeste(
  page: Page,
  dados: Required<OpcoesOcorrenciaSaudeColaborador>,
): Promise<void> {
  let idCriado: string | undefined;
  let criacaoConcluida = false;
  try {
    await test.step('Cadastrar e conferir o rascunho', () => criarOcorrenciaSaudeColaborador(page, dados, (id) => {
      idCriado = id;
    }));
    criacaoConcluida = true;
  } finally {
    if (idCriado !== undefined) {
      const id = idCriado;
      try {
        await test.step(`Cancelar a ocorrência ${id}`, () => cancelarOcorrenciaSaudeColaborador(page, id, dados.motivoCancelamento));
      } catch (erro) {
        if (criacaoConcluida) throw erro;
        await test.info().attach('Falha ao cancelar o rascunho', {
          body: erro instanceof Error ? (erro.stack ?? erro.message) : String(erro),
          contentType: 'text/plain',
        });
      }
    }
  }
}
