import { expect, type Page } from '@playwright/test';
import { isOcorrenciaEscolarQAAuto } from '../factories/ocorrencia-escolar.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { linhaOcorrencia, navegarParaOcorrenciaEscolar, tituloConsultaOcorrencia } from '../helpers/navigation/ocorrencia-escolar.navigation';

export interface OcorrenciaEscolarExcluida {
  numero: string;
  descricao: string;
}

/** Exclui a ocorrência de número informado, recusando qualquer uma cuja descrição não seja QAAUTO. */
export async function excluirOcorrenciaEscolar(page: Page, numero: string): Promise<OcorrenciaEscolarExcluida> {
  await navegarParaOcorrenciaEscolar(page);
  const linha = linhaOcorrencia(page, numero);
  await expect(linha, `A ocorrência número ${numero} não está na grade.`).toHaveCount(1, { timeout: 15000 });
  // Sem timeout explícito um clique espera até o limite do teste (600 s no lote); falha cedo.
  await getByRoleSge(linha, 'cell', { name: numero, exact: true }).click({ timeout: 20000 });

  const conteudo = page.locator('#main');
  await expect(conteudo.locator('h4').filter({ hasText: /Editar Ocorrência Escolar/ })).toBeVisible({ timeout: 20000 });
  const descricao = (await conteudo.locator('#campos_ocorrencia_Parametrizacao_Descricao').inputValue()).trim();
  if (!isOcorrenciaEscolarQAAuto(descricao)) {
    throw new OcorrenciaNaoQAAutoError(numero, descricao);
  }

  await conteudo.locator('#btn_excluir').click({ timeout: 20000 });
  // A pergunta de exclusão desta tela não é um diálogo ARIA: localiza pelo texto e pelo botão "Sim".
  await expect(page.getByText(/Tem certeza que deseja excluir/i)).toBeVisible({ timeout: 15000 });
  await page.locator('button:visible').filter({ hasText: /^\s*Sim\s*$/ }).click({ timeout: 20000 });

  await expect(tituloConsultaOcorrencia(page)).toBeVisible({ timeout: 20000 });
  await expect(linhaOcorrencia(page, numero)).toHaveCount(0, { timeout: 15000 });
  return { numero, descricao };
}

/** Ocorrência que a automação se recusa a excluir por não ser QAAUTO. */
export class OcorrenciaNaoQAAutoError extends Error {
  constructor(public readonly numero: string, public readonly descricao: string) {
    super(`A ocorrência ${numero} ("${descricao}") não é QAAUTO; a automação não a exclui.`);
  }
}

export interface ResultadoLoteExclusaoOcorrenciaEscolar {
  totalExcluidas: number;
  numerosExcluidos: string[];
  preservadas: string[];
  falhas: Array<{ numero: string; motivo: string }>;
}

/**
 * Percorre a grade pela interface, abre cada ocorrência e exclui somente as de descrição QAAUTO.
 * As demais são preservadas. Considera as linhas da primeira página da grade a cada passada.
 */
export async function excluirOcorrenciasEscolaresEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoOcorrenciaEscolar> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoOcorrenciaEscolar = {
    totalExcluidas: 0,
    numerosExcluidos: [],
    preservadas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await navegarParaOcorrenciaEscolar(page);
    // A grade carrega por ajax: espera uma linha de dados ou a mensagem de lista vazia antes de ler.
    await expect(page.locator('#main table tbody tr').or(page.locator('#main').getByText(/Nenhum resultado/)).first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#main table tbody')).not.toContainText(/Carregando/i);
    // O número é a primeira célula numérica da linha (a coluna inicial da grade vem sem texto).
    const numeros = await page.locator('#main table tbody tr').evaluateAll((linhas) => linhas
      .map((linha) => Array.from((linha as HTMLTableRowElement).cells)
        .map((celula) => celula.innerText.trim())
        .find((texto) => /^\d+$/.test(texto)))
      .filter((texto): texto is string => texto !== undefined));
    const proxima = numeros.find((numero) => !tentadas.has(numero));
    if (!proxima) break;

    tentadas.add(proxima);
    console.log(`➡️ Verificando ocorrência ${proxima}`);
    try {
      await excluirOcorrenciaEscolar(page, proxima);
      resultado.numerosExcluidos.push(proxima);
    } catch (erro) {
      if (erro instanceof OcorrenciaNaoQAAutoError) {
        resultado.preservadas.push(proxima);
      } else {
        resultado.falhas.push({ numero: proxima, motivo: erro instanceof Error ? erro.message : String(erro) });
      }
    }
  }

  resultado.totalExcluidas = resultado.numerosExcluidos.length;
  return resultado;
}
