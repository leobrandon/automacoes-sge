import { expect, type Page } from '@playwright/test';
import { isDocumentoCurricularQAAuto } from '../factories/documento-curricular.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  aguardarCarregamentoDocumentoCurricular,
  abrirEdicaoDocumentoCurricular,
  linhaDocumentoCurricular,
  pesquisarDocumentoCurricular,
} from '../helpers/navigation/documento-curricular.navigation';

export interface DocumentoCurricularExcluido { descricao: string; url: string; confirmacao: string }
export interface ResultadoExclusaoDocumentoCurricularQAAuto {
  totalEncontrados: number;
  totalExcluidos: number;
  excluidos: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

const feedbackDocumento = (page: Page) => page.locator('.swal2-popup:visible, .divMessageBox:visible, .MessageBoxContainer:visible').last();

async function abrirAbaDocumentoCurricular(page: Page, aba: 'Estrutura' | 'Componentes'): Promise<void> {
  const href = aba === 'Estrutura' ? '#tabEstrutura' : '#tabComponentes';
  const controle = page.locator(`#formDocumentoCurricular a[href="${href}"]:visible`);
  await expect(controle, `A aba ${aba} deve estar visível no formulário do Documento Curricular.`).toHaveCount(1);
  await controle.click();
  await expect(page.locator(href)).toBeVisible();
}

async function confirmarAcaoAssociada(page: Page, confirmacaoEsperada: RegExp, sucessoEsperado: RegExp): Promise<void> {
  const dialogo = feedbackDocumento(page);
  await dialogo.waitFor({ state: 'visible', timeout: 15000 });
  const textoConfirmacao = (await dialogo.innerText()).trim();
  if (!confirmacaoEsperada.test(textoConfirmacao)) {
    throw new Error(`Confirmação inesperada ao remover dependência: ${textoConfirmacao}`);
  }
  await dialogo.getByRole('button', { name: /^(Sim|Excluir|Confirmar)$/i }).first().click();
  await expect(dialogo).toContainText(sucessoEsperado, { timeout: 20000 });
  const textoSucesso = (await dialogo.innerText()).trim();
  const ok = getByRoleSge(dialogo, 'button', { name: 'Ok', exact: true });
  await expect(ok).toBeVisible();
  await ok.click();
  await expect(dialogo).toHaveCount(0);
  console.log(`[Documento Curricular] Dependência removida pela interface: ${textoSucesso}`);
}

/** Remove filhos somente quando a própria descrição confirma que são dados de teste QAAUTO. */
async function removerItensQAAutoDoComponente(page: Page, descricaoComponente: string): Promise<void> {
  await expect(page.getByRole('heading', { name: /Editar Componente do Documento Curricular/i, includeHidden: true })).toBeVisible();
  const abasEstrutura = page.locator('#main a[href*="tabObj_"]:visible');
  const totalAbas = await abasEstrutura.count();
  for (let indiceAba = totalAbas - 1; indiceAba >= 0; indiceAba--) {
    const aba = abasEstrutura.nth(indiceAba);
    const descricaoEstrutura = (await aba.innerText()).trim();
    if (!isDocumentoCurricularQAAuto(descricaoEstrutura)) {
      throw new Error(`A estrutura "${descricaoEstrutura}" do componente "${descricaoComponente}" não é QAAUTO; a exclusão foi interrompida.`);
    }
    await aba.click();
    const hrefAba = await aba.getAttribute('href');
    const idAba = hrefAba?.match(/tabObj_(\d+)/)?.[1];
    if (!idAba) throw new Error(`Não foi possível identificar a aba de estrutura "${descricaoEstrutura}".`);
    const grade = page.locator(`#table-${idAba}`);
    while (true) {
      const linhas = grade.locator('tbody tr:visible');
      const quantidade = await linhas.count();
      if (quantidade === 0) break;
      const linha = linhas.nth(quantidade - 1);
      const excluirItem = linha.getByTitle(/Excluir/i).first();
      if (!await excluirItem.isVisible().catch(() => false)) break;
      const descricaoItem = (await linha.locator('td:visible').first().innerText()).replace(/\s+/g, ' ').trim();
      if (!descricaoItem || !isDocumentoCurricularQAAuto(descricaoItem)) {
        throw new Error(`O item "${descricaoItem || '(sem descrição)'}" na estrutura "${descricaoEstrutura}" não é QAAUTO; a exclusão foi interrompida.`);
      }
      await excluirItem.click();
      await confirmarAcaoAssociada(page, /Tem certeza que deseja excluir esse item\?/i, /O item foi removido\./i);
      await expect(linha).toHaveCount(0);
    }
  }
  await page.getByRole('button', { name: /Voltar/i }).click();
  await expect(page.getByRole('heading', { name: /Editar Documento Curricular/i, includeHidden: true })).toBeVisible();
}

/** Limpa estruturas, itens e vínculos inseridos no documento QAAUTO antes de excluir o documento. */
async function removerDependenciasQAAutoDocumento(page: Page): Promise<void> {
  await abrirAbaDocumentoCurricular(page, 'Componentes');
  const anos = page.locator('#divGrupo li');
  while (await anos.count()) {
    const ano = anos.last();
    const abaAno = ano.locator('a[data-toggle="tab"]');
    const href = await abaAno.getAttribute('href');
    if (!href?.startsWith('#tab_componente_')) throw new Error('A aba do ano escolar não possui identificação válida.');
    const nomeAno = (await abaAno.locator('b').innerText()).trim();
    await expect(abaAno).toBeVisible();
    await abaAno.click();
    const painel = page.locator(href);
    const linhas = painel.locator('tbody tr').filter({ has: page.locator('a[onclick^="removaComponenteDoDocumentoCurricular("]') });
    while (await linhas.count()) {
      const linha = linhas.last();
      const nomeComponente = (await linha.locator('td').first().innerText()).trim();
      const quantidades = (await linha.locator('td').allTextContents()).slice(1, -1).map(texto => texto.trim());
      if (quantidades.some(texto => !/^\d+$/.test(texto))) throw new Error('A grade apresentou quantidades de itens inválidas.');
      if (quantidades.some(texto => Number(texto) > 0)) {
        const editar = linha.locator('a[onclick*="/documentocurricular/editarcomponente?"]');
        await expect(editar).toBeVisible();
        await editar.click();
        await removerItensQAAutoDoComponente(page, nomeComponente);
        await abrirAbaDocumentoCurricular(page, 'Componentes');
        await page.locator(`#divGrupo a[href="${href}"]`).click();
      }
      const linhaAtual = painel.locator('tbody tr').filter({ has: page.getByText(nomeComponente, { exact: true }) });
      const excluir = linhaAtual.locator('a[onclick^="removaComponenteDoDocumentoCurricular("]');
      await expect(excluir).toBeVisible();
      const quantidadeAntes = await linhas.count();
      const tabelaAntes = await painel.locator('table').elementHandle();
      await excluir.click();
      await confirmarAcaoAssociada(page,
        /Tem certeza que deseja excluir esse componente do documento curricular\?/i,
        /O componente do documento curricular foi excluído\./i);
      await page.waitForFunction(elemento => !elemento.isConnected, tabelaAntes);
      await tabelaAntes.dispose();
      await abrirAbaDocumentoCurricular(page, 'Componentes');
      // A exclusão atualiza a grade; não exige substituir o formulário inteiro.
      const abaAtual = page.locator(`#divGrupo a[href="${href}"]`);
      if (await abaAtual.count()) {
        await expect(abaAtual).toBeVisible();
        await abaAtual.click();
        await expect(painel).toBeVisible();
        await expect(painel.locator('table')).toBeVisible();
      }
      await expect(linhas, `O ano ${nomeAno} deve perder exatamente um vínculo de componente.`).toHaveCount(quantidadeAntes - 1);
      await expect(linhaAtual).toHaveCount(0);
    }
    await expect(painel.locator('a[onclick^="removaComponenteDoDocumentoCurricular("]')).toHaveCount(0);
    const anoRestante = page.locator(`#divGrupo a[href="${href}"]`);
    // O sandbox remove o grupo automaticamente ao excluir seu último componente.
    // Se o grupo persistir, somente agora seu botão pode ser usado.
    if (await anoRestante.count()) {
      const excluirAno = anoRestante.locator('span[onclick^="removaComponente("]');
      await expect(excluirAno).toBeVisible();
      await excluirAno.click();
      await confirmarAcaoAssociada(page, /certeza.*(componente|ano escolar)/i, /(componente|ano escolar).*?(removid|excluíd)/i);
    }
    await expect(anoRestante).toHaveCount(0);
    console.log(`[Documento Curricular] Ano escolar removido após seus componentes: ${nomeAno}.`);
  }
  await abrirAbaDocumentoCurricular(page, 'Estrutura');
  await expect(page.locator('#div-itens-estrutura-partial table')).toBeVisible();
  const linhasEstrutura = page.locator('#formDocumentoCurricular #tabEstrutura table:visible tbody tr:visible');
  while (await linhasEstrutura.count()) {
    const linha = linhasEstrutura.last();
    const textoLinha = (await linha.innerText()).replace(/\s+/g, ' ').trim();
    if (/^<\s*Nenhuma estrutura configurada\.\s*>$/i.test(textoLinha)) break;
    const excluirEstrutura = linha.locator('a[onclick^="excluirEstrutura("]');
    await expect(excluirEstrutura).toBeVisible();
    const celulasEstrutura = linha.locator('td:visible');
    if (await celulasEstrutura.count() < 3) {
      throw new Error(`A estrutura exibiu uma linha inesperada e não vazia: "${textoLinha}".`);
    }
    const descricaoEstrutura = (await celulasEstrutura.nth(1).innerText()).replace(/\s+/g, ' ').trim();
    if (!isDocumentoCurricularQAAuto(descricaoEstrutura)) {
      throw new Error(`A estrutura "${descricaoEstrutura}" do documento não é QAAUTO; a exclusão foi interrompida.`);
    }
    const tabelaAntes = await page.locator('#div-itens-estrutura-partial table').elementHandle();
    await excluirEstrutura.click();
    await confirmarAcaoAssociada(page,
      /Tem certeza que deseja remover esse item da estrutura do documento curricular\?/i,
      /O item da estrutura foi removido\./i);
    await page.waitForFunction(elemento => !elemento.isConnected, tabelaAntes);
    await tabelaAntes.dispose();
    await expect(page.locator('#div-itens-estrutura-partial table')).toBeVisible();
    await expect(linhasEstrutura.filter({ has: page.getByText(descricaoEstrutura, { exact: true }) })).toHaveCount(0);
  }
  await expect(page.locator('#div-itens-estrutura-partial')).toContainText('< Nenhuma estrutura configurada. >');
}

/** Exclui um documento QAAUTO após remover seus itens, vínculos e estruturas também QAAUTO. */
export async function excluirDocumentoCurricular(page: Page, descricao: string): Promise<DocumentoCurricularExcluido> {
  const alvo = descricao.trim();
  if (!isDocumentoCurricularQAAuto(alvo)) throw new Error('A exclusão automatizada exige descrição iniciada por QAAUTO.');
  console.log(`[Documento Curricular] Iniciando exclusão individual de "${alvo}".`);
  await pesquisarDocumentoCurricular(page, alvo);
  const linha = linhaDocumentoCurricular(page, alvo);
  console.log(`[Documento Curricular] Conferindo se existe exatamente uma linha para "${alvo}".`);
  await expect(linha).toHaveCount(1);
  await abrirEdicaoDocumentoCurricular(page, alvo);
  await removerDependenciasQAAutoDocumento(page);
  console.log(`[Documento Curricular] Solicitando exclusão de "${alvo}" e aguardando a confirmação da interface.`);
  await page.locator('#main #btnExcluirDocumentoCurricular').click();
  const confirmacao = page.locator('.swal2-popup:visible, .divMessageBox:visible, .MessageBoxContainer:visible').last();
  await confirmacao.waitFor({ state: 'visible', timeout: 15000 });
  const textoConfirmacao = (await confirmacao.innerText()).trim();
  console.log(`[Documento Curricular] Confirmação exibida para "${alvo}": ${textoConfirmacao}`);
  if (!/excluir|remover|apagar|certeza/i.test(textoConfirmacao)) {
    throw new Error(`A confirmação de exclusão apresentou conteúdo inesperado: ${textoConfirmacao}`);
  }
  const botaoConfirmar = confirmacao.getByRole('button', { name: /^(Sim|Excluir|Confirmar)$/i }).first();
  const [resposta] = await Promise.all([
    page.waitForResponse(response => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/+$/, '');
      return caminho === '/documentocurricular/postdelete'
        && ['POST', 'DELETE'].includes(response.request().method());
    }, { timeout: 20000 }),
    botaoConfirmar.click(),
  ]);
  console.log(`[Documento Curricular] Resposta da exclusão de "${alvo}": HTTP ${resposta.status()}.`);
  if (!resposta.ok()) throw new Error(`A exclusão retornou HTTP ${resposta.status()}.`);
  // HTTP 200 também ocorre quando o SGE recusa a exclusão. Aguarde o
  // resultado funcional e feche seu diálogo antes de consultar a grade.
  const feedback = feedbackDocumento(page);
  await expect(feedback).toContainText(/O documento curricular foi excluído\.|não é possível|erro|falha/i, { timeout: 20000 });
  const mensagem = (await feedback.innerText()).trim();
  const ok = getByRoleSge(feedback, 'button', { name: 'Ok', exact: true });
  await expect(ok).toBeVisible();
  if (/não é possível|erro|falha/i.test(mensagem)) {
    await ok.click();
    await expect(feedback).toHaveCount(0);
    throw new Error(`O SGE não excluiu "${alvo}": ${mensagem}`);
  }
  await expect(feedback.getByText('O documento curricular foi excluído.', { exact: true })).toBeVisible();
  console.log(`[Documento Curricular] Sucesso exibido para "${alvo}": ${mensagem}`);
  await ok.click();
  await expect(feedback).toHaveCount(0);
  await aguardarCarregamentoDocumentoCurricular(page);
  await expect(getByRoleSge(page.locator('#main'), 'heading', { name: /Consulta de Documento Curricular/i })).toBeVisible();
  await pesquisarDocumentoCurricular(page, alvo);
  await expect(linha).toHaveCount(0);
  console.log(`[Documento Curricular] Exclusão confirmada: "${alvo}" não aparece mais na grade.`);
  return { descricao: alvo, url: page.url(), confirmacao: textoConfirmacao };
}

/** Quando habilitada no JSON, tenta excluir somente documentos encontrados com prefixo QAAUTO pela grade. */
export async function excluirDocumentosCurricularesQAAuto(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoExclusaoDocumentoCurricularQAAuto> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }
  console.log('[Documento Curricular] Iniciando varredura paginada por documentos com prefixo QAAUTO para exclusão em lote.');
  const tentadas = new Set<string>();
  const resultado: ResultadoExclusaoDocumentoCurricularQAAuto = {
    totalEncontrados: 0,
    totalExcluidos: 0,
    excluidos: [],
    falhas: [],
  };
  // A grade do SGE localiza esses registros com a busca "qa"; a validação
  // abaixo restringe a exclusão ao prefixo QAAUTO, sem tocar em outros nomes.
  const termoPesquisa = 'qa';
  await pesquisarDocumentoCurricular(page, termoPesquisa);
  let paginaAtual = 1;
  while (true) {
    const linhas = page.locator('#main table:visible tbody tr:visible');
    let descricaoPendente: string | undefined;
    for (let indice = 0; indice < await linhas.count(); indice++) {
      const celulas = await linhas.nth(indice).locator('td:visible').allTextContents();
      const descricao = celulas.map(texto => texto.replace(/\s+/g, ' ').trim())
        .find(texto => isDocumentoCurricularQAAuto(texto));
      if (descricao && !tentadas.has(descricao)) {
        descricaoPendente = descricao;
        break;
      }
    }

    if (descricaoPendente) {
      tentadas.add(descricaoPendente);
      resultado.totalEncontrados++;
      try {
        await excluirDocumentoCurricular(page, descricaoPendente);
        resultado.totalExcluidos++;
        resultado.excluidos.push(descricaoPendente);
      } catch (erro) {
        const motivo = erro instanceof Error ? erro.message : String(erro);
        resultado.falhas.push({ descricao: descricaoPendente, motivo });
        console.log(`[Documento Curricular] Falha ao excluir "${descricaoPendente}": ${motivo}`);
      }
      await pesquisarDocumentoCurricular(page, termoPesquisa);
      continue;
    }

    const proxima = page.locator('#main a:visible').filter({ hasText: /^\s*Próxima\s*$/ }).first();
    if (!await proxima.isVisible().catch(() => false)) break;
    const desabilitada = await proxima.evaluate(elemento => {
      const link = elemento as HTMLAnchorElement;
      return link.getAttribute('aria-disabled') === 'true'
        || link.hasAttribute('disabled')
        || link.classList.contains('disabled')
        || link.closest('li')?.classList.contains('disabled') === true;
    });
    if (desabilitada) break;
    const pagina = await page.locator('#main table:visible tbody').innerText();
    console.log(`[Documento Curricular] Há mais resultados; abrindo a página ${paginaAtual + 1}.`);
    await proxima.click();
    await aguardarCarregamentoDocumentoCurricular(page);
    await expect(page.locator('#main table:visible tbody')).not.toHaveText(pagina);
    paginaAtual++;
  }
  console.log(`[Documento Curricular] Exclusão em lote encerrada: ${resultado.totalExcluidos}/${resultado.totalEncontrados} removido(s), ${resultado.falhas.length} falha(s).`);
  return resultado;
}

