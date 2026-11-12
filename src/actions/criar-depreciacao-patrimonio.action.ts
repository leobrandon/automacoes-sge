import { expect, type Page } from '@playwright/test';
import {
  buildDepreciacaoPatrimonio,
  type BuildDepreciacaoPatrimonioOptions,
  type DepreciacaoPatrimonioData,
} from '../factories/depreciacao-patrimonio.factory';
import {
  abrirEdicaoDepreciacaoPatrimonio,
  linhaDepreciacaoPatrimonio,
  navegarParaAdicionarDepreciacaoPatrimonio,
  pesquisarDepreciacaoPatrimonio,
  proximaSequenciaLivreDepreciacaoPatrimonio,
  tituloConsultaDepreciacaoPatrimonio,
  voltarParaConsultaDepreciacaoPatrimonio,
} from '../helpers/navigation/depreciacao-patrimonio.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface DepreciacaoPatrimonioCriada extends DepreciacaoPatrimonioData {
  url: string;
}

/** Cria pela interface (todos os campos são obrigatórios) e prova a persistência na grade e reabrindo o registro. */
export async function criarDepreciacaoPatrimonio(
  page: Page,
  options: BuildDepreciacaoPatrimonioOptions = {},
  sequencia = 1,
): Promise<DepreciacaoPatrimonioCriada> {
  // O SGE aceita descrições repetidas; usa a primeira sequência livre para manter a conferência inequívoca.
  const sequenciaLivre = await proximaSequenciaLivreDepreciacaoPatrimonio(page, options, sequencia);
  const dados = buildDepreciacaoPatrimonio(options, sequenciaLivre);
  await navegarParaAdicionarDepreciacaoPatrimonio(page);

  const formulario = page.locator('#main');
  const categoria = formulario.locator('#CategoriaGeralId');
  const opcoes = (await categoria.locator('option').allInnerTexts())
    .map((texto) => texto.trim()).filter(Boolean);
  if (opcoes.length === 0) {
    throw new Error(
      'Nenhuma Categoria cadastrada para vincular à Depreciação. Cadastre uma categoria no tenant antes de executar.',
    );
  }
  if (dados.categoria && !opcoes.includes(dados.categoria)) {
    throw new Error(
      `A categoria "${dados.categoria}" não existe no tenant. Opções encontradas: ${opcoes.join(' | ')}.`,
    );
  }
  const categoriaEscolhida = dados.categoria || opcoes[0];
  await categoria.selectOption({ label: categoriaEscolhida });

  await formulario.locator('#Descricao').fill(dados.descricao);
  // A máscara monetária só reage a teclas (`fill` deixaria o campo vazio para o SGE) e insere a
  // vírgula sozinha: digitar só os dígitos ("1000") resulta em "10,00".
  const taxa = formulario.locator('#TaxaAnual');
  await taxa.click();
  await taxa.pressSequentially(dados.taxaAnual.replace(/\D/g, ''));
  await expect(taxa).toHaveValue(dados.taxaAnual);
  await formulario.locator('#VidaUtil').fill(dados.vidaUtil);
  await formulario.locator('#Revisao').fill(dados.revisao);
  await formulario.locator('#Observacao').fill(dados.observacao);

  const salvar = formulario.locator('#btnSalvar');
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('Depreciação gravada com sucesso!', { exact: true });
  const atencao = page.getByText(/^Atenção/);
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const validacoes = (await formulario.locator('.field-validation-error, .state-error').allInnerTexts())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou a Depreciação "${dados.descricao}" (aviso "Atenção"). `
      + `Validações visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }

  // Após salvar o SGE volta sozinho para a consulta.
  await expect(tituloConsultaDepreciacaoPatrimonio(page)).toBeVisible({ timeout: 20000 });
  await expect(sucesso).toBeHidden({ timeout: 20000 });

  await pesquisarDepreciacaoPatrimonio(page, dados.descricao);
  const linha = linhaDepreciacaoPatrimonio(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha.getByRole('cell', { name: categoriaEscolhida, exact: true })).toBeVisible();
  await expect(linha.getByRole('cell', { name: dados.taxaAnual, exact: true })).toBeVisible();

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoDepreciacaoPatrimonio(page, dados.descricao);
  await expect(formulario.locator('#CategoriaGeralId option:checked')).toHaveText(categoriaEscolhida);
  await expect(formulario.locator('#TaxaAnual')).toHaveValue(dados.taxaAnual);
  await expect(formulario.locator('#VidaUtil')).toHaveValue(dados.vidaUtil);
  await expect(formulario.locator('#Revisao')).toHaveValue(dados.revisao);
  await expect(formulario.locator('#Observacao')).toHaveValue(dados.observacao);
  await voltarParaConsultaDepreciacaoPatrimonio(page);

  console.log(`[QAAUTO] Depreciação criada e conferida: ${dados.descricao}`);
  return { ...dados, categoria: categoriaEscolhida, url: page.url() };
}
