import { expect, type Locator, type Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

/** Telas de Configurações > Definições Iniciais > Itens. */
export type ItemConfiguracao =
  | 'Tipo de Categoria'
  | 'Categoria'
  | 'Grupos de Unidade de Medida'
  | 'Unidades de Medida';

const ROTAS: Record<ItemConfiguracao, string> = {
  'Tipo de Categoria': '/tipocategoriageral',
  Categoria: '/categoriageral',
  'Grupos de Unidade de Medida': '/grupounidadedemedida',
  'Unidades de Medida': '/unidadedemedida',
};

/** Navega pelo menu visível até a consulta do item (Configurações > Definições Iniciais > Itens). */
export async function navegarParaItemConfiguracao(page: Page, item: ItemConfiguracao): Promise<void> {
  const nav = page.locator('nav');
  const configuracoes = nav.getByRole('link', { name: /Configurações/ });
  const definicoes = nav.getByRole('link', { name: /Definições Iniciais/ });
  const itens = nav.getByRole('link', { name: /^\s*Itens/ });
  const destino = nav.getByRole('link', { name: item, exact: true });

  await expect(configuracoes).toBeVisible({ timeout: 20000 });

  if (!(await destino.isVisible())) {
    if (!(await itens.isVisible())) {
      if (!(await definicoes.isVisible())) {
        await configuracoes.click();
        await definicoes.waitFor({ state: 'visible' });
      }
      await definicoes.click();
      await itens.waitFor({ state: 'visible' });
    }
    await itens.click();
    await destino.waitFor({ state: 'visible' });
  }

  const rota = ROTAS[item];
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) => new URL(r.url()).pathname.toLowerCase().replace(/\/$/, '') === rota && r.request().method() === 'GET',
      { timeout: 30000 },
    ),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A tela "${item}" retornou HTTP ${resposta.status()}.`);

  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
  const main = page.locator('#main');
  await expect(main.locator('#searchTerm')).toBeVisible();
  await expect(main.getByRole('button', { name: /Adicionar/ })).toBeVisible();
}

/** Abre a consulta do item e pesquisa pelo termo, sincronizando com a resposta da grade. */
export async function pesquisarItemConfiguracao(page: Page, item: ItemConfiguracao, termo: string): Promise<void> {
  await navegarParaItemConfiguracao(page, item);
  const rota = ROTAS[item];
  await page.locator('#main #searchTerm').fill(termo);
  const [resposta] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.toLowerCase().startsWith(`${rota}/indexgrid`), {
      timeout: 15000,
    }),
    page.locator('#main #btnSubmitSearch').click(),
  ]);
  if (!resposta.ok()) throw new Error(`A consulta de "${item}" retornou HTTP ${resposta.status()}.`);
  await waitForSgeLoaders(page);
}

/** Linha da grade (em #main) cuja célula tem exatamente o texto informado. */
export function linhaPorDescricao(page: Page, texto: string): Locator {
  const escapado = texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.locator('#main table tbody tr').filter({
    has: page.locator('td').filter({ hasText: new RegExp(`^\\s*${escapado}\\s*$`) }),
  });
}

/** Modal aberto que contém o formulário indicado (seletor CSS do form). */
export function modalSge(page: Page, seletorFormulario: string): Locator {
  return page.locator('.modal.in', { has: page.locator(seletorFormulario) });
}

/** Alerta SweetAlert visível (ignora o "Aguarde..." de carregamento). */
export function alertaSge(page: Page): Locator {
  return page.locator('.swal2-popup:visible').filter({ hasNotText: 'Aguarde' }).first();
}

/** Responde "Sim" ao alerta de confirmação. */
export async function confirmarAlertaSge(page: Page): Promise<void> {
  await alertaSge(page).getByRole('button', { name: 'Sim', exact: true }).click();
}

/** Aguarda o alerta de retorno, clica em Ok e falha com a mensagem do SGE se não for sucesso. */
export async function concluirAlertaSge(page: Page, contexto: string): Promise<string> {
  const alerta = alertaSge(page);
  const ok = alerta.getByRole('button', { name: /^(Ok|OK)$/ });
  await ok.waitFor({ state: 'visible', timeout: 30000 });
  const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();
  await ok.click();
  await expect(alertaSge(page)).toBeHidden();
  if (!/sucesso/i.test(texto)) throw new Error(`${contexto}: ${texto}`);
  return texto;
}

/** Fecha o modal quando o SGE o mantém aberto após salvar/excluir. */
export async function fecharModalSge(modal: Locator): Promise<void> {
  const fechouSozinho = await modal.waitFor({ state: 'hidden', timeout: 2000 }).then(
    () => true,
    () => false,
  );
  if (!fechouSozinho) {
    await modal.getByRole('button', { name: /Fechar/ }).click();
    await modal.waitFor({ state: 'hidden' });
  }
}

export interface OpcoesSelect2 {
  /** id do <select> (sem #). */
  id: string;
  /** Texto (ou parte dele) da opção; vazio escolhe a primeira disponível. */
  opcao?: string;
  /** Nome do campo, usado nas mensagens de erro. */
  rotulo: string;
  /** Orientação exibida quando a lista está vazia. */
  dicaListaVazia: string;
}

/** Seleciona uma opção de um Select2 e devolve o texto escolhido; falha com erro acionável. */
export async function selecionarOpcaoSelect2(page: Page, { id, opcao, rotulo, dicaListaVazia }: OpcoesSelect2): Promise<string> {
  await page.locator(`#s2id_${id} .select2-choice`).click();
  const lista = page.locator('.select2-drop:visible');
  await lista.locator('li.select2-result-selectable, li.select2-no-results').first().waitFor({ state: 'visible' });
  const opcoes = lista.locator('li.select2-result-selectable');
  const textos = (await opcoes.allInnerTexts()).map((t) => t.trim());
  if (textos.length === 0) throw new Error(`Nenhuma opção disponível em "${rotulo}". ${dicaListaVazia}`);
  if (opcao && !textos.some((t) => t.includes(opcao))) {
    throw new Error(`"${opcao}" não encontrado em "${rotulo}". Opções disponíveis: ${textos.join(' | ')}`);
  }
  const alvo = opcao ? opcoes.filter({ hasText: opcao }).first() : opcoes.first();
  const escolhido = (await alvo.innerText()).trim();
  await alvo.click();
  return escolhido;
}

export interface LoteExclusaoQaauto {
  totalExcluidos: number;
  excluidos: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui, uma a uma, as linhas da primeira página da busca "QAAUTO" usando a exclusão individual informada. */
export async function excluirRegistrosQaauto(
  page: Page,
  item: ItemConfiguracao,
  indiceColunaDescricao: number,
  excluirUm: (descricao: string) => Promise<unknown>,
): Promise<LoteExclusaoQaauto> {
  const resultado: LoteExclusaoQaauto = { totalExcluidos: 0, excluidos: [], falhas: [] };
  const tentados = new Set<string>();

  for (;;) {
    await pesquisarItemConfiguracao(page, item, 'QAAUTO');
    const textos = await page.locator('#main table tbody tr').evaluateAll(
      (linhas, indice) => linhas.map((linha) => (linha.querySelectorAll('td')[indice]?.textContent ?? '').trim()),
      indiceColunaDescricao,
    );
    const pendente = textos.find((texto) => /QAAUTO/i.test(texto) && !tentados.has(texto));
    if (!pendente) break;

    tentados.add(pendente);
    try {
      await excluirUm(pendente);
      resultado.excluidos.push(pendente);
    } catch (erro) {
      resultado.falhas.push({ descricao: pendente, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidos = resultado.excluidos.length;
  return resultado;
}

/** A exclusão em lote só aceita o termo QAAUTO. */
export function exigirTermoQaauto(termo: string): void {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }
}
