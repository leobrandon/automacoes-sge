import type { Locator, Page } from '@playwright/test';
import { isAnoEscolarQAAuto } from '../factories/ano-escolar.factory';
import {
  aguardarAtualizacaoGradeAnoEscolar,
  aguardarCarregamentoAnoEscolar,
  indiceColunaAnoEscolar,
  linhaAnoEscolar,
  marcadorGradeAnoEscolar,
  navegarParaConsultaAnoEscolar,
  pesquisarAnoEscolar,
} from '../helpers/navigation/ano-escolar.navigation';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';

export interface AnoEscolarExcluido {
  nome: string;
  url: string;
  confirmacao?: string;
}

export interface LoteExclusaoAnoEscolarResultado {
  totalEncontrados: number;
  totalExcluidos: number;
  nomesExcluidos: string[];
  falhas: Array<{ nome: string; motivo: string }>;
}

function nomeNaLinha(linha: Locator, indiceColuna: number): Locator {
  return linha.locator('td:visible').nth(indiceColuna);
}

async function confirmarExclusao(page: Page, nome: string): Promise<string> {
  const mensagens = page.locator(
    '.swal2-popup:visible, .divMessageBox:visible, .MessageBoxContainer:visible, [role="dialog"]:visible',
  );
  const confirmacao = mensagens.last();
  await confirmacao.waitFor({ state: 'visible', timeout: 15000 });
  const texto = (await confirmacao.innerText()).trim();
  if (!/excluir|remover|apagar|tem certeza/i.test(texto)) {
    throw new Error(`A confirmação para excluir "${nome}" apresentou conteúdo inesperado: ${texto}`);
  }

  const botaoSim = confirmacao.getByRole('button', { name: /^(Sim|Excluir|Confirmar)$/i }).first();
  await botaoSim.waitFor({ state: 'visible', timeout: 10000 });
  await botaoSim.click();
  await waitForSgeLoaders(page);

  const feedback = page.locator('.swal2-popup:visible, .divMessageBox:visible, .MessageBoxContainer:visible')
    .filter({ hasText: /sucesso|excluíd|removid|erro|falha|não foi possível/i })
    .last();
  let textoFeedback = '';
  if (await feedback.isVisible().catch(() => false)) {
    textoFeedback = (await feedback.innerText().catch(() => '')).trim();
    if (/erro|falha|não foi possível|não foi exclu/i.test(textoFeedback)) {
      const ok = feedback.getByRole('button', { name: /^(Ok|OK|Fechar)$/i }).first();
      if (await ok.isVisible().catch(() => false)) await ok.click();
      throw new Error(`O SGE não confirmou a exclusão de "${nome}": ${textoFeedback}`);
    }
    const ok = feedback.getByRole('button', { name: /^(Ok|OK|Fechar)$/i }).first();
    if (await ok.isVisible().catch(() => false)) await ok.click();
  }
  return textoFeedback || texto;
}

/** Exclui somente o registro QAAUTO encontrado por nome exato e único. */
export async function excluirAnoEscolar(page: Page, nome: string): Promise<AnoEscolarExcluido> {
  const alvo = nome.trim();
  if (!isAnoEscolarQAAuto(alvo)) {
    throw new Error('A exclusão automatizada está limitada a nomes iniciados por QAAUTO.');
  }

  await pesquisarAnoEscolar(page, alvo);
  const linha = linhaAnoEscolar(page, alvo);
  await linha.waitFor({ state: 'visible', timeout: 15000 });
  if (await linha.count() !== 1) {
    throw new Error(`A exclusão exata requer uma linha para "${alvo}"; encontradas ${await linha.count()}.`);
  }

  const indiceNome = await indiceColunaAnoEscolar(page);
  const nomeDaLinha = (await nomeNaLinha(linha, indiceNome).innerText()).replace(/\s+/g, ' ').trim();
  if (nomeDaLinha.toLocaleUpperCase('pt-BR') !== alvo.toLocaleUpperCase('pt-BR')) {
    throw new Error(`A linha localizada pertence a "${nomeDaLinha}", não a "${alvo}".`);
  }
  await nomeNaLinha(linha, indiceNome).click();

  const formulario = page.locator('#main');
  await formulario.getByRole('heading', { name: /Editar Ano Escolar/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  const nomeDoFormulario = (await formulario.locator('#Nome').inputValue()).trim();
  if (nomeDoFormulario.toLocaleUpperCase('pt-BR') !== alvo.toLocaleUpperCase('pt-BR')) {
    throw new Error(`O formulário aberto pertence a "${nomeDoFormulario}", não a "${alvo}".`);
  }

  await formulario.locator('button:visible').filter({ hasText: /Excluir/i }).click();
  const confirmacao = await confirmarExclusao(page, alvo);
  await aguardarCarregamentoAnoEscolar(page);
  await navegarParaConsultaAnoEscolar(page);
  await pesquisarAnoEscolar(page, alvo);
  await linha.waitFor({ state: 'hidden', timeout: 15000 });
  return { nome: alvo, url: page.url(), confirmacao };
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

  const antes = await marcadorGradeAnoEscolar(page);
  await proxima.click();
  await aguardarCarregamentoAnoEscolar(page);
  await aguardarAtualizacaoGradeAnoEscolar(page, antes);
  return true;
}

/** Exclui pela interface os Anos Escolares cujo nome começa com QAAUTO. */
export async function excluirAnosEscolaresEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<LoteExclusaoAnoEscolarResultado> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote de Ano Escolar aceita somente o termo "QAAUTO".');
  }

  const resultado: LoteExclusaoAnoEscolarResultado = {
    totalEncontrados: 0,
    totalExcluidos: 0,
    nomesExcluidos: [],
    falhas: [],
  };
  const tentados = new Set<string>();
  await pesquisarAnoEscolar(page, 'QAAUTO');

  while (true) {
    const linhas = page.locator('#main table:visible tbody tr:visible');
    const indiceNome = await indiceColunaAnoEscolar(page);
    let nomePendente: string | undefined;

    for (let indice = 0; indice < await linhas.count(); indice++) {
      const nome = (await linhas.nth(indice).locator('td:visible').nth(indiceNome).innerText().catch(() => '')).trim();
      if (isAnoEscolarQAAuto(nome) && !tentados.has(nome)) {
        nomePendente = nome;
        break;
      }
    }

    if (nomePendente) {
      tentados.add(nomePendente);
      resultado.totalEncontrados++;
      try {
        const excluido = await excluirAnoEscolar(page, nomePendente);
        resultado.nomesExcluidos.push(excluido.nome);
      } catch (erro) {
        resultado.falhas.push({
          nome: nomePendente,
          motivo: erro instanceof Error ? erro.message : String(erro),
        });
      }
      await pesquisarAnoEscolar(page, 'QAAUTO');
      continue;
    }

    if (!await avancarPaginaDaGrade(page)) break;
  }

  resultado.totalExcluidos = resultado.nomesExcluidos.length;
  return resultado;
}
