import { expect, type Page } from '@playwright/test';
import {
  buildSalaDeAula,
  type BuildSalaDeAulaOptions,
  type SalaDeAulaData,
} from '../factories/sala-de-aula.factory';
import { select2 } from '../helpers/select2.helper';
import {
  abrirEdicaoSalaDeAula,
  linhaSalaDeAula,
  navegarParaAdicionarSalaDeAula,
  pesquisarSalaDeAula,
  proximaSequenciaLivreSalaDeAula,
  tituloConsultaSalaDeAula,
  voltarParaConsultaSalaDeAula,
} from '../helpers/navigation/sala-de-aula.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface SalaDeAulaCriada extends SalaDeAulaData {
  url: string;
}

/** Campos opcionais numéricos: id no formulário. O SGE formata decimais com vírgula. */
const CAMPOS_OPCIONAIS: Array<[keyof SalaDeAulaData, string]> = [
  ['numeroSala', 'NumeroSala'],
  ['capacidadeAlunos', 'CapacidadeDeAlunos'],
  ['largura', 'Largura'],
  ['comprimento', 'Profundidade'],
  ['peDireito', 'PeDireito'],
  ['area', 'Area'],
  ['volume', 'Volume'],
  ['larguraPorta', 'LarguraDaPorta'],
  ['numeroJanelas', 'NumeroDeJanelas'],
];

/** Campos inteiros regravados como informados; os decimais voltam formatados e ficam fora da conferência. */
const CAMPOS_INTEIROS_CONFERIDOS = ['numeroSala', 'capacidadeAlunos', 'larguraPorta', 'numeroJanelas'] as const;

/** Cria pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarSalaDeAula(
  page: Page,
  options: BuildSalaDeAulaOptions = {},
  sequencia = 1,
): Promise<SalaDeAulaCriada> {
  // O SGE recusa descrição repetida; usa a primeira sequência livre.
  const sequenciaLivre = await proximaSequenciaLivreSalaDeAula(page, options, sequencia);
  const dados = buildSalaDeAula(options, sequenciaLivre);
  await navegarParaAdicionarSalaDeAula(page);

  const formulario = page.locator('#main');
  await select2.select(page, '#EscolaId', dados.escola, { exactMatch: true });
  await formulario.locator('#Descricao').fill(dados.descricao);
  for (const [campo, id] of CAMPOS_OPCIONAIS) {
    const valor = dados[campo];
    if (valor !== undefined) await formulario.locator(`#${id}`).fill(String(valor));
  }
  for (const opcao of dados.climatizacao) {
    await select2.select(page, '#ListaClimatizacao', opcao, { exactMatch: true, isMultiple: true });
  }
  if (dados.quantidadeAresCondicionados !== undefined) {
    const quantidade = formulario.locator('#QuantidadeDeAresCondicionados');
    await expect(quantidade).toBeVisible();
    await quantidade.fill(String(dados.quantidadeAresCondicionados));
  }

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('A sala foi salva com sucesso.', { exact: true });
  const recusa = formulario.locator('.alert-danger, .field-validation-error').first();
  await expect(sucesso.or(recusa).first()).toBeVisible({ timeout: 20000 });
  if (await recusa.isVisible()) {
    const mensagens = (await formulario.locator('.alert-danger, .field-validation-error').allInnerTexts())
      .map((texto) => texto.replace(/\s+/g, ' ').trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou a Sala de Aula "${dados.descricao}" na escola "${dados.escola}". `
      + `Mensagens visíveis: ${mensagens.join(' | ') || 'nenhuma'}.`,
    );
  }
  await expect(tituloConsultaSalaDeAula(page)).toBeVisible({ timeout: 20000 });

  await pesquisarSalaDeAula(page, dados.descricao);
  const linha = linhaSalaDeAula(page, dados.descricao, dados.escola);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  for (const opcao of dados.climatizacao) await expect(linha).toContainText(opcao);

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoSalaDeAula(page, dados.descricao, dados.escola);
  const tags = formulario.locator('#s2id_ListaClimatizacao .select2-search-choice');
  await expect(tags).toHaveCount(dados.climatizacao.length);
  for (const opcao of dados.climatizacao) await expect(tags.filter({ hasText: opcao })).toHaveCount(1);
  if (dados.quantidadeAresCondicionados !== undefined) {
    await expect(formulario.locator('#QuantidadeDeAresCondicionados'))
      .toHaveValue(String(dados.quantidadeAresCondicionados));
  }
  for (const campo of CAMPOS_INTEIROS_CONFERIDOS) {
    const valor = dados[campo];
    const id = CAMPOS_OPCIONAIS.find(([chave]) => chave === campo)?.[1];
    if (valor !== undefined && id) await expect(formulario.locator(`#${id}`)).toHaveValue(String(valor));
  }
  await voltarParaConsultaSalaDeAula(page);

  console.log(`[QAAUTO] Sala de Aula criada e conferida: ${dados.descricao} | Escola: ${dados.escola}`);
  return { ...dados, url: page.url() };
}
