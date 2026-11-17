import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const ROTA_CONSELHO = '/conselhoescolar';

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function aguardarCarregamentoConselho(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/**
 * Vigências e membros só são gerenciados na visão Unidade Escolar. Na Secretaria o acesso é
 * Cadastro > Escolas > Escola > botão da chave ("Autenticar Unidade") na linha da escola.
 */
export async function entrarNaUnidadeEscolar(page: Page, escola: string): Promise<void> {
  const unidadeNoTopo = page.locator('header').getByText('Unidade Escolar', { exact: true });
  const unidadeLogada = page.getByTitle('Unidade logada');
  if (await unidadeNoTopo.isVisible()) {
    await expect(unidadeLogada, `A sessão já está na visão Unidade Escolar de outra escola; esperado "${escola}".`)
      .toHaveText(escola);
    return;
  }

  const nav = page.locator('nav');
  await nav.getByRole('link', { name: /^\W*Cadastro\W*$/ }).click();
  await nav.getByRole('link', { name: /^\W*Escolas\W*$/ }).click();
  await nav.locator('a[onclick="CarregarPaginaAjaxIgnorandoVisaoProfessor(\'/escola\')"]').click();

  const conteudo = main(page);
  await expect(conteudo.locator('h4').filter({ hasText: 'Escolas' })).toBeVisible({ timeout: 30000 });
  await conteudo.locator('#searchTerm').fill(escola);
  await conteudo.locator('#btnSubmitSearch').click();
  const linha = conteudo.locator('table tbody tr').filter({
    has: getByRoleSge(page, 'cell', { name: escola, exact: true }),
  });
  await expect(linha, `A escola "${escola}" não foi encontrada em Cadastro > Escolas > Escola.`)
    .toHaveCount(1, { timeout: 20000 });
  await linha.getByTitle('Autenticar Unidade').click();

  // O SGE recusa a autenticação com um aviso (ex.: falta o Grupo de Permissão padrão do perfil
  // Administrador da Escola no tenant); falha na hora com a mensagem dele em vez de esperar o cabeçalho.
  const recusa = page.getByRole('dialog').filter({ hasText: 'Atenção!' }).first();
  await expect
    .poll(async () => (await unidadeNoTopo.isVisible()) || (await recusa.isVisible()), { timeout: 30000 })
    .toBe(true);
  if (await recusa.isVisible()) {
    const motivo = ((await recusa.innerText()) ?? '').replace(/\s+/g, ' ').trim();
    throw new Error(`O SGE recusou autenticar a unidade "${escola}": ${motivo}`);
  }
  await expect(unidadeNoTopo).toBeVisible({ timeout: 30000 });
  await expect(unidadeLogada).toHaveText(escola);
  await aguardarCarregamentoConselho(page);
}

/** Navega pelo menu visível Escola > Conselho Escolar > Conselho (visão Unidade Escolar). */
export async function navegarParaConselhoEscolar(page: Page): Promise<void> {
  await expect(
    page.locator('header').getByText('Unidade Escolar', { exact: true }),
    'Chame entrarNaUnidadeEscolar antes: o Conselho é gerenciado na visão Unidade Escolar.',
  ).toBeVisible({ timeout: 15000 });
  // Uma falha anterior pode ter deixado um modal aberto, que bloqueia o menu; fecha-o antes de navegar.
  const modalAberto = page.locator('.modal:visible');
  if (await modalAberto.count() > 0) {
    await getByRoleSge(modalAberto.last(), 'button', { name: /Cancelar/ }).click();
    await expect(modalAberto).toHaveCount(0, { timeout: 15000 });
  }
  const nav = page.locator('nav');
  // O nome acessível dos itens do menu começa com um glifo de ícone, por isso \W*.
  const escola = nav.getByRole('link', { name: /^\W*Escola\W*$/ });
  const conselhoEscolar = nav.getByRole('link', { name: /^\W*Conselho Escolar\W*$/ });
  const destino = nav.getByRole('link', { name: /^\W*Conselho\W*$/ });

  await aguardarCarregamentoConselho(page);
  if (!await destino.isVisible()) {
    if (!await conselhoEscolar.isVisible()) {
      await escola.waitFor({ state: 'visible', timeout: 15000 });
      await escola.click();
    }
    await conselhoEscolar.waitFor({ state: 'visible', timeout: 15000 });
    await conselhoEscolar.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho.startsWith(ROTA_CONSELHO) && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A tela do Conselho Escolar retornou HTTP ${resposta.status()}.`);

  await aguardarCarregamentoConselho(page);
  await page.locator('#btn-salvar-conselho').waitFor({ state: 'visible', timeout: 30000 });
  await getByRoleSge(main(page), 'button', { name: /Adicionar vigência/i }).waitFor({ state: 'visible', timeout: 15000 });
}

/** Linha da grade de vigências identificada pelas duas datas. */
export function linhaVigencia(page: Page, dataInicio: string, dataFim: string): Locator {
  return main(page).locator('table tbody tr').filter({
    has: getByRoleSge(page, 'cell', { name: dataInicio, exact: true }),
  }).filter({
    has: getByRoleSge(page, 'cell', { name: dataFim, exact: true }),
  });
}

export function tabelaAnexos(page: Page): Locator {
  return page.locator('#tabela-anexos');
}

export function tabelaMembros(page: Page): Locator {
  return page.locator('#tabela-membros');
}

export function botaoExcluirVigencia(page: Page): Locator {
  return page.locator('#btn-excluir-vigencia');
}

export function modalVisivel(page: Page, campo: string): Locator {
  return page.locator('.modal:visible').filter({ has: page.locator(campo) });
}

export interface ContagemVigencia {
  membros: number;
  anexos: number;
}

/**
 * Abre a tela de edição da vigência clicando na linha da grade e espera as tabelas de
 * membros e anexos carregarem as quantidades que a grade informa.
 */
export async function abrirVigencia(page: Page, dataInicio: string, dataFim: string): Promise<ContagemVigencia> {
  await navegarParaConselhoEscolar(page);
  const linha = linhaVigencia(page, dataInicio, dataFim);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const texto = ((await linha.textContent()) ?? '').replace(/\s+/g, ' ');
  const partes = new RegExp(`${dataInicio}\\s*${dataFim}\\s*(\\d+)\\s*(\\d+)`).exec(texto);
  if (!partes) throw new Error(`Não foi possível ler as quantidades de membros e anexos da vigência: "${texto}".`);
  const contagem = { membros: Number(partes[1]), anexos: Number(partes[2]) };

  await getByRoleSge(linha, 'cell', { name: dataInicio, exact: true }).click();
  await botaoExcluirVigencia(page).waitFor({ state: 'visible', timeout: 20000 });
  await aguardarCarregamentoConselho(page);
  const linhasDe = (tabela: Locator): Locator => tabela.locator('tbody tr').filter({
    has: page.getByTitle('Excluir', { exact: true }),
  });
  await expect(linhasDe(tabelaMembros(page))).toHaveCount(contagem.membros, { timeout: 20000 });
  await expect(linhasDe(tabelaAnexos(page))).toHaveCount(contagem.anexos, { timeout: 20000 });
  return contagem;
}

/** Confirma a pergunta "Sim/Não" cujo texto casa com `texto`. */
export async function confirmarPerguntaConselho(page: Page, texto: RegExp): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: texto });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
}

/** Lê e fecha um aviso (sucesso ou recusa) cujo texto casa com `texto`. */
export async function fecharAvisoConselho(page: Page, texto: RegExp): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: texto });
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await dialog.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}
