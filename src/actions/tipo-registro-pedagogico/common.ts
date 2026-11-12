import { expect, type Page } from '@playwright/test';
import { Select2Helper } from '../../helpers/select2.helper';
import { waitForSgeLoaders } from '../../helpers/navigation/common.navigation';

export async function validarAnoLetivoSelecionado(page: Page, ano: number): Promise<void> {
  const cabecalho = page.locator('#header');
  await expect(cabecalho).toBeVisible();
  await expect(cabecalho).toContainText(new RegExp(`ANO LETIVO:\\s*${ano}`, 'i'));
}

export async function selecionarTipoTurma(page: Page, tipoTurma: string): Promise<void> {
  const controleNativo = page.locator('#main #TipoTurma');
  if (await controleNativo.isVisible()) {
    await selecionarOpcaoNativa(page, 'TipoTurma', tipoTurma);
    return;
  }
  await Select2Helper.select(page, '#TipoTurma', tipoTurma, { exactMatch: true, timeout: 20000 });
}

export async function selecionarComposicao(page: Page, composicao?: string): Promise<void> {
  const container = page.locator('#main #s2id_ComposicaoEnsinoId');
  if (!await container.isVisible()) {
    if (composicao) throw new Error(`A composição "${composicao}" está configurada, mas o formulário não a exibe.`);
    return;
  }
  if (!composicao) throw new Error('O formulário exige uma composição, mas o JSON não a configurou.');

  await page.locator('#main #ComposicaoEnsinoId option[value]:not([value=""])')
    .first().waitFor({ state: 'attached', timeout: 20000 });
  await Select2Helper.select(page, '#ComposicaoEnsinoId', composicao, { exactMatch: true, timeout: 20000 });
}

export async function selecionarAnosEscolares(page: Page, anosEscolares?: string[]): Promise<void> {
  if (!anosEscolares?.length) return;
  const container = page.locator('#main #s2id_AnosEscolares');
  await expect(container).toBeVisible({ timeout: 15000 });
  await page.locator('#main #AnosEscolares option[value]:not([value=""])')
    .first().waitFor({ state: 'attached', timeout: 20000 });
  for (const ano of anosEscolares) {
    await Select2Helper.select(page, '#AnosEscolares', ano, {
      exactMatch: true,
      isMultiple: true,
      timeout: 20000,
    });
  }
}

export async function definirAtivo(page: Page, ativo: boolean): Promise<void> {
  const controle = page.locator('#main #Ativo');
  await controle.waitFor({ state: 'attached', timeout: 10000 });
  if (await controle.isChecked() !== ativo) {
    const alternador = page.locator('#main label:has(#Ativo) .toggle');
    await expect(alternador).toBeVisible();
    await alternador.click();
  }
  await expect(controle).toBeChecked({ checked: ativo });
}

export async function selecionarOpcaoNativa(page: Page, id: string, label: string): Promise<void> {
  const controle = page.locator(`#main #${id}`);
  await expect(controle).toBeVisible();
  await controle.selectOption({ label });
  await expect(controle.locator('option:checked')).toHaveText(label);
}

export async function selecionarOpcaoConfiguravel(page: Page, id: string, label: string): Promise<void> {
  const containerSelect2 = page.locator('#main #s2id_' + id);
  if (await containerSelect2.count() > 0 && await containerSelect2.isVisible()) {
    await Select2Helper.select(page, '#' + id, label, { exactMatch: true, timeout: 20000 });
    return;
  }
  await selecionarOpcaoNativa(page, id, label);
}

export async function salvarTipoRegistroPedagogico(page: Page, descricao: string): Promise<void> {
  const salvar = page.locator('#main #btn_salvar:visible');
  await expect(salvar).toBeVisible();
  await salvar.click();

  const mensagensFinais = /salv[oa].*sucesso|cadastrad[oa]?.*sucesso|criad[oa]?.*sucesso|sucesso|erro|falha|inválid|obrigatóri|duplicad|já existe|não foi possível/i;
  const feedback = page.locator('.swal2-popup:visible')
    .filter({ hasText: mensagensFinais })
    .last();
  await expect(feedback).toBeVisible({ timeout: 20000 });
  const tituloFeedback = feedback.locator('#swal2-title');
  const conteudoFeedback = feedback.locator('#swal2-content');
  const titulo = (await tituloFeedback.innerText()).trim();
  const conteudo = (await conteudoFeedback.innerText()).trim();
  const mensagem = [titulo, conteudo].filter(Boolean).join(' ').trim();
  if (/(erro|falha|inválid|obrigatóri|duplicad|não foi possível)/i.test(mensagem)) {
    throw new Error(`O SGE não confirmou a criação de "${descricao}": ${mensagem}`);
  }
  await expect(conteudoFeedback).toContainText('Tipo de registro pedagógico adicionado');
  if (!/(salv|cadastrad|criad|sucesso)/i.test(mensagem)) {
    throw new Error(`O SGE exibiu uma confirmação inesperada para "${descricao}": ${mensagem}`);
  }
  console.log(`[QAAUTO] Feedback final do SGE para "${descricao}": ${mensagem}`);
  await feedback.locator('.swal2-confirm:visible').click();
  await expect(feedback).toBeHidden({ timeout: 15000 });
  await waitForSgeLoaders(page);
}
