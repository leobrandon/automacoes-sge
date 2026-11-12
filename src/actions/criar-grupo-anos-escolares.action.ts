import { expect, type Page } from '@playwright/test';
import {
  buildGrupoAnosEscolares,
  type GrupoAnosEscolaresDados,
} from '../factories/grupo-anos-escolares.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  avisoGrupoAnos,
  consultaGrupoAnos,
  linhaGrupoAnos,
  pesquisarGrupoAnos,
} from '../helpers/navigation/grupo-anos-escolares.navigation';
async function selecionar(page: Page, id: string, texto: string, multiplo: boolean): Promise<void> {
  const container = page.locator(`#s2id_${id}`);
  await container.locator(multiplo ? '.select2-choices' : '.select2-choice').click();
  const drop = page.locator('.select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const textos = (await opcoes.allInnerTexts()).map((x) => x.trim());
  if (!textos.includes(texto)) {
    await page.keyboard.press('Escape');
    throw new Error(
      `${id}: opção "${texto}" indisponível. Opções: ${textos.join(' | ') || 'nenhuma'}. Verifique os dados de apoio do tenant.`,
    );
  }
  const opcao = opcoes.filter({
    hasText: new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`),
  });
  await expect(opcao).toHaveCount(1);
  await opcao.click();
}
export async function criarGrupoAnosEscolares(
  page: Page,
  dados: GrupoAnosEscolaresDados,
  sequencia = 1,
): Promise<string> {
  const d = buildGrupoAnosEscolares(dados, sequencia);
  await consultaGrupoAnos(page);
  const m = page.locator('#main');
  await m.getByTitle('Adicionar Grupo de Anos Escolares').click();
  await expect(m.locator('#Descricao')).toBeVisible();
  await m.locator('#Descricao').fill(d.descricao);
  for (const [id, valor] of [
    ['ListaDeTipoDeTurma', d.tipoTurma],
    ['LocalizacaoDiferenciada', d.localizacao],
    ['FonteEnergiaEletrica', d.energia],
    ['OrigemUnidade', d.origem],
    ['ListaDeTurno', d.turno],
    ['ListaDeComposicaoEnsino', d.composicao],
  ])
    await selecionar(page, id, valor, true);
  await selecionar(page, 'TipoAtendimento', d.atendimento, false);
  const salvar = getByRoleSge(m, 'button', { name: /Salvar/ });
  await expect(salvar).toBeVisible();
  await salvar.click();
  await avisoGrupoAnos(page, /Grupo de anos escolares adicionado!/i);
  await expect(
    m.locator('h4').filter({ hasText: 'Consulta de Grupos de Anos Escolares' }),
  ).toBeVisible();
  await pesquisarGrupoAnos(page, d.descricao);
  await expect(linhaGrupoAnos(page, d.descricao)).toHaveCount(1);
  return d.descricao;
}
