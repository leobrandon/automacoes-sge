import {expect, type Locator, type Page} from '@playwright/test';
import {isCentroCustosQAAuto} from '../../factories/centro-custos.factory';
import {waitForSgeLoaders} from './common.navigation';

/** Telas de Financeiro > Centro de Custos e Financeiro > Receitas (mesmo padrão de consulta/cadastro). */
export type TelaCentroCustos = 'custo' | 'orcamento' | 'receita';

const telas = {
  custo: {
    rota: '/custo',
    grupo: 'Centro de Custos',
    menu: 'Lançamentos de Custos',
    consulta: /^\s*Custos\s*$/,
    cadastro: /^\s*Cadastro de Custo\s*$/,
    // Colunas (1-based): 1 url oculta, 2 Destinatário, 3 Descrição, 4 Valor, 5 Tipo, 6 Categoria,
    // 7 Subcategoria, 8 Competência, 9 Recorrente, 10 Status, 11 Data.
    colunaDescricao: 3,
    nome: 'Lançamento de Custo',
  },
  orcamento: {
    rota: '/orcamento',
    grupo: 'Centro de Custos',
    menu: 'Orçamentos',
    consulta: /^\s*Previsão Orçamentária\s*$/,
    cadastro: /^\s*Cadastro de Previsão Orçamentária\s*$/,
    // Colunas (1-based): 1 url oculta, 2 Código, 3 Destinatário, 4 Descrição, 5 Exercício, 6 Tipo,
    // 7 Competência Inicial, 8 Competência Final, 9 Status, 10 Vlr. Ajustado, 11 Execução.
    colunaDescricao: 4,
    nome: 'Orçamento',
  },
  receita: {
    rota: '/receita',
    grupo: 'Receitas',
    menu: 'Lançamentos de Receitas',
    consulta: /^\s*Receitas\s*$/,
    cadastro: /^\s*Cadastro de Receita\s*$/,
    // Colunas (1-based): 1 url oculta, 2 Recebimento, 3 Descrição, 4 Destino, 5 Valor, 6 Valor Repassado, 7 Categoria.
    colunaDescricao: 3,
    nome: 'Lançamento de Receita',
  },
} as const;

const LIMITE_BUSCA_SEQUENCIA = 200;
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const textoExato = (t: string) => new RegExp(`^\\s*${escaparRegex(t)}\\s*$`);
const main = (page: Page) => page.locator('#main');

export function tituloConsultaCentroCustos(page: Page, tela: TelaCentroCustos): Locator {
  return main(page).locator('h4').filter({hasText: telas[tela].consulta});
}

export function tituloCadastroCentroCustos(page: Page, tela: TelaCentroCustos): Locator {
  return main(page).locator('h4').filter({hasText: telas[tela].cadastro});
}

/** Abre a consulta pelo menu visível Financeiro > (Centro de Custos | Receitas) > item da tela. */
export async function abrirConsultaCentroCustos(page: Page, tela: TelaCentroCustos): Promise<void> {
  const cfg = telas[tela];
  const titulo = tituloConsultaCentroCustos(page, tela);
  if (await titulo.isVisible()) return;
  await waitForSgeLoaders(page);
  const mensagem = `Menu "Financeiro > ${cfg.grupo} > ${cfg.menu}" não encontrado. Verifique se o usuário tem permissão de consulta.`;
  const nav = page.locator('nav');
  const itemPai = (texto: string) => nav.locator('a').filter({has: page.locator('span.menu-item-parent').filter({hasText: textoExato(texto)})});
  const destino = nav.locator(`a[onclick*="'${cfg.rota}'"]`).filter({hasText: textoExato(cfg.menu)});
  if (!await destino.isVisible()) {
    const grupo = itemPai(cfg.grupo);
    if (!await grupo.isVisible()) {
      const financeiro = itemPai('Financeiro');
      await expect(financeiro, mensagem).toHaveCount(1);
      await financeiro.click();
      await expect(grupo, mensagem).toBeVisible();
    }
    await grupo.click();
  }
  await expect(destino, mensagem).toBeVisible();
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === cfg.rota && x.request().method() === 'GET', {timeout: 30000}),
    destino.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de ${cfg.menu}: HTTP ${r.status()}.`);
  await expect(titulo).toBeVisible();
  await expect(main(page).locator('input[name="searchTerm"]')).toBeVisible();
  await waitForSgeLoaders(page);
}

/** Pesquisa por trecho da descrição e aguarda a grade nova (a anterior é marcada para não ser confundida). */
export async function pesquisarCentroCustos(page: Page, tela: TelaCentroCustos, termo: string): Promise<void> {
  const cfg = telas[tela];
  await abrirConsultaCentroCustos(page, tela);
  const m = main(page);
  await m.locator('input[name="searchTerm"]').fill(termo);
  await m.locator('table').evaluateAll(ts => ts.forEach(t => t.setAttribute('data-grade-anterior', 'true')));
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === `${cfg.rota}/indexgrid`, {timeout: 30000}),
    m.locator('#btnSubmitSearch').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa de ${cfg.menu}: HTTP ${r.status()}.`);
  await waitForSgeLoaders(page);
  await expect(m.locator('table:not([data-grade-anterior])').first()).toBeVisible();
}

/** Linhas da grade cuja descrição é exatamente `descricao` (a pesquisa do SGE é por trecho). */
export function linhasCentroCustos(page: Page, tela: TelaCentroCustos, descricao: string): Locator {
  return main(page)
    .locator('table:not([data-grade-anterior]) tbody tr')
    .filter({has: page.locator(`td:nth-child(${telas[tela].colunaDescricao})`).filter({hasText: textoExato(descricao)})});
}

/** Descrições QAAUTO exibidas na grade atual. */
export async function descricoesQAAutoCentroCustos(page: Page, tela: TelaCentroCustos): Promise<string[]> {
  const celulas = main(page).locator(`table:not([data-grade-anterior]) tbody tr td:nth-child(${telas[tela].colunaDescricao})`);
  return (await celulas.allInnerTexts()).map(t => t.trim()).filter(isCentroCustosQAAuto);
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe. O SGE aceita descrições repetidas,
 * então a sequência livre é o que identifica o registro desta execução. Nada é excluído aqui.
 */
export async function proximaSequenciaLivreCentroCustos(page: Page, tela: TelaCentroCustos, descricaoDe: (sequencia: number) => string, inicio = 1): Promise<number> {
  for (let s = inicio; s < inicio + LIMITE_BUSCA_SEQUENCIA; s++) {
    const descricao = descricaoDe(s);
    await pesquisarCentroCustos(page, tela, descricao);
    if (await linhasCentroCustos(page, tela, descricao).count() === 0) return s;
  }
  throw new Error(`Nenhuma sequência livre de ${telas[tela].nome} nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. Exclua os registros QAAUTO.`);
}

/** Clica em Adicionar na consulta e aguarda o formulário. */
export async function abrirInclusaoCentroCustos(page: Page, tela: TelaCentroCustos): Promise<void> {
  await abrirConsultaCentroCustos(page, tela);
  const m = main(page);
  const adicionar = m.locator('button').filter({hasText: /^\s*Adicionar\s*$/});
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await expect(tituloCadastroCentroCustos(page, tela)).toBeVisible({timeout: 30000});
  await expect(m.locator('#Descricao')).toBeVisible();
  await expect(m.locator('#btnSalvar')).toBeVisible();
  await waitForSgeLoaders(page);
}

/** Pesquisa a descrição exata, exige uma única linha e abre o cadastro dela. */
export async function abrirRegistroCentroCustos(page: Page, tela: TelaCentroCustos, descricao: string): Promise<void> {
  await pesquisarCentroCustos(page, tela, descricao);
  const linhas = linhasCentroCustos(page, tela, descricao);
  const total = await linhas.count();
  if (total !== 1) {
    throw new Error(`Esperado 1 ${telas[tela].nome} "${descricao}" na consulta, encontrado ${total}. Execute a criação antes, ajuste a descrição no JSON ou remova a duplicidade manualmente.`);
  }
  await linhas.locator(`td:nth-child(${telas[tela].colunaDescricao})`).click();
  const m = main(page);
  await expect(tituloCadastroCentroCustos(page, tela)).toBeVisible({timeout: 30000});
  await expect(m.locator('#btn_excluir')).toBeVisible();
  await expect(m.locator('#Descricao')).toHaveValue(descricao);
  await waitForSgeLoaders(page);
}

/** Volta do cadastro para a consulta pelo botão Voltar. */
export async function voltarParaConsultaCentroCustos(page: Page, tela: TelaCentroCustos): Promise<void> {
  await main(page).locator('button').filter({hasText: 'Voltar'}).click();
  await expect(tituloConsultaCentroCustos(page, tela)).toBeVisible({timeout: 30000});
  await waitForSgeLoaders(page);
}

/** Fecha o aviso SweetAlert que contém `texto`. */
export async function fecharAvisoCentroCustos(page: Page, texto: string): Promise<void> {
  const aviso = page.locator('.swal2-popup').filter({hasText: texto});
  await expect(aviso).toBeVisible({timeout: 30000});
  await aviso.getByRole('button', {name: 'Ok', exact: true}).click();
  await expect(page.locator('.swal2-container')).toHaveCount(0);
}

/**
 * Clica em Salvar e exige o aviso de sucesso; validação do formulário ou aviso de atenção vira erro
 * com a mensagem do SGE. Após gravar, o SGE reabre o cadastro (com Excluir e histórico).
 */
export async function salvarCadastroCentroCustos(page: Page, tela: TelaCentroCustos, mensagemSucesso: string): Promise<void> {
  const m = main(page);
  await m.locator('#btnSalvar').click();
  const sucesso = page.locator('.swal2-popup').filter({hasText: mensagemSucesso});
  const validacao = m.locator('.field-validation-error').filter({hasText: /\S/});
  const atencao = page.locator('.swal2-popup').filter({hasText: /Atenção|Erro/});
  await expect(sucesso.or(validacao).or(atencao).first()).toBeVisible({timeout: 30000});
  if (!await sucesso.isVisible()) {
    const mensagens = [...await validacao.allInnerTexts(), ...await atencao.allInnerTexts()].map(t => t.replace(/\s+/g, ' ').trim());
    throw new Error(`O SGE não gravou o ${telas[tela].nome}: ${mensagens.join(' | ')}`);
  }
  await fecharAvisoCentroCustos(page, mensagemSucesso);
  await expect(tituloCadastroCentroCustos(page, tela)).toBeVisible();
  await expect(m.locator('#btn_excluir')).toBeVisible();
  await waitForSgeLoaders(page);
}

/** Exclui o registro aberto: Excluir > confirma "Sim" > aguarda a resposta da exclusão. */
export async function excluirRegistroAbertoCentroCustos(page: Page, tela: TelaCentroCustos): Promise<void> {
  const cfg = telas[tela];
  await main(page).locator('#btn_excluir').click();
  const confirmacao = page.locator('.swal2-popup').filter({hasText: 'Esta ação irá excluir o registro'});
  await expect(confirmacao).toBeVisible();
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === `${cfg.rota}/excluir` && x.request().method() === 'DELETE', {timeout: 30000}),
    confirmacao.getByRole('button', {name: 'Sim', exact: true}).click(),
  ]);
  if (!r.ok()) throw new Error(`Exclusão de ${cfg.nome}: HTTP ${r.status()}.`);
}

/**
 * Seleciona uma opção de Select2 pelo texto visível (o sufixo " - código" é ignorado).
 * Lista vazia ou sem a opção falha com mensagem acionável sobre dados de apoio.
 */
export async function selecionarSelect2CentroCustos(page: Page, id: string, texto: string): Promise<void> {
  await expect(page.locator(`#${id} option:not([value=""])`), `${id}: nenhuma opção carregada. Verifique os dados de apoio do tenant.`).not.toHaveCount(0);
  await page.locator(`#s2id_${id} .select2-choice`).click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results')).first()).toBeVisible();
  const alvo = opcoes.filter({hasText: new RegExp(`^\\s*${escaparRegex(texto)}(\\s+-\\s+\\d+)?\\s*$`)});
  if (await alvo.count() !== 1) {
    const textos = (await opcoes.allInnerTexts()).map(x => x.trim());
    await page.keyboard.press('Escape');
    throw new Error(`${id}: opção "${texto}" ausente ou ambígua. Opções: ${textos.join(' | ') || 'nenhuma'}. Verifique os dados de apoio do tenant.`);
  }
  await alvo.click();
  await expect(drop).toBeHidden();
  await expect(page.locator(`#s2id_${id} .select2-chosen`)).toHaveText(new RegExp(`^\\s*${escaparRegex(texto)}`));
  await waitForSgeLoaders(page);
}

/** Competência `MM/AAAA` pelo calendário de meses do campo (o campo mascarado ignora `fill`). */
export async function selecionarCompetenciaCentroCustos(page: Page, id: string, valor: string): Promise<void> {
  const [mes, ano] = valor.split('/');
  const campo = main(page).locator(`#${id}`);
  // O calendário abre no foco: se o campo já recebeu foco pelo Tab do campo anterior (calendário fechado),
  // o clique não o reabre. Tira o foco antes para o clique disparar a abertura.
  await campo.blur();
  await campo.click();
  const meses = page.locator('.datepicker-dropdown .datepicker-months:visible');
  await expect(meses).toBeVisible();
  const anoExibido = meses.locator('th.datepicker-switch');
  for (let i = 0; i < 100; i++) {
    const atual = Number((await anoExibido.innerText()).trim());
    if (atual === Number(ano)) break;
    const proximo = String(atual < Number(ano) ? atual + 1 : atual - 1);
    await meses.locator(atual < Number(ano) ? 'th.next' : 'th.prev').click();
    await expect(anoExibido).toHaveText(proximo);
  }
  await expect(anoExibido).toHaveText(ano);
  await meses.locator('span.month').filter({hasText: textoExato(MESES[Number(mes) - 1])}).click();
  await expect(meses).toBeHidden();
  await expect(campo).toHaveValue(valor);
}

/** Campo monetário com máscara: digita só os dígitos e confere o valor formatado. */
export async function preencherValorCentroCustos(page: Page, id: string, valor: string): Promise<void> {
  const campo = main(page).locator(`#${id}`);
  await campo.click();
  await campo.pressSequentially(valor.replace(/\D/g, ''));
  await expect(campo).toHaveValue(valor);
}
