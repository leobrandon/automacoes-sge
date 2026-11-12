import { expect, type Locator, type Page } from '@playwright/test';
import type { AtividadesEspecificasData } from '../../factories/tipo-registro-pedagogico.factory';
import { Select2Helper } from '../../helpers/select2.helper';
import { getByRoleSge } from '../../helpers/sge-locators.helper';
import { navegarParaAdicionarTipoRegistroPedagogico } from '../../helpers/navigation/tipo-registro-pedagogico.navigation';
import { waitForSgeLoaders } from '../../helpers/navigation/common.navigation';
import {
  definirAtivo,
  salvarTipoRegistroPedagogico,
  selecionarComposicao,
  selecionarTipoTurma,
  validarAnoLetivoSelecionado,
} from './common';
import type { TipoRegistroPedagogicoCriado } from './tipo-registro-pedagogico.types';

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function localizarCampoDialogo(dialog: Locator, rotuloTexto: string): Promise<{ campo: Locator; id?: string }> {
  const textoEscapado = escaparRegex(rotuloTexto);
  const rotulo = dialog.locator('label').filter({
    hasText: new RegExp(`^\\s*${textoEscapado}\\s*\\*?\\s*$`, 'i'),
  });
  await expect(rotulo, `rótulo do campo "${rotuloTexto}"`).toHaveCount(1);
  const idDoRotulo = await rotulo.getAttribute('for') ?? undefined;
  const controlesNoRotulo = rotulo.locator('input, select, textarea');
  const paiDoRotulo = rotulo.locator('..');
  const seletoresNoPai = paiDoRotulo.locator('select');
  const campo = idDoRotulo
    ? dialog.locator(`[id="${idDoRotulo}"]`)
    : (await controlesNoRotulo.count()) > 0
      ? controlesNoRotulo
      : (await seletoresNoPai.count()) === 1
        ? seletoresNoPai
        : paiDoRotulo.locator('input, select, textarea');
  await expect(campo, `controle do campo "${rotuloTexto}"`).toHaveCount(1);
  const id = idDoRotulo ?? await campo.getAttribute('id') ?? undefined;
  return { campo, ...(id ? { id } : {}) };
}

async function selecionarTipoItem(
  page: Page,
  dialog: Locator,
  tipo: AtividadesEspecificasData['item']['tipo'],
): Promise<void> {
  const { campo, id } = await localizarCampoDialogo(dialog, 'Tipo');
  const tag = await campo.evaluate((elemento) => elemento.tagName.toLocaleUpperCase('pt-BR'));
  if (tag !== 'SELECT') throw new Error('O campo Tipo do item não é um seletor reconhecido pelo formulário.');

  if (await campo.isVisible()) {
    await campo.selectOption({ label: tipo });
    await expect(campo.locator('option:checked')).toHaveText(tipo);
    return;
  }
  if (!id) throw new Error('O seletor de Tipo do item está oculto e não possui vínculo com seu rótulo.');
  await Select2Helper.select(page, `#${id}`, tipo, { exactMatch: true, timeout: 20000 });
}

async function definirItemObrigatorio(
  page: Page,
  dialog: Locator,
  obrigatorio: boolean,
): Promise<void> {
  const { campo, id } = await localizarCampoDialogo(dialog, 'Preenchimento obrigatório');
  const tag = await campo.evaluate((elemento) => elemento.tagName.toLocaleUpperCase('pt-BR'));
  const tipo = await campo.getAttribute('type');

  if (tag === 'INPUT' && (tipo === 'checkbox' || tipo === 'switch')) {
    await campo.setChecked(obrigatorio);
    await expect(campo).toBeChecked({ checked: obrigatorio });
    return;
  }
  if (tag === 'SELECT') {
    const valor = obrigatorio ? 'Sim' : 'Não';
    if (await campo.isVisible()) {
      await campo.selectOption({ label: valor });
      await expect(campo.locator('option:checked')).toHaveText(valor);
      return;
    }
    if (id) {
      await Select2Helper.select(page, `#${id}`, valor, { exactMatch: true, timeout: 20000 });
      return;
    }
  }

  const opcao = getByRoleSge(dialog, 'radio', { name: obrigatorio ? /^Sim$/i : /^Não$/i });
  await expect(opcao).toBeVisible();
  await opcao.setChecked(obrigatorio);
  await expect(opcao).toBeChecked({ checked: obrigatorio });
}

async function confirmarSalvarFilho(page: Page, dialog: Locator, descricao: string): Promise<void> {
  await getByRoleSge(dialog, 'button', { name: /Salvar/ }).click();
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);

  const feedback = page.locator('.swal2-popup:visible:not(.swal2-loading)');
  await expect.poll(async () => await feedback.isVisible() || !await dialog.isVisible(), {
    timeout: 15000,
    message: `aguardar confirmação ou fechamento do modal de "${descricao}"`,
  }).toBe(true);
  if (await feedback.isVisible()) {
    const mensagem = (await feedback.innerText()).trim();
    if (/(atenção|verifique os dados|erro|falha|inválid|obrigatóri|duplicad|já existe|não foi possível)/i.test(mensagem)) {
      throw new Error(`O SGE não confirmou a inclusão de "${descricao}": ${mensagem}`);
    }
    if (!/(sucesso|adicionad|salv[oa])/i.test(mensagem)) {
      throw new Error(`O SGE exibiu uma confirmação inesperada para "${descricao}": ${mensagem}`);
    }
    await feedback.locator('.swal2-confirm:visible').click();
    await expect(feedback).toBeHidden({ timeout: 15000 });
  }

  // Só prosseguir após confirmação válida e fechamento do mesmo modal.
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

async function localizarDialogoAberto(formulario: Locator): Promise<Locator> {
  const aberto = formulario.locator('[role="dialog"]:visible');
  await expect(aberto).toHaveCount(1);
  const id = await aberto.getAttribute('id');
  if (!id) throw new Error('O modal aberto não possui ID para acompanhar seu fechamento.');
  return formulario.locator(`[id="${id}"]`);
}

async function adicionarAgrupadorEItem(page: Page, dados: AtividadesEspecificasData): Promise<void> {
  const formulario = page.locator('#main');
  const adicionarAgrupador = getByRoleSge(formulario, 'button', { name: /Adicionar/ }).filter({ visible: true });
  await expect(adicionarAgrupador).toHaveCount(1);
  await adicionarAgrupador.click();

  const dialogAgrupador = await localizarDialogoAberto(formulario);
  await expect(dialogAgrupador).toBeVisible();
  const descricaoAgrupador = dialogAgrupador.locator('#Descricao');
  await expect(descricaoAgrupador).toBeVisible();
  await descricaoAgrupador.fill(dados.agrupador);
  await expect(descricaoAgrupador).toHaveValue(dados.agrupador);
  await confirmarSalvarFilho(page, dialogAgrupador, dados.agrupador);

  const textoGrupo = new RegExp(escaparRegex(dados.agrupador));
  const grupo = getByRoleSge(formulario, 'link', { name: textoGrupo });
  await expect(grupo).toBeVisible({ timeout: 15000 });
  const adicionarItem = formulario.locator('#btnAdicionarItem:visible');
  if (!await adicionarItem.isVisible()) await grupo.click();
  await expect(adicionarItem).toBeVisible({ timeout: 15000 });
  await adicionarItem.click();

  const dialogItem = await localizarDialogoAberto(formulario);
  await expect(dialogItem).toBeVisible();
  await selecionarTipoItem(page, dialogItem, dados.item.tipo);
  const tituloItem = await localizarCampoDialogo(dialogItem, 'Título');
  await tituloItem.campo.fill(dados.item.titulo);
  await expect(tituloItem.campo).toHaveValue(dados.item.titulo);
  const tamanhoMaximo = await localizarCampoDialogo(dialogItem, 'Tamanho máximo');
  await expect(tamanhoMaximo.campo).toBeVisible();
  await tamanhoMaximo.campo.fill(String(dados.item.tamanhoMaximo));
  await expect(tamanhoMaximo.campo).toHaveValue(String(dados.item.tamanhoMaximo));
  await definirItemObrigatorio(page, dialogItem, dados.item.obrigatorio);
  await confirmarSalvarFilho(page, dialogItem, dados.item.titulo);

  const linhaItem = formulario.locator('table:visible tbody tr:visible').filter({ hasText: dados.item.titulo });
  await expect(linhaItem).toHaveCount(1);
  await expect(linhaItem).toContainText(dados.item.tipo);
  console.log(`[QAAUTO] Agrupador e item conferidos: ${dados.agrupador} | ${dados.item.tipo}: ${dados.item.titulo}`);
}

/** Cria uma configuração de Atividades Específicas pela interface do SGE. */
export async function criarAtividadesEspecificas(
  page: Page,
  dados: AtividadesEspecificasData,
): Promise<TipoRegistroPedagogicoCriado & Pick<AtividadesEspecificasData, 'agrupador' | 'item'>> {
  await navegarParaAdicionarTipoRegistroPedagogico(page, 'Atividades Específicas');
  await validarAnoLetivoSelecionado(page, dados.ano);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao:visible').fill(dados.descricao);
  await selecionarTipoTurma(page, dados.tipoTurma);
  await selecionarComposicao(page, dados.composicao);
  await definirAtivo(page, dados.ativo);
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await salvarTipoRegistroPedagogico(page, dados.descricao);
  await adicionarAgrupadorEItem(page, dados);

  console.log(`[QAAUTO] Salvamento confirmado: ${dados.descricao} | Tipo: ${dados.tipo}`);
  return {
    descricao: dados.descricao,
    tipo: dados.tipo,
    url: page.url(),
    agrupador: dados.agrupador,
    item: dados.item,
  };
}
