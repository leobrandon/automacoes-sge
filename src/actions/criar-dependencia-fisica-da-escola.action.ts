import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildDependenciaFisicaDaEscola,
  type BuildDependenciaFisicaDaEscolaOptions,
  type DependenciaFisicaDaEscolaData,
} from '../factories/dependencia-fisica-da-escola.factory';
import { select2 } from '../helpers/select2.helper';
import {
  abrirEdicaoDependenciaFisicaDaEscola,
  linhaDependenciaFisicaDaEscola,
  navegarParaAdicionarDependenciaFisicaDaEscola,
  carregarGradeDependenciaFisicaDaEscola,
  proximaSequenciaLivreDependenciaFisicaDaEscola,
  tituloConsultaDependenciaFisicaDaEscola,
  voltarParaConsultaDependenciaFisicaDaEscola,
} from '../helpers/navigation/dependencia-fisica-da-escola.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface DependenciaFisicaDaEscolaCriada extends DependenciaFisicaDaEscolaData {
  url: string;
}

const TOGGLES_VISIVEIS_NA_CONSULTA = ['StatusAtivo', 'AdequadoAPcd', 'AutorizadoAFuncionar'] as const;

/** Toggle Sim/Não: clica no `.toggle` só se precisar mudar e valida o estado do `input`. */
async function definirToggle(formulario: Locator, id: string, ligado: boolean): Promise<void> {
  const campo = formulario.locator(`#${id}`);
  if (await campo.isChecked() !== ligado) {
    await formulario.locator(`.toggle:has(#${id})`).click();
  }
  await expect(campo).toBeChecked({ checked: ligado });
}

/**
 * Cria pela interface e prova a persistência na grade e reabrindo o registro.
 * Pré-condição: a Dependência Física `<base> <sequência>` já existe (cadastro de apoio do tenant).
 */
export async function criarDependenciaFisicaDaEscola(
  page: Page,
  options: BuildDependenciaFisicaDaEscolaOptions = {},
  sequencia = 1,
): Promise<DependenciaFisicaDaEscolaCriada> {
  // O SGE recusa a mesma dependência duas vezes na escola; usa a primeira sequência livre.
  const sequenciaLivre = await proximaSequenciaLivreDependenciaFisicaDaEscola(page, options, sequencia);
  const dados = buildDependenciaFisicaDaEscola(options, sequenciaLivre);
  await navegarParaAdicionarDependenciaFisicaDaEscola(page);

  const formulario = page.locator('#main');
  await select2.select(page, '#EscolaId', dados.escola, { exactMatch: true });
  try {
    await select2.select(page, '#DependenciaFisicaId', dados.dependenciaFisica, { exactMatch: true });
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new Error(
      `Dependência Física "${dados.dependenciaFisica}" indisponível no cadastro. Execute `
      + `criar_dependencia_fisica_action (Infraestrutura > Dependência Física) para cadastrar ao menos `
      + `${dados.sequencia} registro(s) QAAUTO antes. Detalhe: ${detalhe}`,
    );
  }
  await formulario.locator('#Quantidade').fill(String(dados.quantidadeDependencia));
  await select2.select(page, '#TipoDeConstrucao', dados.tipoConstrucao, { exactMatch: true });
  await select2.select(page, '#CondicaoDeUso', dados.condicaoUso, { exactMatch: true });
  // A consulta aberta pelo menu filtra por Ativo, Adequado a PCD e Autorizado a Funcionar = Sim; registros
  // com algum "Não" não aparecem nela. Por isso o vínculo é cadastrado com os três ligados.
  for (const campo of TOGGLES_VISIVEIS_NA_CONSULTA) await definirToggle(formulario, campo, true);

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('A dependência física da escola foi salva com sucesso.', { exact: true });
  const recusa = formulario.locator('.alert-danger, .field-validation-error').first();
  await expect(sucesso.or(recusa).first()).toBeVisible({ timeout: 20000 });
  if (await recusa.isVisible()) {
    const validacoes = (await formulario.locator('.alert-danger, .field-validation-error').allInnerTexts())
      .map((texto) => texto.replace(/\s+/g, ' ').trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou "${dados.dependenciaFisica}" na escola "${dados.escola}". `
      + `Mensagens visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }
  await expect(tituloConsultaDependenciaFisicaDaEscola(page)).toBeVisible({ timeout: 20000 });

  await carregarGradeDependenciaFisicaDaEscola(page);
  const linha = linhaDependenciaFisicaDaEscola(page, dados.dependenciaFisica, dados.escola);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha).toContainText(dados.condicaoUso);

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoDependenciaFisicaDaEscola(page, dados.dependenciaFisica, dados.escola);
  await expect(formulario.locator('#s2id_EscolaId .select2-chosen')).toHaveText(dados.escola);
  await expect(formulario.locator('#Quantidade')).toHaveValue(String(dados.quantidadeDependencia));
  await expect(formulario.locator('#s2id_TipoDeConstrucao .select2-chosen')).toHaveText(dados.tipoConstrucao);
  await expect(formulario.locator('#s2id_CondicaoDeUso .select2-chosen')).toHaveText(dados.condicaoUso);
  for (const campo of TOGGLES_VISIVEIS_NA_CONSULTA) await expect(formulario.locator(`#${campo}`)).toBeChecked();
  await voltarParaConsultaDependenciaFisicaDaEscola(page);

  console.log(
    `[QAAUTO] Dependência Física da Escola criada e conferida: ${dados.dependenciaFisica} | Escola: ${dados.escola}`,
  );
  return { ...dados, url: page.url() };
}
