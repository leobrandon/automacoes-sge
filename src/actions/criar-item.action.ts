import { expect, type Page } from '@playwright/test';
import {
  buildItem,
  type BuildItemOptions,
  type ItemData,
  type OpcaoSimNaoItem,
} from '../factories/item.factory';
import {
  aguardarCarregamentoItem,
  linhaItem,
  navegarParaAdicionarItem,
  pesquisarItem,
  proximaSequenciaLivreItem,
  voltarParaConsultaItem,
} from '../helpers/navigation/item.navigation';

export interface ItemCriado extends ItemData {
  grupoUnidadeDeMedidaEscolhido: string;
  categoriaEscolhida: string;
  url: string;
}

interface ConfigSelectApoio {
  id: string;
  opcao?: string;
  rotulo: string;
  dicaListaVazia: string;
  aguardarRota?: string;
}

async function selecionarSelect2Apoio(page: Page, config: ConfigSelectApoio): Promise<string> {
  const container = page.locator(`#main #s2id_${config.id}`);
  await expect(container).toBeVisible({ timeout: 15000 });
  await expect(container).not.toHaveClass(/select2-container-disabled/, { timeout: 15000 });

  await container.locator('a.select2-choice').click();
  const dropdown = page.locator('#select2-drop:visible');
  await expect(dropdown).toBeVisible({ timeout: 10000 });

  const opcoes = dropdown.locator('ul.select2-results li.select2-result-selectable');
  const semResultados = dropdown.locator('ul.select2-results li.select2-no-results');
  await expect(opcoes.or(semResultados).first()).toBeVisible({ timeout: 10000 });

  const textos = (await opcoes.allInnerTexts()).map((texto) => texto.trim()).filter(Boolean);
  if (textos.length === 0) {
    await page.keyboard.press('Escape');
    await expect(dropdown).toBeHidden({ timeout: 5000 });
    throw new Error(`Nenhum(a) ${config.rotulo} cadastrado(a). ${config.dicaListaVazia}`);
  }

  const desejada = config.opcao?.trim();
  if (desejada && !textos.includes(desejada)) {
    await page.keyboard.press('Escape');
    await expect(dropdown).toBeHidden({ timeout: 5000 });
    throw new Error(
      `${config.rotulo} "${desejada}" não encontrado(a). Opções existentes: ${textos.join(' | ')}.`,
    );
  }

  const escolhida = desejada ?? textos[0];
  const alvo = opcoes.locator('.select2-result-label').filter({ hasText: escolhida }).first();
  // Usa correspondência exata quando há vários registros parecidos.
  const alvoExato = opcoes
    .filter({ has: page.locator('.select2-result-label', { hasText: new RegExp(`^\\s*${escolhida.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }) })
    .locator('.select2-result-label')
    .first();
  const cliqueAlvo = (await alvoExato.count()) > 0 ? alvoExato : alvo;

  if (config.aguardarRota) {
    const rotaEsperada = config.aguardarRota.toLowerCase();
    const [resposta] = await Promise.all([
      page.waitForResponse(
        (response) => new URL(response.url()).pathname.toLowerCase() === rotaEsperada && response.request().method() === 'GET',
        { timeout: 20000 },
      ),
      cliqueAlvo.click(),
    ]);
    if (!resposta.ok()) {
      throw new Error(`O carregamento dependente de ${config.rotulo} (${config.aguardarRota}) retornou HTTP ${resposta.status()}.`);
    }
  } else {
    await cliqueAlvo.click();
  }

  await expect(dropdown).toBeHidden({ timeout: 10000 });
  await expect(container.locator('.select2-chosen')).toHaveText(escolhida, { timeout: 10000 });
  return escolhida;
}

async function definirSwitch(page: Page, id: string, valor: OpcaoSimNaoItem): Promise<void> {
  const checkbox = page.locator(`#main #${id}`);
  const esperado = valor === 'Sim';
  const alternador = page.locator(`#main .toggle:has(#${id})`);
  await expect(alternador).toBeVisible({ timeout: 15000 });
  if ((await checkbox.isChecked()) !== esperado) {
    await alternador.click();
  }
  await expect(checkbox).toBeChecked({ checked: esperado, timeout: 10000 });
}

async function concluirSalvamentoItem(page: Page, descricao: string): Promise<void> {
  const dialogo = page.locator('.swal2-popup:visible').filter({ hasNotText: 'Aguarde' }).first();
  const botaoOk = dialogo.getByRole('button', { name: 'Ok', exact: true });
  await expect(botaoOk).toBeVisible({ timeout: 20000 });

  const mensagem = (await dialogo.innerText()).replace(/\s+/g, ' ').trim();
  await botaoOk.click();
  await expect(dialogo).toBeHidden({ timeout: 15000 });

  if (!/sucesso|item adicionado/i.test(mensagem) || /atenção|erro|já foi cadastrado/i.test(mensagem)) {
    throw new Error(`O SGE não confirmou a criação do Item "${descricao}": ${mensagem}`);
  }
}

/** Cria um Item pela interface, confere a persistência na edição e na grade filtrada. */
export async function criarItem(
  page: Page,
  options: BuildItemOptions = {},
  sequencia = 1,
  aoCriar?: (descricao: string) => void,
): Promise<ItemCriado> {
  const sequenciaLivre = await proximaSequenciaLivreItem(page, options, sequencia);
  const dados = buildItem(options, sequenciaLivre);
  await navegarParaAdicionarItem(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await formulario.locator('#NaturezaDoItem').selectOption({ label: dados.natureza });
  await expect(formulario.locator('#NaturezaDoItem option:checked')).toHaveText(dados.natureza);

  const grupoEscolhido = await selecionarSelect2Apoio(page, {
    id: 'GrupoUnidadeDeMedidaId',
    opcao: dados.grupoUnidadeDeMedida,
    rotulo: 'Grupo de Unidades de Medida',
    dicaListaVazia: 'Execute criar_grupo_de_unidade_de_medida_action antes de criar o item.',
  });

  const categoriaEscolhida = await selecionarSelect2Apoio(page, {
    id: 'CategoriaGeralId',
    opcao: dados.categoria,
    rotulo: 'Categoria',
    dicaListaVazia: 'Execute criar_categoria_action antes de criar o item.',
    aguardarRota: '/Item/ObtenhaSubCategorias',
  });

  if (dados.subCategoria) {
    await selecionarSelect2Apoio(page, {
      id: 'SubCategoriaGeralId',
      opcao: dados.subCategoria,
      rotulo: 'Sub Categoria',
      dicaListaVazia: `Nenhuma Sub Categoria encontrada para a Categoria "${categoriaEscolhida}".`,
    });
  }

  if (dados.marca) {
    await selecionarSelect2Apoio(page, {
      id: 'MarcaId',
      opcao: dados.marca,
      rotulo: 'Marca',
      dicaListaVazia: 'Execute criar_marca_action antes de selecionar uma marca.',
      aguardarRota: '/Item/GetModelosPorMarca',
    });
  }

  if (dados.modelo) {
    await selecionarSelect2Apoio(page, {
      id: 'ModeloId',
      opcao: dados.modelo,
      rotulo: 'Modelo',
      dicaListaVazia: 'Nenhum Modelo disponível para a Marca selecionada.',
    });
  }

  if (dados.controlaEstoque) {
    await definirSwitch(page, 'ControlaEstoque', dados.controlaEstoque);
  }
  if (dados.obrigarLote) {
    await definirSwitch(page, 'ObrigarLote', dados.obrigarLote);
  }
  if (dados.obrigarDataValidade) {
    await definirSwitch(page, 'ObrigarDataValidade', dados.obrigarDataValidade);
  }

  const botaoSalvar = formulario.locator('#btnSalvar');
  await expect(botaoSalvar).toBeVisible({ timeout: 15000 });

  const [respostaPost] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname.toLowerCase() === '/item/posteditar'
        && response.request().method() === 'POST',
      { timeout: 30000 },
    ),
    botaoSalvar.click(),
  ]);
  if (!respostaPost.ok()) {
    throw new Error(`O salvamento de Item retornou HTTP ${respostaPost.status()}.`);
  }

  const retornoPost = (await respostaPost.json()) as { success?: boolean; sucesso?: boolean; message?: string };
  if (retornoPost.success ?? retornoPost.sucesso) {
    aoCriar?.(dados.descricao);
  }

  await concluirSalvamentoItem(page, dados.descricao);
  await aguardarCarregamentoItem(page);

  await expect(formulario.getByRole('heading', { name: /Alteração de Item/i, includeHidden: true }))
    .toBeVisible({ timeout: 20000 });
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao, { timeout: 15000 });
  await expect(formulario.locator('#NaturezaDoItem option:checked')).toHaveText(dados.natureza);
  await expect(formulario.locator('#s2id_GrupoUnidadeDeMedidaId .select2-chosen')).toHaveText(grupoEscolhido);
  await expect(formulario.locator('#s2id_CategoriaGeralId .select2-chosen')).toHaveText(categoriaEscolhida);
  if (dados.subCategoria) {
    await expect(formulario.locator('#s2id_SubCategoriaGeralId .select2-chosen')).toHaveText(dados.subCategoria);
  }
  if (dados.marca) {
    await expect(formulario.locator('#s2id_MarcaId .select2-chosen')).toHaveText(dados.marca);
  }
  if (dados.modelo) {
    await expect(formulario.locator('#s2id_ModeloId .select2-chosen')).toHaveText(dados.modelo);
  }
  if (dados.controlaEstoque) {
    await expect(formulario.locator('#ControlaEstoque')).toBeChecked({ checked: dados.controlaEstoque === 'Sim' });
  }
  if (dados.obrigarLote) {
    await expect(formulario.locator('#ObrigarLote')).toBeChecked({ checked: dados.obrigarLote === 'Sim' });
  }
  if (dados.obrigarDataValidade) {
    await expect(formulario.locator('#ObrigarDataValidade')).toBeChecked({ checked: dados.obrigarDataValidade === 'Sim' });
  }

  await voltarParaConsultaItem(page);
  await pesquisarItem(page, dados.descricao);

  const linha = linhaItem(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha.locator('td').nth(2)).toHaveText(dados.descricao);
  await expect(linha.locator('td').nth(3)).toHaveText('Item');
  await expect(linha.locator('td').nth(4)).toHaveText(dados.natureza);
  await expect(linha.locator('td').nth(5)).toHaveText(categoriaEscolhida);
  await expect(linha.locator('td').nth(6)).toHaveText(grupoEscolhido);

  console.log(`[QAAUTO] Item criado e conferido: ${dados.descricao}`);
  return {
    ...dados,
    grupoUnidadeDeMedidaEscolhido: grupoEscolhido,
    categoriaEscolhida,
    url: page.url(),
  };
}
