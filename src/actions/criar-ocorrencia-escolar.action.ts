import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildOcorrenciaEscolar,
  type EnvolvidoOcorrenciaEscolar,
  type OcorrenciaEscolarCriada,
  type OcorrenciaEscolarData,
} from '../factories/ocorrencia-escolar.factory';
import { DatepickerHelper } from '../helpers/datepicker.helper';
import { Select2Helper } from '../helpers/select2.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { fecharAvisoConselho } from '../helpers/navigation/conselho-escolar.navigation';
import { navegarParaOcorrenciaEscolar, tituloConsultaOcorrencia } from '../helpers/navigation/ocorrencia-escolar.navigation';

const CAMPO = '#campos_ocorrencia_Parametrizacao_';

function main(page: Page): Locator {
  return page.locator('#main');
}

async function abrirFormularioNovaOcorrencia(page: Page): Promise<void> {
  await navegarParaOcorrenciaEscolar(page);
  await getByRoleSge(main(page), 'button', { name: /Adicionar/ }).first().click();
  await expect(main(page).locator('h4').filter({ hasText: /Adicionar Ocorrência Escolar/ })).toBeVisible({ timeout: 15000 });
}

async function adicionarEnvolvido(page: Page, envolvido: EnvolvidoOcorrenciaEscolar): Promise<void> {
  const conteudo = main(page);
  await getByRoleSge(conteudo, 'link', { name: 'Envolvidos', exact: true }).click();
  await getByRoleSge(conteudo, 'button', { name: /Adicionar envolvido/ }).click();

  const modal = page.locator('.modal:visible').filter({ has: page.locator('#TipoDeEnvolvimento') });
  await expect(modal).toBeVisible({ timeout: 15000 });
  await Select2Helper.select(page, '#TipoDeEnvolvimento', envolvido.envolvimento, { exactMatch: true });

  const seletorAluno = modal.locator('.select2-container').filter({ hasText: /Pesquise pelo nome/ });
  await seletorAluno.locator('a.select2-choice').click();
  await page.locator('.select2-drop:visible input.select2-input').fill(envolvido.busca);
  const opcao = page.locator('.select2-drop:visible .select2-results li').filter({ hasText: envolvido.matricula });
  await expect(opcao, `Aluno com matrícula ${envolvido.matricula} não encontrado na busca "${envolvido.busca}".`)
    .toHaveCount(1, { timeout: 20000 });
  await opcao.click();

  await getByRoleSge(modal, 'button', { name: /Salvar/ }).click();
  await expect(modal).toBeHidden({ timeout: 15000 });
  await expect(conteudo.locator('table tbody tr').filter({ hasText: envolvido.envolvimento }))
    .toHaveCount(1, { timeout: 15000 });
}

/** Cria a ocorrência escolar pela UI e confere os dados persistidos na edição aberta pelo salvamento. */
export async function criarOcorrenciaEscolar(
  page: Page,
  dados: OcorrenciaEscolarData,
  sequencia = 1,
): Promise<OcorrenciaEscolarCriada> {
  const registro = buildOcorrenciaEscolar(dados, sequencia);
  await abrirFormularioNovaOcorrencia(page);

  await Select2Helper.select(page, '#TipoOcorrenciaEscolarId', dados.tipo, { exactMatch: true });
  await expect(page.locator(`${CAMPO}NaturezaDaOcorrencia`)).toBeAttached({ timeout: 20000 });
  await Select2Helper.select(page, `${CAMPO}NaturezaDaOcorrencia`, dados.natureza, { exactMatch: true });
  await DatepickerHelper.fill(page, `${CAMPO}DataDaOcorrencia`, registro.dataOcorrencia);
  if (dados.turno) {
    await Select2Helper.select(page, `${CAMPO}TurnoDaOcorrencia`, dados.turno, { exactMatch: true });
  }
  await main(page).locator(`${CAMPO}Descricao`).fill(registro.descricao);
  await main(page).locator(`${CAMPO}ProcedimentoAdotado`).fill(registro.procedimento);
  for (const envolvido of dados.envolvidos) {
    await adicionarEnvolvido(page, envolvido);
  }

  await main(page).locator('#btn_salvar_ocorrencia_escolar').click();
  await fecharAvisoConselho(page, /A ocorrência escolar foi criada/i);

  const conteudo = main(page);
  await expect(conteudo.locator('h4').filter({ hasText: /Editar Ocorrência Escolar/ })).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator(`${CAMPO}Descricao`)).toHaveValue(registro.descricao);
  await expect(conteudo.locator(`${CAMPO}ProcedimentoAdotado`)).toHaveValue(registro.procedimento);
  await expect(conteudo.locator(`${CAMPO}DataDaOcorrencia`)).toHaveValue(registro.dataOcorrencia);
  await expect(conteudo.locator(`${CAMPO}NaturezaDaOcorrencia`).locator('option:checked')).toHaveText(registro.natureza);

  const numero = (await conteudo.locator('#Numero').inputValue()).trim();
  expect(numero, 'O SGE não exibiu o número da ocorrência criada.').toMatch(/^\d+$/);
  return { ...registro, numero };
}

/** Recusa: salvar sem a natureza obrigatória do tipo, sem gravar nada. */
export async function validarRecusasOcorrenciaEscolar(page: Page, dados: OcorrenciaEscolarData): Promise<void> {
  await abrirFormularioNovaOcorrencia(page);
  await Select2Helper.select(page, '#TipoOcorrenciaEscolarId', dados.tipo, { exactMatch: true });
  await expect(page.locator(`${CAMPO}NaturezaDaOcorrencia`)).toBeAttached({ timeout: 20000 });

  await main(page).locator('#btn_salvar_ocorrencia_escolar').click();
  await fecharAvisoConselho(page, /Verifique os dados informados/i);
  await expect(main(page).locator('.span-error-validator').filter({ hasText: 'Campo obrigatório.' })).toBeVisible();

  await main(page).locator('a.btn, button').filter({ hasText: /^\s*Voltar\s*$/ }).click();
  await expect(tituloConsultaOcorrencia(page)).toBeVisible({ timeout: 15000 });
}
