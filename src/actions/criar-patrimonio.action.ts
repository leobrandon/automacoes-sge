import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildPatrimonio,
  type BuildPatrimonioOptions,
  type PatrimonioData,
} from '../factories/patrimonio.factory';
import {
  abrirEdicaoPatrimonio,
  confirmarAvisoPatrimonio,
  linhaPatrimonio,
  navegarParaAdicionarPatrimonio,
  pesquisarPatrimonio,
  proximaSequenciaLivrePatrimonio,
  tituloConsultaPatrimonio,
  voltarParaConsultaPatrimonio,
} from '../helpers/navigation/patrimonio.navigation';
import { select2 } from '../helpers/select2.helper';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';

export interface PatrimonioCriado extends PatrimonioData {
  url: string;
}

async function opcoesDoSelect(formulario: Locator, id: string): Promise<string[]> {
  return (await formulario.locator(`#${id} option`).allTextContents())
    .map((texto) => texto.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Falha rápida e acionável quando o dado de apoio não existe no tenant (a automação não o cria). */
function escolherOpcao(opcoes: string[], desejado: string, rotulo: string, semOpcoes: string): string {
  if (opcoes.length === 0) throw new Error(semOpcoes);
  if (!desejado) return opcoes[0];
  if (!opcoes.includes(desejado)) {
    throw new Error(`${rotulo} "${desejado}" não existe no tenant. Opções encontradas: ${opcoes.join(' | ')}.`);
  }
  return desejado;
}

/** Cria pelo formulário e prova a persistência na grade e reabrindo o registro. */
export async function criarPatrimonio(
  page: Page,
  options: BuildPatrimonioOptions = {},
  sequencia = 1,
): Promise<PatrimonioCriado> {
  // O SGE recusa placa repetida; usa a primeira sequência livre para manter a conferência inequívoca.
  const sequenciaLivre = await proximaSequenciaLivrePatrimonio(page, options, sequencia);
  const dados = buildPatrimonio(options, sequenciaLivre);
  await navegarParaAdicionarPatrimonio(page);

  const formulario = page.locator('#main');
  await waitForSgeLoaders(page);
  const unidade = escolherOpcao(
    await opcoesDoSelect(formulario, 'EscolaId'), dados.unidade, 'A unidade',
    'Nenhuma unidade disponível para este usuário. Verifique o acesso e o tenant antes de executar.',
  );
  const produto = escolherOpcao(
    await opcoesDoSelect(formulario, 'ItemId'), dados.produto, 'O produto',
    'Nenhum produto cadastrado para vincular ao Patrimônio. Cadastre um Item (Cadastro > Item) antes de executar.',
  );
  const depreciacao = escolherOpcao(
    await opcoesDoSelect(formulario, 'DepreciacaoPatrimonioId'), dados.depreciacao, 'A depreciação',
    'Nenhuma Depreciação cadastrada. Execute criar_depreciacao_patrimonio_action antes de criar o Patrimônio.',
  );
  const situacao = escolherOpcao(
    await opcoesDoSelect(formulario, 'Situacao'), dados.situacao, 'A situação',
    'A lista de Situação está vazia; o formulário não carregou corretamente.',
  );

  await select2.select(page, '#EscolaId', unidade, { exactMatch: true });
  await select2.select(page, '#ItemId', produto, { exactMatch: true });
  // O texto da depreciação pode ser enorme; a busca usa só o início e a seleção é validada inteira.
  await select2.select(page, '#DepreciacaoPatrimonioId', depreciacao, {
    exactMatch: true, searchText: depreciacao.slice(0, 30),
  });
  await select2.select(page, '#Situacao', situacao, { exactMatch: true });
  await formulario.locator('#Placa').fill(dados.placa);
  if (dados.numeroSerie) await formulario.locator('#NumeroSerie').fill(dados.numeroSerie);
  if (dados.observacao) await formulario.locator('#Observacao').fill(dados.observacao);

  const salvar = formulario.locator('#btnSalvar');
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /Patrimônio adicionado/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const validacoes = (await formulario.locator('.span-error-validator:visible').allInnerTexts())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou o Patrimônio "${dados.placa}" (aviso "Atenção"). `
      + `Validações visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }

  // O aviso de sucesso não fecha sozinho: bloqueia a tela até o Ok. Depois o SGE volta para a consulta.
  await confirmarAvisoPatrimonio(page, 'Ok');
  await expect(tituloConsultaPatrimonio(page)).toBeVisible({ timeout: 20000 });

  await pesquisarPatrimonio(page, dados.placa);
  const linha = linhaPatrimonio(page, dados.placa);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha.getByRole('cell', { name: produto, exact: true })).toBeVisible();

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoPatrimonio(page, dados.placa);
  await expect(formulario.locator('#EscolaId option:checked')).toHaveText(unidade);
  await expect(formulario.locator('#ItemId option:checked')).toHaveText(produto);
  await expect(formulario.locator('#DepreciacaoPatrimonioId option:checked')).toHaveText(depreciacao);
  await expect(formulario.locator('#Situacao option:checked')).toHaveText(situacao);
  await expect(formulario.locator('#Placa')).toHaveValue(dados.placa);
  if (dados.numeroSerie) await expect(formulario.locator('#NumeroSerie')).toHaveValue(dados.numeroSerie);
  if (dados.observacao) await expect(formulario.locator('#Observacao')).toHaveValue(dados.observacao);
  await voltarParaConsultaPatrimonio(page);

  console.log(`[QAAUTO] Patrimônio criado e conferido: ${dados.placa}`);
  return { ...dados, unidade, produto, depreciacao, situacao, url: page.url() };
}
