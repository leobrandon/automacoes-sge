import { expect, type Locator, type Page } from '@playwright/test';
import { isMotivoConcessaoQAAuto } from '../factories/motivo-concessao.factory';
import {
  abrirEdicaoMotivoConcessao,
  confirmarSucessoMotivoConcessao,
  definirToggleMotivoConcessao,
  linhaMotivoConcessao,
  pesquisarMotivoConcessao,
  salvarMotivoConcessao,
  situacaoMotivoConcessao,
} from '../helpers/navigation/motivo-concessao.navigation';

export interface MotivoConcessaoInativado {
  titulo: string;
  /** `true` quando o Motivo já estava inativo e nada foi alterado. */
  jaEstavaInativo: boolean;
  url: string;
}

export interface ResultadoLoteInativacaoMotivoConcessao {
  totalInativados: number;
  titulosInativados: string[];
  falhas: Array<{ titulo: string; motivo: string }>;
}

/**
 * Inativa (não há exclusão) somente o Motivo QAAUTO de título exato, pelo toggle "Ativo" do
 * formulário de edição, e prova o resultado na grade.
 */
export async function inativarMotivoConcessao(page: Page, titulo: string): Promise<MotivoConcessaoInativado> {
  const alvo = titulo.trim();
  if (!isMotivoConcessaoQAAuto(alvo)) {
    throw new Error('A inativação automatizada exige o título exato de um Motivo de Concessão QAAUTO.');
  }

  await pesquisarMotivoConcessao(page, alvo);
  const encontrados = await linhaMotivoConcessao(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Motivo de Concessão "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_motivo_concessao_action antes ou ajuste o título em dados_inativacao_motivo_concessao.json.',
    );
  }

  if (await situacaoMotivoConcessao(linhaMotivoConcessao(page, alvo), 'Inativo').count() === 1) {
    return { titulo: alvo, jaEstavaInativo: true, url: page.url() };
  }

  await abrirEdicaoMotivoConcessao(page, alvo);
  await definirToggleMotivoConcessao(page, 'Ativo', false);
  await salvarMotivoConcessao(page);
  await confirmarSucessoMotivoConcessao(page, alvo);

  await pesquisarMotivoConcessao(page, alvo);
  await expect(situacaoMotivoConcessao(linhaMotivoConcessao(page, alvo), 'Inativo')).toHaveCount(1, { timeout: 15000 });

  console.log(`[QAAUTO] Motivo de Concessão inativado e conferido na grade: ${alvo}`);
  return { titulo: alvo, jaEstavaInativo: false, url: page.url() };
}

function linhasAtivas(page: Page): Locator {
  return page.locator('#main #grid table tbody tr').filter({
    has: page.locator('td:last-child i[title="Ativo"]'),
  });
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e inativa só títulos iniciados por
 * QAAUTO que ainda estejam ativos. Itens que falharem não são reprocessados.
 */
export async function inativarMotivosConcessaoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteInativacaoMotivoConcessao> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A inativação em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteInativacaoMotivoConcessao = {
    totalInativados: 0,
    titulosInativados: [],
    falhas: [],
  };
  const tentados = new Set<string>();

  while (true) {
    await pesquisarMotivoConcessao(page, 'QAAUTO');
    const titulos = (await linhasAtivas(page).locator('td:nth-child(2)').allInnerTexts()).map((texto) => texto.trim());
    const proximo = titulos.find((titulo) => isMotivoConcessaoQAAuto(titulo) && !tentados.has(titulo));
    if (!proximo) break;

    tentados.add(proximo);
    try {
      await inativarMotivoConcessao(page, proximo);
      resultado.titulosInativados.push(proximo);
    } catch (erro) {
      resultado.falhas.push({
        titulo: proximo,
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  resultado.totalInativados = resultado.titulosInativados.length;
  return resultado;
}
