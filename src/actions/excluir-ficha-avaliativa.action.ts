import { expect, type Locator, type Page } from '@playwright/test';
import type { FichaAvaliativaCriada } from './criar-ficha-avaliativa.action';
import { isFichaAvaliativaQAAuto } from '../factories/ficha-avaliativa.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirEdicaoFichaAvaliativa,
  linhaFichaAvaliativa,
  pesquisarFichaAvaliativa,
} from '../helpers/navigation/ficha-avaliativa.navigation';

const main = (page: Page) => page.locator('#main');

function linhaFilha(page: Page, grade: string, descricao: string): Locator {
  return main(page).locator(`${grade} tbody tr`).filter({
    has: page.locator('td').getByText(descricao, { exact: true }),
  });
}

async function clicar(controle: Locator): Promise<void> {
  await expect(controle).toBeVisible();
  await controle.click();
}

async function abrirAba(page: Page, nome: string): Promise<void> {
  await clicar(getByRoleSge(main(page), 'link', { name: nome, exact: true }));
  if (nome === 'Parecer Final') await expect(main(page).locator('#gridParecerFinal')).toBeVisible();
  if (nome === 'Informações Complementares') await expect(main(page).locator('#gridAgrupador')).toBeVisible();
}

async function abrirAgrupador(page: Page, ficha: FichaAvaliativaCriada): Promise<void> {
  await abrirAba(page, 'Informações Complementares');
  const linha = linhaFilha(page, '#gridAgrupador', ficha.agrupador);
  await expect(linha).toHaveCount(1);
  await clicar(linha.locator('td[data-id]'));
  await expect(getByRoleSge(main(page), 'heading', { name: /Editar Agrupar Ficha/i })).toBeVisible();
  await expect(main(page).locator('#gridTopico')).toBeVisible();
  await expect(main(page).locator('#Descricao')).toHaveValue(ficha.agrupador);
}

async function confirmarExclusao(page: Page, mensagem: string): Promise<void> {
  const dialogo = page.locator('.swal2-popup:visible, .divMessageBox:visible');
  await expect(dialogo).toHaveCount(1);
  await expect(dialogo).toContainText(mensagem);
  await clicar(getByRoleSge(dialogo, 'button', { name: 'Sim', exact: true }));
}

async function confirmarAvisoTemporario(page: Page, mensagem: string): Promise<void> {
  const aviso = page.getByText(mensagem, { exact: true });
  await expect(aviso).toBeVisible({ timeout: 20000 });
  // Tópico e agrupador exibem o mesmo texto; espere o aviso sair antes da próxima exclusão.
  await expect(aviso).toBeHidden({ timeout: 20000 });
}

/** Recebe a ficha completa retornada pela criação da própria execução, nunca uma busca geral QAAUTO. */
export async function excluirFichaAvaliativa(page: Page, ficha: FichaAvaliativaCriada): Promise<{ descricao: string; url: string }> {
  if (!ficha || !isFichaAvaliativaQAAuto(ficha.descricao ?? '')) {
    throw new Error('A exclusão exige a ficha QAAUTO criada pela própria execução.');
  }
  if ([ficha.agrupador, ficha.topico, ficha.desempenhoFinal].some(nome => !nome?.trim())) {
    throw new Error('Informe as descrições de todas as dependências da ficha criada.');
  }

  await pesquisarFichaAvaliativa(page, ficha.descricao);
  await expect(linhaFichaAvaliativa(page, ficha.descricao)).toHaveCount(1);
  await abrirEdicaoFichaAvaliativa(page, ficha.descricao);

  // Confira toda a massa antes de iniciar as mutações; não remova filhos desconhecidos.
  await abrirAba(page, 'Informações Complementares');
  const editor = page.frameLocator('#P1 iframe.cke_wysiwyg_frame').locator('body');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveText(ficha.informacaoComplementar);
  await expect(main(page).locator('#gridAgrupador td[data-id]')).toHaveCount(1);
  await abrirAgrupador(page, ficha);
  const topico = linhaFilha(page, '#gridTopico', ficha.topico);
  const excluirTopico = topico.getByTitle('Excluir o tópico do agrupador da ficha avaliativa', { exact: true });
  await expect(topico).toHaveCount(1);
  await expect(main(page).locator('#gridTopico').getByTitle('Excluir o tópico do agrupador da ficha avaliativa', { exact: true })).toHaveCount(1);
  await expect(excluirTopico).toBeVisible();
  await clicar(getByRoleSge(main(page), 'button', { name: /Voltar\s*$/ }));
  await expect(getByRoleSge(main(page), 'heading', { name: /Editar Ficha Avaliativa/i })).toBeVisible();

  await abrirAba(page, 'Parecer Final');
  const parecer = linhaFilha(page, '#gridParecerFinal', ficha.desempenhoFinal);
  await expect(parecer).toHaveCount(1);
  await expect(main(page).locator('#gridParecerFinal').getByTitle('Excluir os dados do desempenho final', { exact: true })).toHaveCount(1);
  console.log(`[Ficha Avaliativa] Excluindo parecer final "${ficha.desempenhoFinal}".`);
  await clicar(parecer.getByTitle('Excluir os dados do desempenho final', { exact: true }));
  await confirmarExclusao(page, 'Esta ação excluirá o desempenho final de aprendizagem.');
  const sucessoParecer = page.locator('.swal2-popup:visible');
  await expect(sucessoParecer).toContainText('Desempenho Final de Aprendizagem excluído.');
  await clicar(getByRoleSge(sucessoParecer, 'button', { name: 'Ok', exact: true }));
  await expect(parecer).toHaveCount(0);
  console.log(`[Ficha Avaliativa] Parecer final "${ficha.desempenhoFinal}" excluído com sucesso.`);

  await abrirAgrupador(page, ficha);
  console.log(`[Ficha Avaliativa] Excluindo tópico "${ficha.topico}".`);
  await clicar(excluirTopico);
  await confirmarExclusao(page, 'Tem certeza que deseja excluir esse tópico?');
  await confirmarAvisoTemporario(page, 'Agrupador Ficha excluída com sucesso.');
  await expect(topico).toHaveCount(0);
  await expect(main(page).locator('#gridTopico').getByTitle('Excluir o tópico do agrupador da ficha avaliativa', { exact: true })).toHaveCount(0);
  console.log(`[Ficha Avaliativa] Tópico "${ficha.topico}" excluído com sucesso.`);
  console.log(`[Ficha Avaliativa] Excluindo agrupador "${ficha.agrupador}".`);
  await clicar(getByRoleSge(main(page), 'button', { name: /Excluir\s*$/ }));
  await confirmarExclusao(page, 'Tem certeza que deseja excluir?');
  await confirmarAvisoTemporario(page, 'Agrupador Ficha excluída com sucesso.');
  await expect(getByRoleSge(main(page), 'heading', { name: /Editar Ficha Avaliativa/i })).toBeVisible();
  console.log(`[Ficha Avaliativa] Agrupador "${ficha.agrupador}" excluído com sucesso.`);

  await abrirAba(page, 'Informações Complementares');
  await expect(main(page).locator('#gridAgrupador td[data-id]')).toHaveCount(0);
  // O SGE exige este texto. Sua preservação até a exclusão da ficha foi aprovada pelo usuário.
  await expect(editor).toHaveText(ficha.informacaoComplementar);
  await abrirAba(page, 'Parecer Final');
  await expect(main(page).locator('#gridParecerFinal').getByTitle('Excluir os dados do desempenho final', { exact: true })).toHaveCount(0);
  await clicar(getByRoleSge(main(page), 'button', { name: /Voltar\s*$/ }));

  // Reabra pela consulta para confirmar que as exclusões dos filhos persistiram.
  await pesquisarFichaAvaliativa(page, ficha.descricao);
  await abrirEdicaoFichaAvaliativa(page, ficha.descricao);
  await abrirAba(page, 'Informações Complementares');
  await expect(main(page).locator('#gridAgrupador td[data-id]')).toHaveCount(0);
  await expect(editor).toHaveText(ficha.informacaoComplementar);
  await abrirAba(page, 'Parecer Final');
  await expect(main(page).locator('#gridParecerFinal').getByTitle('Excluir os dados do desempenho final', { exact: true })).toHaveCount(0);
  console.log(`[Ficha Avaliativa] Excluindo ficha avaliativa "${ficha.descricao}".`);
  await clicar(getByRoleSge(main(page), 'button', { name: /Excluir\s*$/ }));
  await confirmarExclusao(page, 'Tem certeza que deseja excluir?');
  await confirmarAvisoTemporario(page, 'Ficha excluída com sucesso.');
  await expect(getByRoleSge(main(page), 'heading', { name: /Consulta de Ficha Avaliativa/i })).toBeVisible();
  await pesquisarFichaAvaliativa(page, ficha.descricao);
  await expect(linhaFichaAvaliativa(page, ficha.descricao)).toHaveCount(0);
  console.log(`[Ficha Avaliativa] Ficha avaliativa "${ficha.descricao}" excluída com sucesso.`);
  console.log(`✅ Exclusão da ficha e suas dependências confirmada: ${ficha.descricao}`);
  return { descricao: ficha.descricao, url: page.url() };
}

type AgrupadorEncontrado = { descricao: string; topicos: string[] };

export interface ResultadoExclusaoFichasQAAuto {
  totalEncontrados: number;
  totalExcluidos: number;
  excluidos: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

function exigirQAAuto(descricao: string, tipo: string): void {
  if (!isFichaAvaliativaQAAuto(descricao)) {
    throw new Error(`${tipo} sem prefixo QAAUTO: "${descricao || '(sem descrição)'}". Exclusão interrompida.`);
  }
}

async function lerDescricoesRemoviveis(linhas: Locator, tituloAcao: string, tipo: string): Promise<string[]> {
  const descricoes: string[] = [];
  for (const linha of await linhas.all()) {
    const nome = (await linha.locator('td').first().innerText()).trim();
    if (/^<Esta ficha avaliativa ainda não possui (?:itens cadastrados|agrupadores)\.>$/i.test(nome)
      && await linha.getByTitle(tituloAcao, { exact: true }).count() === 0) continue;
    exigirQAAuto(nome, tipo);
    await expect(linha.getByTitle(tituloAcao, { exact: true })).toHaveCount(1);
    descricoes.push(nome);
  }
  return descricoes;
}

async function lerDependenciasQAAuto(page: Page, descricao: string): Promise<{
  pareceres: string[];
  agrupadores: AgrupadorEncontrado[];
}> {
  await pesquisarFichaAvaliativa(page, descricao);
  await expect(linhaFichaAvaliativa(page, descricao)).toHaveCount(1);
  await abrirEdicaoFichaAvaliativa(page, descricao);
  await abrirAba(page, 'Parecer Final');
  const pareceres = await lerDescricoesRemoviveis(
    main(page).locator('#gridParecerFinal tbody tr'),
    'Excluir os dados do desempenho final',
    'Parecer final',
  );

  await abrirAba(page, 'Informações Complementares');
  const nomesAgrupadores = await main(page).locator('#gridAgrupador td[data-id]').allTextContents();
  const agrupadores: AgrupadorEncontrado[] = [];
  for (const nomeBruto of nomesAgrupadores) {
    const nome = nomeBruto.trim();
    exigirQAAuto(nome, 'Agrupador');
    const linha = linhaFilha(page, '#gridAgrupador', nome);
    await expect(linha).toHaveCount(1);
    await clicar(linha.locator('td[data-id]'));
    await expect(getByRoleSge(main(page), 'heading', { name: /Editar Agrupar Ficha/i })).toBeVisible();
    await expect(main(page).locator('#gridTopico')).toBeVisible();
    const topicos = await lerDescricoesRemoviveis(
      main(page).locator('#gridTopico tbody tr'),
      'Excluir o tópico do agrupador da ficha avaliativa',
      'Tópico',
    );
    agrupadores.push({ descricao: nome, topicos });
    await clicar(getByRoleSge(main(page), 'button', { name: /Voltar\s*$/ }));
    await expect(getByRoleSge(main(page), 'heading', { name: /Editar Ficha Avaliativa/i })).toBeVisible();
    await abrirAba(page, 'Informações Complementares');
  }
  return { pareceres, agrupadores };
}

/** Exclui uma ficha preexistente só após conferir pela UI que cada dependência removível também é QAAUTO. */
export async function excluirFichaAvaliativaQAAuto(page: Page, descricao: string): Promise<{ descricao: string; url: string }> {
  const alvo = descricao.trim();
  exigirQAAuto(alvo, 'Ficha Avaliativa');
  const dependencias = await lerDependenciasQAAuto(page, alvo);

  await abrirAba(page, 'Parecer Final');
  for (const nome of dependencias.pareceres) {
    const linha = linhaFilha(page, '#gridParecerFinal', nome);
    await expect(linha).toHaveCount(1);
    console.log(`[Ficha Avaliativa] Excluindo parecer final "${nome}" da ficha "${alvo}".`);
    await clicar(linha.getByTitle('Excluir os dados do desempenho final', { exact: true }));
    await confirmarExclusao(page, 'Esta ação excluirá o desempenho final de aprendizagem.');
    const sucesso = page.locator('.swal2-popup:visible');
    await expect(sucesso).toContainText('Desempenho Final de Aprendizagem excluído.');
    await clicar(getByRoleSge(sucesso, 'button', { name: 'Ok', exact: true }));
    await expect(linha).toHaveCount(0);
    console.log(`[Ficha Avaliativa] Parecer final "${nome}" excluído com sucesso.`);
  }

  for (const agrupador of dependencias.agrupadores) {
    await abrirAba(page, 'Informações Complementares');
    const linhaAgrupador = linhaFilha(page, '#gridAgrupador', agrupador.descricao);
    await expect(linhaAgrupador).toHaveCount(1);
    await clicar(linhaAgrupador.locator('td[data-id]'));
    await expect(getByRoleSge(main(page), 'heading', { name: /Editar Agrupar Ficha/i })).toBeVisible();
    for (const nome of agrupador.topicos) {
      const linha = linhaFilha(page, '#gridTopico', nome);
      await expect(linha).toHaveCount(1);
      console.log(`[Ficha Avaliativa] Excluindo tópico "${nome}" do agrupador "${agrupador.descricao}".`);
      await clicar(linha.getByTitle('Excluir o tópico do agrupador da ficha avaliativa', { exact: true }));
      await confirmarExclusao(page, 'Tem certeza que deseja excluir esse tópico?');
      await confirmarAvisoTemporario(page, 'Agrupador Ficha excluída com sucesso.');
      await expect(linha).toHaveCount(0);
      console.log(`[Ficha Avaliativa] Tópico "${nome}" excluído com sucesso.`);
    }
    console.log(`[Ficha Avaliativa] Excluindo agrupador "${agrupador.descricao}" da ficha "${alvo}".`);
    await clicar(getByRoleSge(main(page), 'button', { name: /Excluir\s*$/ }));
    await confirmarExclusao(page, 'Tem certeza que deseja excluir?');
    await confirmarAvisoTemporario(page, 'Agrupador Ficha excluída com sucesso.');
    await expect(getByRoleSge(main(page), 'heading', { name: /Editar Ficha Avaliativa/i })).toBeVisible();
    await abrirAba(page, 'Informações Complementares');
    await expect(linhaAgrupador).toHaveCount(0);
    console.log(`[Ficha Avaliativa] Agrupador "${agrupador.descricao}" excluído com sucesso.`);
  }

  await clicar(getByRoleSge(main(page), 'button', { name: /Voltar\s*$/ }));
  await pesquisarFichaAvaliativa(page, alvo);
  await abrirEdicaoFichaAvaliativa(page, alvo);
  await abrirAba(page, 'Parecer Final');
  await expect(main(page).locator('#gridParecerFinal').getByTitle('Excluir os dados do desempenho final', { exact: true })).toHaveCount(0);
  await abrirAba(page, 'Informações Complementares');
  await expect(main(page).locator('#gridAgrupador td[data-id]')).toHaveCount(0);
  console.log(`[Ficha Avaliativa] Excluindo ficha avaliativa "${alvo}".`);
  await clicar(getByRoleSge(main(page), 'button', { name: /Excluir\s*$/ }));
  await confirmarExclusao(page, 'Tem certeza que deseja excluir?');
  await confirmarAvisoTemporario(page, 'Ficha excluída com sucesso.');
  await expect(getByRoleSge(main(page), 'heading', { name: /Consulta de Ficha Avaliativa/i })).toBeVisible();
  await pesquisarFichaAvaliativa(page, alvo);
  await expect(linhaFichaAvaliativa(page, alvo)).toHaveCount(0);
  console.log(`[Ficha Avaliativa] Ficha avaliativa "${alvo}" excluída com sucesso.`);
  return { descricao: alvo, url: page.url() };
}

/** Varre a consulta paginada e remove somente descrições que começam por QAAUTO. */
export async function excluirFichasAvaliativasQAAuto(page: Page, termo = 'QAAUTO'): Promise<ResultadoExclusaoFichasQAAuto> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }
  const resultado: ResultadoExclusaoFichasQAAuto = { totalEncontrados: 0, totalExcluidos: 0, excluidos: [], falhas: [] };
  const tentadas = new Set<string>();
  const termoPesquisa = 'QAAUTO';
  await pesquisarFichaAvaliativa(page, termoPesquisa);
  while (true) {
    await expect(main(page).locator('table')).toBeVisible();
    // A grade expõe cada descrição como célula acessível, inclusive quando suas tabelas internas mudam.
    const celulas = getByRoleSge(main(page), 'cell', { name: /^QAAUTO\b/i });
    let proximaDescricao: string | undefined;
    for (const celula of await celulas.all()) {
      if (!await celula.isVisible()) continue;
      const nome = (await celula.innerText()).trim();
      if (isFichaAvaliativaQAAuto(nome) && !tentadas.has(nome)) {
        proximaDescricao = nome;
        break;
      }
    }
    if (proximaDescricao) {
      tentadas.add(proximaDescricao);
      resultado.totalEncontrados++;
      try {
        await excluirFichaAvaliativaQAAuto(page, proximaDescricao);
        resultado.excluidos.push(proximaDescricao);
        resultado.totalExcluidos++;
      } catch (erro) {
        const motivo = erro instanceof Error ? erro.message : String(erro);
        resultado.falhas.push({
          descricao: proximaDescricao,
          motivo,
        });
        console.log(`[Ficha Avaliativa] Falha ao excluir "${proximaDescricao}": ${motivo}`);
      }
      await pesquisarFichaAvaliativa(page, termoPesquisa);
      continue;
    }
    const proxima = main(page).getByRole('link', { name: 'Próxima', exact: true, includeHidden: true });
    if (!await proxima.isVisible()) break;
    const desabilitada = await proxima.evaluate(el => el.closest('li')?.classList.contains('disabled') === true);
    if (desabilitada) break;
    const primeiraCelula = await celulas.first().innerText().catch(() => '');
    await clicar(proxima);
    await expect.poll(() => celulas.first().innerText().catch(() => ''), { timeout: 15000 }).not.toBe(primeiraCelula);
  }
  return resultado;
}
