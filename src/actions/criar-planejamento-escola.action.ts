import { expect, type Page } from '@playwright/test';
import {
  escaparTextoRegex,
  linhaPlanejamento,
  navegarParaPlanejamentoEscola,
  pesquisarPlanejamentos,
  type FiltroPlanejamentoEscola,
} from '../helpers/navigation/planejamento-escola.navigation';

export interface PlanejamentoEscolaDados extends FiltroPlanejamentoEscola {
  /** Período a lançar; vazio usa o primeiro período ainda sem planejamento na turma. */
  periodo?: string;
}

export interface PlanejamentoEscolaCriado {
  periodo: string;
}

export interface CriarPlanejamentoEscolaOpcoes {
  /**
   * Chamado assim que o salvamento é confirmado, antes das conferências na grade: se uma delas falhar,
   * o registro já pode ser excluído pela limpeza do chamador.
   */
  aoSalvar?: (criado: PlanejamentoEscolaCriado) => void;
}

/** Filtros da consulta sem o período, para a limpeza não depender dele. */
export function filtroPlanejamentoEscola(dados: PlanejamentoEscolaDados): FiltroPlanejamentoEscola {
  const { anoLetivo, tipoDeTurma, turma, tipoPlanejamento } = dados;
  return { anoLetivo, tipoDeTurma, turma, tipoPlanejamento };
}

const ROTA_SALVAR = '/planejamentoturma/postplanejamento';

/** Lança um planejamento (Escola > Planejamento > Adicionar) e confere a linha na grade. */
export async function criarPlanejamentoEscola(
  page: Page,
  dados: PlanejamentoEscolaDados,
  opcoes: CriarPlanejamentoEscolaOpcoes = {},
): Promise<PlanejamentoEscolaCriado> {
  await navegarParaPlanejamentoEscola(page);
  await pesquisarPlanejamentos(page, dados);

  await page.locator('#main #btn_add').click();
  const modal = page.locator('#modalPlanejamento');
  await expect(modal).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.swal2-popup.swal2-loading')).toBeHidden({ timeout: 30000 });
  await expect(modal.locator('#TurmaDescricao')).toHaveValue(dados.turma);
  await expect(modal.locator('#TipoDescricao')).toHaveValue(dados.tipoPlanejamento);

  const seletorPeriodo = modal.locator('#s2id_Periodo');
  await expect(seletorPeriodo).toBeVisible({ timeout: 15000 });
  await seletorPeriodo.click();
  const disponiveis = page.locator('.select2-drop-active .select2-results .select2-result:not(.select2-disabled) .select2-result-label');
  await expect(disponiveis.first(), 'Todos os períodos da turma já têm planejamento deste tipo. Exclua um antes de criar outro.').toBeVisible();
  const alvo = dados.periodo ? disponiveis.filter({ hasText: new RegExp(`^${escaparTextoRegex(dados.periodo)}$`) }) : disponiveis.first();
  await expect(alvo, `O período "${dados.periodo}" não está disponível (já lançado ou inexistente para a turma).`).toHaveCount(1);
  const periodo = (await alvo.innerText()).trim();
  await alvo.click();
  await expect(seletorPeriodo.locator('.select2-chosen')).toHaveText(periodo);

  const [resposta] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.toLowerCase() === ROTA_SALVAR && r.request().method() === 'POST', { timeout: 30000 }),
    modal.getByRole('button', { name: /^\W*Salvar$/ }).click(),
  ]);
  if (!resposta.ok()) throw new Error(`O salvamento do planejamento retornou HTTP ${resposta.status()}.`);

  const sucesso = page.locator('.swal2-popup:visible').filter({ hasText: 'Dados salvos.' });
  await expect(sucesso).toBeVisible({ timeout: 30000 });
  // A partir daqui o registro existe na base: avisa o chamador antes das conferências que podem falhar.
  opcoes.aoSalvar?.({ periodo });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(modal).toBeHidden({ timeout: 30000 });

  await pesquisarPlanejamentos(page, dados);
  const linha = linhaPlanejamento(page, periodo);
  await expect(linha, `O planejamento do período "${periodo}" deve aparecer na grade após salvar.`).toHaveCount(1);
  await expect(linha).toContainText('Não Enviado');
  return { periodo };
}
