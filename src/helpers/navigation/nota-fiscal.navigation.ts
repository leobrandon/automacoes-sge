import {expect, type Page, type Locator} from '@playwright/test';
import {getByRoleSge} from '../sge-locators.helper';
import {type NotaFiscalMontada, type NotaFiscalOpcoes, numeroInicialNotaFiscal} from '../../factories/nota-fiscal.factory';

const main = (page: Page) => page.locator('#main');
const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exato = (texto: string) => new RegExp(`^\\s*${escapar(texto)}\\s*$`);
const botao = (page: Page, nome: RegExp) => getByRoleSge(main(page), 'button', {name: nome});
const consulta = (page: Page) => main(page).locator('h4').filter({hasText: /^\s*Notas Fiscais\s*$/});
const resposta = (page: Page, caminho: string, metodo = 'GET') => page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase() === caminho.toLowerCase() && r.request().method() === metodo);
async function exigirHttp(res: Awaited<ReturnType<Page['waitForResponse']>>) {
  if (!res.ok()) throw new Error(`Nota Fiscal: HTTP ${res.status()} em ${new URL(res.url()).pathname}.`);
}

export async function abrirConsultaNotaFiscal(page: Page): Promise<void> {
  if (await consulta(page).isVisible()) return;
  const nav = page.locator('nav');
  const pai = (nome: string) => nav.locator('a').filter({has: page.locator('span.menu-item-parent').filter({hasText: exato(nome)})});
  const destino = nav.locator('a').filter({hasText: exato('Nota Fiscal')});
  const mensagem = 'Menu "Financeiro > Documentos Fiscais > Nota Fiscal" não encontrado. Verifique a permissão de consulta do perfil.';
  if (!await destino.isVisible()) {
    if (!await pai('Documentos Fiscais').isVisible()) {
      await expect(pai('Financeiro'), mensagem).toBeVisible();
      await pai('Financeiro').click();
    }
    await expect(pai('Documentos Fiscais'), mensagem).toBeVisible();
    await pai('Documentos Fiscais').click();
  }
  await expect(destino, mensagem).toBeVisible();
  const [res] = await Promise.all([resposta(page, '/notafiscal'), destino.click()]);
  await exigirHttp(res);
  await expect(consulta(page)).toBeVisible();
}

export async function selecionarSelect2NotaFiscal(page: Page, id: string, texto: string, dependencia?: string): Promise<void> {
  const escolha = main(page).locator(`#s2id_${id} .select2-choice`);
  await expect(escolha).toBeVisible();
  await escolha.click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect.poll(async () => (await opcoes.count()) + (await drop.locator('.select2-no-results').count())).toBeGreaterThan(0);
  const alvo = opcoes.filter({hasText: new RegExp(`^\\s*${escapar(texto)}(?:\\s+-\\s+[\\d./-]+)?\\s*$`)});
  if (await alvo.count() !== 1) {
    const disponiveis = await opcoes.allInnerTexts();
    await page.keyboard.press('Escape');
    throw new Error(`${id}: opção "${texto}" ausente ou ambígua. Opções: ${disponiveis.join(' | ')}. ${id === 'FornecedorId' ? 'Execute criar_fornecedor_pj_action antes.' : 'Verifique a unidade de apoio do tenant.'}`);
  }
  if (dependencia) {
    const [res] = await Promise.all([resposta(page, dependencia), alvo.click()]);
    await exigirHttp(res);
  } else await alvo.click();
  await expect(drop).toBeHidden();
  await expect(main(page).locator(`#s2id_${id} .select2-chosen`)).toHaveText(new RegExp(`^\\s*${escapar(texto)}(?:\\s+-.*)?\\s*$`));
}

export async function preencherDataNotaFiscal(page: Page, id: string, valor: string): Promise<void> {
  const campo = main(page).locator(`#${id}`);
  await campo.fill(valor);
  await campo.press('Tab');
  await expect(campo).toHaveValue(valor);
}

export async function pesquisarNotaFiscal(page: Page, fornecedor: string, termo: string): Promise<void> {
  await abrirConsultaNotaFiscal(page);
  if (!await main(page).locator('#DataInicial').isVisible()) await main(page).locator('#btnFiltros').click();
  await selecionarSelect2NotaFiscal(page, 'FornecedorId', fornecedor);
  await preencherDataNotaFiscal(page, 'DataInicial', '01/01/1900');
  await preencherDataNotaFiscal(page, 'DataFinal', '31/12/2099');
  await main(page).locator('#searchTerm').fill(termo);
  // Marca apenas o DOM observado, para distinguir a grade anterior da resposta nova.
  await main(page).locator('table').evaluateAll(tabelas => tabelas.forEach(t => t.setAttribute('data-nf-anterior', 'true')));
  const [res] = await Promise.all([resposta(page, '/notafiscal/indexgrid'), main(page).locator('#btnSubmitSearch').click()]);
  await exigirHttp(res);
  await expect(main(page).locator('table:not([data-nf-anterior]):visible')).toBeVisible();
}

export function linhasNotaFiscal(page: Page, chave: string): Locator {
  // Coluna 1 oculta observada no DOM: 2 unidade, 3 cadastro, 4 fornecedor, 5 número,
  // 6 série, 7 chave, 8 emissão, 9 valor, 10 anexo.
  return main(page).locator('table:not([data-nf-anterior]):visible tbody tr').filter({has: page.locator('td:nth-child(7)').filter({hasText: exato(chave)})});
}

export async function proximoNumeroLivreNotaFiscal(page: Page, opcoes: NotaFiscalOpcoes, inicio = numeroInicialNotaFiscal(opcoes)): Promise<number> {
  await pesquisarNotaFiscal(page, opcoes.fornecedor, opcoes.fornecedor);
  const ocupados = new Set<number>();
  for (;;) {
    const grade = main(page).locator('table:not([data-nf-anterior]):visible');
    for (const linha of await grade.locator('tbody tr').all()) {
      if (await linha.locator('td:nth-child(5)').count() !== 1) continue;
      const fornecedor = (await linha.locator('td:nth-child(4)').innerText()).trim();
      if (fornecedor.startsWith(`${opcoes.fornecedor} - `)) ocupados.add(Number((await linha.locator('td:nth-child(5)').innerText()).trim()));
    }
    const resumo = (await main(page).innerText()).match(/Mostrando\s+(\d+)\s+até\s+(\d+)\s+de\s+(\d+)\s+registros/);
    if (!resumo) {
      const semResultados = grade.getByText('<Nenhum resultado>', {exact: true});
      if (await semResultados.isVisible()) break;
      throw new Error('Não foi possível interpretar a paginação da consulta de Notas Fiscais.');
    }
    if (Number(resumo[2]) >= Number(resumo[3])) break;
    const proxima = getByRoleSge(main(page), 'link', {name: 'Próxima', exact: true});
    await expect(proxima).toBeVisible();
    await grade.evaluate(t => t.setAttribute('data-nf-anterior', 'true'));
    const [res] = await Promise.all([resposta(page, '/notafiscal/indexgrid'), proxima.click()]);
    await exigirHttp(res);
    await expect(main(page).locator('table:not([data-nf-anterior]):visible')).toBeVisible();
    await expect.poll(async () => (await main(page).innerText()).match(/Mostrando\s+(\d+)/)?.[1]).not.toBe(resumo[1]);
  }
  for (let n = inicio; n < inicio + 200 && n <= 999999999; n++) if (!ocupados.has(n)) return n;
  throw new Error('Nenhum número livre nas 200 sequências consultadas. Nenhuma nota foi excluída.');
}

export async function abrirInclusaoNotaFiscal(page: Page): Promise<void> {
  await expect(botao(page, /Adicionar/)).toBeVisible();
  await botao(page, /Adicionar/).click();
  await expect(main(page).locator('#formNotaFiscal')).toBeVisible();
}

export async function observarFeedbackNotaFiscal(page: Page): Promise<void> {
  await page.evaluate(() => {
    const contexto = window as unknown as {nfFeedback?: string[]; nfObserver?: MutationObserver};
    contexto.nfObserver?.disconnect();
    contexto.nfFeedback = [];
    const capturar = () => {
      for (const elemento of document.querySelectorAll<HTMLElement>('.swal2-popup, .field-validation-error, .validation-summary-errors, .toast')) {
        const texto = elemento.innerText?.replace(/\s+/g, ' ').trim();
        if (elemento.getClientRects().length && texto && !contexto.nfFeedback.includes(texto)) contexto.nfFeedback.push(texto);
      }
    };
    contexto.nfObserver = new MutationObserver(capturar);
    contexto.nfObserver.observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true});
    capturar();
  });
}

async function feedback(page: Page): Promise<string> {
  return page.evaluate(() => ((window as unknown as {nfFeedback?: string[]}).nfFeedback || []).join(' | '));
}

async function confirmarSucesso(page: Page, texto: string, fechamentoAutomatico = false): Promise<void> {
  await expect.poll(() => feedback(page), {message: `Feedback esperado: ${texto}`}).toContain(texto);
  const aviso = page.locator('.swal2-popup:visible').filter({hasText: texto});
  // A criação recarrega a tela e fecha o popup; a exclusão mantém o Ok visível.
  if (!fechamentoAutomatico) {
    await expect(aviso).toBeVisible();
    await aviso.getByRole('button', {name: 'Ok', exact: true}).click();
  }
  await expect(aviso).toBeHidden();
}

export async function salvarNotaFiscal(page: Page, aoSalvar: () => void): Promise<void> {
  await observarFeedbackNotaFiscal(page);
  const [res] = await Promise.all([resposta(page, '/NotaFiscal/POSTEditar', 'POST'), botao(page, /Salvar/).click()]);
  await exigirHttp(res);
  await expect.poll(async () => `${await feedback(page)} ${await main(page).locator('.field-validation-error').allInnerTexts()}`).toMatch(/Nota Fiscal adicionada\.|já está sendo utilizada|Já existe uma nota fiscal|Verifique os dados informados/);
  const mensagem = await feedback(page);
  const erros = (await main(page).locator('.field-validation-error').allInnerTexts()).filter(t => t.trim());
  if (!mensagem.includes('Nota Fiscal adicionada.')) throw new Error(`SGE recusou a nota: ${[mensagem, ...erros].join(' | ')}`);
  aoSalvar();
  await confirmarSucesso(page, 'Nota Fiscal adicionada.', true);
  await expect(botao(page, /Excluir/)).toBeVisible();
}

export async function conferirFormularioNotaFiscal(page: Page, nota: NotaFiscalMontada): Promise<void> {
  for (const [id, valor] of Object.entries({Numero: nota.numero, Serie: nota.serie, ChaveDeAcesso: nota.chaveAcesso, DataEmissao: nota.dataEmissao, NumeroDoContrato: nota.numeroContrato})) await expect(main(page).locator(`#${id}`)).toHaveValue(valor);
  await expect(main(page).locator('#CNPJFornecedor')).toHaveValue(nota.cnpjFornecedor);
  await expect(main(page).locator('#s2id_FornecedorId .select2-chosen')).toHaveText(new RegExp(`^\\s*${escapar(nota.fornecedor)}(?:\\s+-.*)?\\s*$`));
  await expect(main(page).locator('#s2id_DestinatarioId .select2-chosen')).toHaveText(new RegExp(`^\\s*${escapar(nota.unidade)}(?:\\s+-.*)?\\s*$`));
  await expect(main(page).locator('#ValorTotalComDesconto')).toHaveValue(/(?:R\$\s*)?0,00/);
}

export async function conferirLinhaNotaFiscal(page: Page, nota: NotaFiscalMontada): Promise<void> {
  const linha = linhasNotaFiscal(page, nota.chaveAcesso);
  await expect(linha).toHaveCount(1);
  const valores: Record<number, string | RegExp> = {2: new RegExp(`^\\s*${escapar(nota.unidade)}\\s+-\\s+\\d+\\s*$`), 3: nota.dataCadastro, 4: `${nota.fornecedor} - ${nota.cnpjFornecedor}`, 5: nota.numero, 6: nota.serie, 7: nota.chaveAcesso, 8: nota.dataEmissao, 9: /R\$\s*0,00/, 10: 'Não'};
  for (const [coluna, texto] of Object.entries(valores)) await expect(linha.locator(`td:nth-child(${coluna})`)).toHaveText(typeof texto === 'string' ? exato(texto) : texto);
}

export async function abrirNotaFiscal(page: Page, nota: NotaFiscalMontada): Promise<void> {
  await pesquisarNotaFiscal(page, nota.fornecedor, nota.chaveAcesso);
  await conferirLinhaNotaFiscal(page, nota);
  await linhasNotaFiscal(page, nota.chaveAcesso).locator('td:nth-child(7)').click();
  await expect(main(page).locator('#formNotaFiscal')).toBeVisible();
  await conferirFormularioNotaFiscal(page, nota);
}

export async function voltarConsultaNotaFiscal(page: Page): Promise<void> {
  await botao(page, /Voltar/).click();
  await expect(consulta(page)).toBeVisible();
}

export async function excluirNotaFiscalAberta(page: Page): Promise<void> {
  await botao(page, /Excluir/).click();
  const aviso = page.locator('.swal2-popup:visible').filter({hasText: 'Esta ação irá excluir a nota fiscal selecionada, uma vez excluída, não é possível recuperá-la. Deseja continuar?'});
  await expect(aviso).toBeVisible();
  await observarFeedbackNotaFiscal(page);
  const [res] = await Promise.all([resposta(page, '/NotaFiscal/ExcluaNotaFiscal', 'POST'), aviso.getByRole('button', {name: 'Sim', exact: true}).click()]);
  await exigirHttp(res);
  await confirmarSucesso(page, 'Nota Fiscal removida!');
  await expect(consulta(page)).toBeVisible();
}
