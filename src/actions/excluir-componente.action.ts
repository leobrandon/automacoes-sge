import type { Page } from '@playwright/test';
import { isComponenteQAAuto } from '../factories/componente.factory';
import {
  aguardarCarregamentoComponentes,
  aguardarAtualizacaoGradeComponentes,
  linhaComponente,
  marcadorGradeComponentes,
  indiceColunaNomeComponente,
  navegarParaConsultaComponentes,
  pesquisarComponente,
} from '../helpers/navigation/componente.navigation';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';

export interface ComponenteExcluido {
  nome: string;
  url: string;
}

export interface LoteExclusaoComponenteResultado {
  totalEncontrados: number;
  totalExcluidos: number;
  componentesExcluidos: string[];
  falhas: Array<{ nome: string; motivo: string }>;
}

async function confirmarExclusao(page: Page, nome: string): Promise<void> {
  const modal = page.locator(
    '.swal2-popup:visible, #MsgBoxBack:visible, .divMessageBox:visible, .MessageBoxContainer:visible, [role="dialog"]:visible',
  ).last();
  await modal.waitFor({ state: 'visible', timeout: 15000 });
  const mensagem = (await modal.innerText()).trim();
  if (!/excluir|remover|apagar|tem certeza/i.test(mensagem)) {
    throw new Error(`A confirmação de exclusão apresentou conteúdo inesperado: ${mensagem}`);
  }

  const confirmar = modal.getByRole('button', { name: /^(Sim|Excluir|Confirmar)$/i }).first();
  await confirmar.waitFor({ state: 'visible', timeout: 10000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/+$/, '');
      return caminho === '/disciplina/excluir' && response.request().method() === 'DELETE';
    }, { timeout: 30000 }),
    confirmar.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A exclusão de "${nome}" retornou HTTP ${resposta.status()}.`);

  await waitForSgeLoaders(page);
  await aguardarCarregamentoComponentes(page);
  const feedback = page.locator('.swal2-popup:visible').first();
  if (await feedback.isVisible().catch(() => false)) {
    const texto = (await feedback.innerText().catch(() => '')).trim();
    if (/erro|falha|não foi possível|não foi exclu/i.test(texto)) {
      const okErro = feedback.getByRole('button', { name: /^(Ok|OK)$/ }).first();
      if (await okErro.isVisible().catch(() => false)) await okErro.click();
      throw new Error(`O SGE não confirmou a exclusão: ${texto}`);
    }
    const ok = feedback.getByRole('button', { name: /^(Ok|OK)$/ }).first();
    if (await ok.isVisible().catch(() => false)) await ok.click();
  }
}

/** Exclui somente o registro QAAUTO encontrado por nome exato e único na grade. */
export async function excluirComponente(page: Page, nome: string): Promise<ComponenteExcluido> {
  const alvo = nome.trim();
  if (!isComponenteQAAuto(alvo)) {
    throw new Error('A exclusão automatizada está limitada a nomes iniciados por QAAUTO.');
  }

  console.log(`\n🧹 Componente QAAUTO a ser excluído: "${alvo}"`);
  await pesquisarComponente(page, alvo);
  const linha = linhaComponente(page, alvo);
  await linha.waitFor({ state: 'visible', timeout: 15000 });
  if (await linha.count() !== 1) {
    throw new Error(`A exclusão exata requer uma linha para "${alvo}"; encontradas ${await linha.count()}.`);
  }

  const celulaNome = linha.locator('td').filter({ hasText: alvo }).first();
  const nomeNaLinha = (await celulaNome.innerText()).replace(/\s+/g, ' ').trim();
  if (nomeNaLinha.toLocaleUpperCase('pt-BR') !== alvo.toLocaleUpperCase('pt-BR')) {
    throw new Error(`A linha localizada não pertence ao Componente "${alvo}".`);
  }
  await celulaNome.click();
  await page.locator('#main').getByRole('heading', { name: /Editar Componente/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  const nomeDoFormulario = (await page.locator('#form_disciplina #Nome').inputValue()).trim();
  if (nomeDoFormulario.toLocaleUpperCase('pt-BR') !== alvo.toLocaleUpperCase('pt-BR')) {
    throw new Error(`O formulário aberto pertence a "${nomeDoFormulario}", não a "${alvo}".`);
  }

  await page.locator('#btn_excluir').click();
  await confirmarExclusao(page, alvo);
  await navegarParaConsultaComponentes(page);
  await pesquisarComponente(page, alvo);
  await linha.waitFor({ state: 'hidden', timeout: 15000 });
  return { nome: alvo, url: page.url() };
}

async function avancarPaginaDaGrade(page: Page): Promise<boolean> {
  const proxima = page.locator('#main a:visible').filter({ hasText: /^\s*Próxima\s*$/ }).first();
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

  const antes = await marcadorGradeComponentes(page);
  await proxima.click();
  await aguardarCarregamentoComponentes(page);
  await aguardarAtualizacaoGradeComponentes(page, antes);
  return true;
}

/** Exclui pela interface os Componentes cujo nome começa com QAAUTO. */
export async function excluirComponentesEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<LoteExclusaoComponenteResultado> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote de Componentes aceita somente o termo "QAAUTO".');
  }

  const resultado: LoteExclusaoComponenteResultado = {
    totalEncontrados: 0,
    totalExcluidos: 0,
    componentesExcluidos: [],
    falhas: [],
  };
  const tentados = new Set<string>();
  // A busca visível do SGE retorna os registros QAAUTO ao pesquisar por "qa".
  // A validação local abaixo restringe as exclusões ao prefixo QAAUTO.
  const termoPesquisa = 'qa';
  await pesquisarComponente(page, termoPesquisa);

  while (true) {
    const linhas = page.locator('#main table:visible tbody tr:visible');
    const indiceNome = await indiceColunaNomeComponente(page);
    let nomePendente: string | undefined;

    for (let indice = 0; indice < await linhas.count(); indice++) {
      const nome = (await linhas.nth(indice).locator('td').nth(indiceNome).innerText().catch(() => '')).trim();
      if (isComponenteQAAuto(nome) && !tentados.has(nome)) {
        nomePendente = nome;
        break;
      }
    }

    if (nomePendente) {
      tentados.add(nomePendente);
      resultado.totalEncontrados++;
      try {
        await excluirComponente(page, nomePendente);
        resultado.componentesExcluidos.push(nomePendente);
      } catch (erro) {
        resultado.falhas.push({
          nome: nomePendente,
          motivo: erro instanceof Error ? erro.message : String(erro),
        });
      }
      await pesquisarComponente(page, termoPesquisa);
      continue;
    }

    if (!await avancarPaginaDaGrade(page)) break;
  }

  resultado.totalExcluidos = resultado.componentesExcluidos.length;
  return resultado;
}
