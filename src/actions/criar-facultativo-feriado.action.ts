import { expect, type Page } from '@playwright/test';
import {
  buildFacultativoFeriado,
  type BuildFacultativoFeriadoOptions,
  type FacultativoFeriadoData,
} from '../factories/facultativo-feriado.factory';
import { datepicker } from '../helpers/datepicker.helper';
import {
  abrirEdicaoFacultativoFeriado,
  linhaFacultativoFeriado,
  navegarParaAdicionarFacultativoFeriado,
  pesquisarFacultativoFeriado,
  proximaSequenciaLivreFacultativoFeriado,
  tituloConsultaFacultativoFeriado,
  voltarParaConsultaFacultativoFeriado,
} from '../helpers/navigation/facultativo-feriado.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface FacultativoFeriadoCriado extends FacultativoFeriadoData {
  url: string;
}

async function definirFacultativo(page: Page, esperado: boolean): Promise<void> {
  const campo = page.locator('#main #Facultativo');
  if (await campo.isChecked() !== esperado) {
    // O input é estilizado pelo tema; o clique vai no rótulo visível.
    await page.locator('#main label.checkbox').filter({ hasText: 'Facultativo' }).click();
  }
  await expect(campo).toBeChecked({ checked: esperado });
}

const REGEX_DUPLICIDADE = /J[áa] existe um feriado cadastrado com a (data|descri[çc][ãa]o)/i;
const LIMITE_TENTATIVAS_DUPLICIDADE = 30;

/**
 * Clica em Salvar. Devolve [] quando o SGE aceitou (voltou para a consulta) ou as mensagens de
 * validação quando recusou e manteve o formulário.
 */
async function salvarFormulario(page: Page): Promise<string[]> {
  const formulario = page.locator('#main');
  const form = formulario.locator('#form_feriado');
  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();

  // O formulário é substituído por inteiro após a resposta; marca o atual para distinguir o novo.
  await form.evaluate((elemento) => elemento.setAttribute('data-tentativa-anterior', 'true'));
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase() === '/pontoferiado/posteditar' && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    salvar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`O salvamento do Feriado/Facultativo retornou HTTP ${resposta.status()}.`);
  }

  // Salvar aceito volta sozinho para a consulta; recusado reexibe o formulário com as mensagens.
  const consulta = tituloConsultaFacultativoFeriado(page);
  const formularioRecusado = formulario.locator('#form_feriado:not([data-tentativa-anterior])');
  await expect(consulta.or(formularioRecusado)).toBeVisible({ timeout: 20000 });
  if (await consulta.isVisible()) return [];

  const mensagens = (await formularioRecusado.locator('[data-valmsg-for]').allInnerTexts())
    .map((texto) => texto.trim())
    .filter(Boolean);
  if (mensagens.length === 0) {
    throw new Error('O SGE manteve o formulário aberto sem mensagem de validação visível.');
  }
  return mensagens;
}

/** Cria pela interface e prova a persistência na grade e na edição do registro. */
export async function criarFacultativoFeriado(
  page: Page,
  options: BuildFacultativoFeriadoOptions = {},
  sequencia = 1,
): Promise<FacultativoFeriadoCriado> {
  // Descrição e data são únicas no SGE. A consulta só filtra por descrição, então parte da primeira
  // sequência com descrição livre e, se a data já for de outro registro (ex.: um Feriado QAAUTO
  // anterior ou um feriado real do tenant), avança a sequência conforme a rejeição do SGE.
  let proxima = await proximaSequenciaLivreFacultativoFeriado(page, options, sequencia);
  let dados = buildFacultativoFeriado(options, proxima);
  await navegarParaAdicionarFacultativoFeriado(page);

  const formulario = page.locator('#main');
  for (let tentativa = 1; ; tentativa++) {
    await formulario.locator('#Descricao').fill(dados.descricao);
    await datepicker.fill(page, '#main #Data', dados.data);
    await definirFacultativo(page, dados.facultativo);

    const mensagens = await salvarFormulario(page);
    if (mensagens.length === 0) break;

    const colisao = mensagens.some((mensagem) => REGEX_DUPLICIDADE.test(mensagem));
    if (!colisao || tentativa >= LIMITE_TENTATIVAS_DUPLICIDADE) {
      throw new Error(`O SGE rejeitou "${dados.descricao}" (${dados.data}): ${mensagens.join(' | ')}`);
    }
    console.log(`[QAAUTO] SGE recusou "${dados.descricao}" (${dados.data}): ${mensagens.join(' | ')} Tentando a próxima sequência.`);
    proxima = await proximaSequenciaLivreFacultativoFeriado(page, options, dados.sequencia + 1);
    dados = buildFacultativoFeriado(options, proxima);
    await navegarParaAdicionarFacultativoFeriado(page);
  }

  await pesquisarFacultativoFeriado(page, dados.descricao);
  const linha = linhaFacultativoFeriado(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha).toContainText(dados.data);

  // A grade não mostra o indicador Facultativo; confere pela edição e volta para a consulta.
  await abrirEdicaoFacultativoFeriado(page, dados.descricao);
  await expect(formulario.locator('#Data')).toHaveValue(dados.data);
  await expect(formulario.locator('#Facultativo')).toBeChecked({ checked: dados.facultativo });
  await voltarParaConsultaFacultativoFeriado(page);

  console.log(`[QAAUTO] ${dados.facultativo ? 'Facultativo' : 'Feriado'} criado e conferido: ${dados.descricao} | ${dados.data}`);
  return { ...dados, url: page.url() };
}
