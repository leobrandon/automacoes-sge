import { expect, type Locator, type Page } from '@playwright/test';
import {
  type BuildDocumentoCurricularOptions,
  type DocumentoCurricularData,
  type EstruturaDocumentoCurricular,
} from '../factories/documento-curricular.factory';
import {
  aguardarCarregamentoDocumentoCurricular,
  abrirEdicaoDocumentoCurricular,
  linhaDocumentoCurricular,
  pesquisarDocumentoCurricular,
} from '../helpers/navigation/documento-curricular.navigation';
import { criarDocumentoCurricular } from './criar-documento-curricular.action';
import { definirSwitchDocumento as definirSwitch } from '../helpers/documento-curricular-form.helper';

export interface DocumentoCurricularEditado {
  documento: DocumentoCurricularData;
  composicaoEnsinoUsada: string;
  anoEscolarUsado: string;
  componenteUsado: string;
  estruturasIncluidas: string[];
  itensIncluidos: string[];
  url: string;
}

function main(page: Page): Locator { return page.locator('#main'); }

async function adicionarItem(page: Page, estrutura: EstruturaDocumentoCurricular, item: EstruturaDocumentoCurricular['itens'][number]): Promise<void> {
  console.log(`[Documento Curricular] Incluindo item "${item.descricao}" na estrutura "${estrutura.descricao}"${item.descricaoItemPai ? `, relacionado ao item pai "${item.descricaoItemPai}"` : ''}.`);
  await main(page).getByRole('link', { name: estrutura.descricao, exact: true }).click();
  await main(page).getByTitle(new RegExp(`Adicionar novo.*${estrutura.descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')).click();
  const modal = page.locator('.modal:visible').last();
  await modal.locator('#Descricao').fill(item.descricao);
  await definirSwitch(page, 'Ativo', item.ativo);
  if (estrutura.possuiCodigo === 'Sim') {
    await modal.locator('#Codigo').fill(item.codigo || '001');
  }
  if (item.descricaoItemPai) {
    const campoPai = modal.locator('#s2id_OutrosConteudos input.select2-input');
    await campoPai.click();
    await campoPai.fill(item.descricaoItemPai);
    const pai = page.getByRole('option', { name: new RegExp(item.descricaoItemPai.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    await pai.waitFor({ state: 'visible', timeout: 10000 });
    await pai.click();
    console.log(`[Documento Curricular] Item pai selecionado: "${item.descricaoItemPai}".`);
  }
  const [resposta] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname.toLowerCase() === '/estruturadodocumentocurricular/postconteudo'
      && response.request().method() === 'POST', { timeout: 20000 }),
    modal.getByRole('button', { name: /Salvar$/i }).click(),
  ]);
  console.log(`[Documento Curricular] Resposta da inclusão do item "${item.descricao}": HTTP ${resposta.status()}.`);
  if (!resposta.ok()) throw new Error(`A inclusão do item curricular retornou HTTP ${resposta.status()}.`);
  await expect(modal).toBeHidden();
  const hrefAba = await main(page).getByRole('link', { name: estrutura.descricao, exact: true }).getAttribute('href');
  const idAba = hrefAba?.match(/tabObj_(\d+)/)?.[1];
  if (!idAba) throw new Error(`Não foi possível identificar a aba da estrutura "${estrutura.descricao}" pela interface.`);
  const grade = main(page).locator(`#table-${idAba}`);
  await expect(grade.locator('tbody tr:visible').filter({ hasText: item.descricao })).toBeVisible();
  if (item.descricaoItemPai) {
    await expect(grade.locator('tbody tr:visible').filter({ hasText: item.descricaoItemPai })).toBeVisible();
  }
  console.log(`[Documento Curricular] Item incluído e confirmado na estrutura "${estrutura.descricao}": "${item.descricao}".`);
}

/** Cria um documento QAAUTO isolado, configura estruturas e vínculo curricular e cadastra um item por estrutura. */
export async function editarDocumentoCurricular(
  page: Page,
  options: BuildDocumentoCurricularOptions = {},
  sequencia = 1,
): Promise<DocumentoCurricularEditado> {
  console.log(`[Documento Curricular] Iniciando edição/configuração do documento, sequência ${sequencia}.`);
  const criado = await criarDocumentoCurricular(page, options, sequencia);
  console.log(`[Documento Curricular] Abrindo "${criado.descricao}" para incluir estruturas, componentes e itens.`);
  await pesquisarDocumentoCurricular(page, criado.descricao);
  await abrirEdicaoDocumentoCurricular(page, criado.descricao);
  const par = { ano: criado.anoEscolar, componente: criado.componente };
  console.log(`[Documento Curricular] Abrindo o vínculo de componente "${par.componente}" para adicionar itens às estruturas.`);
  await main(page).locator('#tabDados').getByRole('link', { name: 'Componentes', exact: true }).click();
  const linha = main(page).locator('#tabComponentes table tbody tr:visible').filter({
    has: main(page).locator('#tabComponentes table tbody td').filter({ hasText: new RegExp(`^\\s*${par.componente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }),
  }).first();
  await linha.waitFor({ state: 'visible', timeout: 15000 });
  const editar = linha.locator('a[onclick*="/documentocurricular/editarcomponente?"]');
  await expect(editar).toBeVisible();
  await editar.click();
  await main(page).getByRole('heading', { name: /Editar Componente do Documento Curricular/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 20000 });
  for (const estrutura of criado.estruturas) {
    for (const item of estrutura.itens) await adicionarItem(page, estrutura, item);
  }
  console.log(`[Documento Curricular] Configuração concluída para "${criado.descricao}": ${criado.estruturas.length} estrutura(s) e ${criado.estruturas.reduce((total, estrutura) => total + estrutura.itens.length, 0)} item(ns).`);
  return {
    documento: criado,
    composicaoEnsinoUsada: criado.composicaoEnsino,
    anoEscolarUsado: par.ano,
    componenteUsado: par.componente,
    estruturasIncluidas: criado.estruturas.map(item => item.descricao),
    itensIncluidos: criado.estruturas.flatMap(item => item.itens.map(conteudo => conteudo.descricao)),
    url: page.url(),
  };
}


