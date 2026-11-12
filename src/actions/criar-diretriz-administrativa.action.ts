import {expect, type Page} from '@playwright/test';
import {buildDiretrizAdministrativa, type AlvoDiretrizAdministrativa, type DiretrizAdministrativaDados} from '../factories/diretriz-administrativa.factory';
import {waitForSgeLoaders} from '../helpers/navigation/common.navigation';
import {colunaDiretriz, linhasDiretrizAdministrativa, voltarParaConsultaDiretrizAdministrativa} from '../helpers/navigation/diretriz-administrativa.navigation';

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function selecionar(page: Page, id: string, texto: string): Promise<void> {
  // Selects dependentes (cargo) são preenchidos por requisição após a escolha da função.
  await expect(page.locator(`#${id} option:not([value=""])`), `${id}: nenhuma opção carregada. Verifique os dados de apoio do tenant.`).not.toHaveCount(0);
  await page.locator(`#s2id_${id} .select2-choice`).click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const textos = (await opcoes.allInnerTexts()).map(x => x.trim());
  const alvo = opcoes.filter({hasText: new RegExp(`^\\s*${escapar(texto)}(\\s+-\\s+\\d+)?\\s*$`)});
  if (await alvo.count() !== 1) {
    await page.keyboard.press('Escape');
    throw new Error(`${id}: opção "${texto}" ausente ou ambígua. Opções: ${textos.join(' | ') || 'nenhuma'}. Verifique os dados de apoio do tenant.`);
  }
  await alvo.click();
  await waitForSgeLoaders(page);
}

export async function criarDiretrizAdministrativa(page: Page, dados: DiretrizAdministrativaDados, aoCriar?: (alvo: AlvoDiretrizAdministrativa) => void): Promise<AlvoDiretrizAdministrativa> {
  const d = buildDiretrizAdministrativa(dados);
  const alvo: AlvoDiretrizAdministrativa = {...d};
  // O SGE aceita diretrizes duplicadas e o formulário não tem campo para marcar QAAUTO:
  // não cria (nem exclui depois) se já existir uma diretriz equivalente, para preservar o registro existente.
  await expect(await linhasDiretrizAdministrativa(page, alvo, false), `Já existe diretriz de ${d.funcao} / ${d.cargo} / ${d.turno} na unidade ${d.unidade}; preserve o registro existente ou ajuste os dados.`).toHaveCount(0);

  const m = page.locator('#main');
  await m.locator('button').filter({hasText: 'Adicionar'}).first().click();
  await expect(m.locator('h4').filter({hasText: 'Adicionar Diretriz'})).toBeVisible();
  await waitForSgeLoaders(page);
  await selecionar(page, 'EscolaId', d.unidade);
  await selecionar(page, 'FuncaoId', d.funcao);
  await selecionar(page, 'CargoId', d.cargo);
  await m.locator('#Turno').selectOption(d.turno);
  await selecionar(page, 'DepartamentoId', d.departamento);
  await m.locator('#QuantidadeHorasSemanais').fill(d.horasSemanais);
  await m.locator('#QuantidadeDeVagas').fill(d.vagas);
  await expect(m.locator('#QuantidadeHorasSemanais')).toHaveValue(d.horasSemanais);
  await expect(m.locator('#QuantidadeDeVagas')).toHaveValue(d.vagas);

  const [gravacao] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === '/diretriz/posteditar' && x.request().method() === 'POST', {timeout: 60000}),
    m.locator('#btn_salvar').click(),
  ]);
  if (!gravacao.ok()) throw new Error(`Gravação da diretriz: HTTP ${gravacao.status()}.`);
  aoCriar?.(alvo);
  // Após gravar, o SGE abre a edição do registro criado (campos principais travados).
  await expect(m.locator('h4').filter({hasText: 'Editar Diretriz'})).toBeVisible();
  await expect(m.locator('#Turno')).toHaveValue(d.turno);
  await expect(m.locator('#QuantidadeHorasSemanais')).toHaveValue(d.horasSemanais);
  await expect(m.locator('#QuantidadeDeVagas')).toHaveValue(d.vagas);

  await voltarParaConsultaDiretrizAdministrativa(page);
  const linhas = await linhasDiretrizAdministrativa(page, alvo);
  await expect(linhas).toHaveCount(1);
  await expect(linhas).toBeVisible();
  // Recém-criada: sem modulações e com todas as vagas disponíveis.
  await expect(linhas.locator(`td:nth-child(${colunaDiretriz.moduladas})`)).toHaveText('0');
  await expect(linhas.locator('td:nth-child(10)')).toHaveText(d.vagas);
  return alvo;
}
