import { expect, type Locator, type Page } from '@playwright/test';
import { contemQAAuto, dataValidaConselho } from '../factories/conselho-escolar.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirVigencia,
  botaoExcluirVigencia,
  confirmarPerguntaConselho,
  fecharAvisoConselho,
  linhaVigencia,
  navegarParaConselhoEscolar,
  tabelaAnexos,
  tabelaMembros,
} from '../helpers/navigation/conselho-escolar.navigation';

export interface VigenciaConselhoExcluida {
  dataInicio: string;
  dataFim: string;
  membrosRemovidos: number;
  anexosRemovidos: number;
  url: string;
}

function linhasComExcluir(tabela: Locator, page: Page): Locator {
  return tabela.locator('tbody tr').filter({ has: page.getByTitle('Excluir', { exact: true }) });
}

/** Remove um item da tabela (anexo ou membro) pela lixeira e prova que a linha saiu. */
async function removerPrimeiraLinha(
  page: Page,
  linhas: Locator,
  pergunta: RegExp,
  sucesso: RegExp,
): Promise<void> {
  const antes = await linhas.count();
  await linhas.first().getByTitle('Excluir', { exact: true }).click();
  await confirmarPerguntaConselho(page, pergunta);
  await fecharAvisoConselho(page, sucesso);
  await expect(linhas).toHaveCount(antes - 1, { timeout: 15000 });
}

/**
 * Exclui a vigência identificada pelas datas exatas, removendo antes anexos e membros
 * (o SGE recusa excluir vigência com vínculos). Recusa tocar em anexo ou membro de
 * comunidade que não seja QAAUTO.
 */
export async function excluirVigenciaConselhoEscolar(
  page: Page,
  alvo: { dataInicio: string; dataFim: string },
): Promise<VigenciaConselhoExcluida> {
  const { dataInicio, dataFim } = alvo;
  if (!dataValidaConselho(dataInicio) || !dataValidaConselho(dataFim)) {
    throw new Error('Informe dataInicio e dataFim da vigência no formato DD/MM/AAAA.');
  }

  await abrirVigencia(page, dataInicio, dataFim);

  const anexos = linhasComExcluir(tabelaAnexos(page), page);
  const membros = linhasComExcluir(tabelaMembros(page), page);

  const anexosTotal = await anexos.count();
  for (let indice = 0; indice < anexosTotal; indice++) {
    const texto = (await anexos.first().innerText()).replace(/\s+/g, ' ').trim();
    if (!contemQAAuto(texto)) {
      throw new Error(`Recusado: o anexo "${texto}" da vigência ${dataInicio} a ${dataFim} não é QAAUTO.`);
    }
    await removerPrimeiraLinha(page, anexos, /Tem certeza que deseja remover esse anexo/i, /O anexo foi removido/i);
  }

  const membrosTotal = await membros.count();
  for (let indice = 0; indice < membrosTotal; indice++) {
    const linha = membros.first();
    const texto = (await linha.innerText()).replace(/\s+/g, ' ').trim();
    const comunidade = await getByRoleSge(linha, 'cell', { name: 'Comunidade', exact: true }).count();
    if (comunidade > 0 && !contemQAAuto(texto)) {
      throw new Error(`Recusado: o membro de comunidade "${texto}" da vigência ${dataInicio} a ${dataFim} não é QAAUTO.`);
    }
    await removerPrimeiraLinha(page, membros, /Tem certeza que deseja remover esse membro/i, /O membro foi removido/i);
  }

  await botaoExcluirVigencia(page).click();
  await confirmarPerguntaConselho(page, /Tem certeza que deseja remover essa vigência/i);
  await fecharAvisoConselho(page, /A vigência do conselho escolar foi excluída/i);

  await navegarParaConselhoEscolar(page);
  await expect(linhaVigencia(page, dataInicio, dataFim)).toHaveCount(0, { timeout: 15000 });
  return { dataInicio, dataFim, membrosRemovidos: membrosTotal, anexosRemovidos: anexosTotal, url: page.url() };
}
