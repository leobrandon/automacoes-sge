import { expect, type Page } from '@playwright/test';
import { isAcompanhamentoQAAuto } from '../factories/acompanhamento.factory';
import {
  linhaAcompanhamento,
  pesquisarAcompanhamento,
  tituloConsultaAcompanhamento,
  voltarParaConsultaAcompanhamento,
} from '../helpers/navigation/acompanhamento.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface AlvoAcompanhamento {
  tipoPauta: string;
  escola: string;
  /** Nome do período sem as datas (ex.: "4º Bimestre", "Anual"). */
  periodo: string;
}

export interface AcompanhamentoConcluido extends AlvoAcompanhamento {
  url: string;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Conclui o acompanhamento QAAUTO de pauta + escola + período exatos, pelo botão "Concluir" da edição.
 * É o único encerramento que a tela oferece (não há exclusão), e é irreversível: depois dele os dados
 * não podem mais ser alterados.
 */
export async function concluirAcompanhamento(page: Page, alvo: AlvoAcompanhamento): Promise<AcompanhamentoConcluido> {
  const tipoPauta = alvo.tipoPauta.trim();
  const escola = alvo.escola.trim();
  const periodo = alvo.periodo.trim();
  if (!isAcompanhamentoQAAuto(tipoPauta) || !escola || !periodo) {
    throw new Error('A conclusão automatizada exige tipoPauta (QAAUTO), escola e período exatos do acompanhamento.');
  }

  await pesquisarAcompanhamento(page, tipoPauta);
  const linha = linhaAcompanhamento(page, tipoPauta, periodo, escola);
  const encontrados = await linha.count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Acompanhamento de "${tipoPauta}" / ${escola} / ${periodo} na consulta, encontrados ${encontrados}. `
      + 'Execute criar_acompanhamento_action antes ou ajuste dados_conclusao_acompanhamento.json.',
    );
  }
  if (await linha.getByText('Concluído', { exact: true }).count() > 0) {
    throw new Error(`O Acompanhamento de "${tipoPauta}" / ${escola} / ${periodo} já está concluído.`);
  }

  const conteudo = page.locator('#main');
  await linha.locator('strong').filter({ hasText: new RegExp(`^\\s*${escaparRegex(tipoPauta)}\\s*$`, 'i') }).click();
  await expect(conteudo).toContainText(/Status da pauta\s+(Aberto|Em preenchimento)/, { timeout: 20000 });
  await expect(conteudo).toContainText(escola);

  const concluir = getByRoleSge(conteudo, 'button', { name: /Concluir/ });
  await expect(concluir).toBeVisible();
  await concluir.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Deseja realmente concluir este acompanhamento/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  // O SweetAlert reaproveita o mesmo diálogo: a pergunta some antes do resultado aparecer.
  await expect(confirmacao).toBeHidden({ timeout: 15000 });
  // O aviso de sucesso some sozinho junto com o recarregamento da página (às vezes antes de dar para
  // observá-lo), então a prova da conclusão é o estado da página, e não o diálogo. Se o SGE recusar, o aviso
  // "Atenção" fica na tela e explica o motivo.
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(conteudo).toContainText(/Status da pauta\s+Concluído/, { timeout: 20000 })
    .catch(async (erro) => {
      if (await atencao.first().isVisible()) {
        const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
        throw new Error(`O SGE não concluiu o Acompanhamento de "${tipoPauta}" / ${escola} / ${periodo}: ${aviso}`);
      }
      throw erro;
    });
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });
  // Concluído = somente leitura: sem Salvar/Concluir e com quem concluiu e quando.
  await expect(conteudo).toContainText(/Concluído por:/);
  await expect(conteudo).toContainText(/Concluído em:/);
  await expect(getByRoleSge(conteudo, 'button', { name: /Concluir/ })).toHaveCount(0);
  await expect(getByRoleSge(conteudo, 'button', { name: /Salvar/ })).toHaveCount(0);

  await voltarParaConsultaAcompanhamento(page);
  await pesquisarAcompanhamento(page, tipoPauta);
  const concluida = linhaAcompanhamento(page, tipoPauta, periodo, escola);
  await expect(concluida).toHaveCount(1, { timeout: 15000 });
  await expect(concluida).toContainText('Concluído');
  await expect(tituloConsultaAcompanhamento(page)).toBeVisible();

  console.log(`[QAAUTO] Acompanhamento concluído e conferido: ${tipoPauta} / ${escola} / ${periodo}`);
  return { tipoPauta, escola, periodo, url: page.url() };
}
