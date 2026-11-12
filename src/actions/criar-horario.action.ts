import { expect, type Page } from '@playwright/test';
import {
  buildHorario,
  CAMPOS_PERCENTUAL_HORA_EXTRA,
  COLUNAS_HORARIO,
  DIAS_SEMANA_HORARIO,
  type BuildHorarioOptions,
  type CampoPercentualHoraExtra,
  type HorarioData,
  type JornadaDiaHorario,
} from '../factories/horario.factory';
import { select2 } from '../helpers/select2.helper';
import {
  abrirEdicaoHorario,
  confirmarAvisoHorario,
  linhaHorario,
  navegarParaAdicionarHorario,
  pesquisarHorario,
  proximaSequenciaLivreHorario,
  tituloConsultaHorario,
  voltarParaConsultaHorario,
} from '../helpers/navigation/horario.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface HorarioCriado extends HorarioData {
  url: string;
}

type Aba = 'Geral' | 'Horas Extras' | 'Coluna';
type PercentuaisLidos = Record<CampoPercentualHoraExtra, string>;

const PAINEL_ABA: Record<Aba, string> = {
  'Geral': '#tabPnlGeral',
  'Horas Extras': '#tabPnlExtra',
  'Coluna': '#tabPnlColuna',
};

const TOGGLES_GERAIS = [
  ['Is24Horas', 'horario24Horas'],
  ['IsPreAssinalarBatidas', 'habilitarBatidasPreAssinaladas'],
  ['IsPreecherFolgaEmBranco', 'preencherFolgaEmBranco'],
  ['BancoDeHorasHabilitado', 'bancoDeHoras'],
  ['HoraExtraHabilitado', 'horaExtra'],
  ['AdicionalNoturnoHabilitado', 'adicionalNoturno'],
] as const;

const CAMPOS_JORNADA_TEXTO = {
  entrada1: 'Entrada1', saida1: 'Saida1', entrada2: 'Entrada2', saida2: 'Saida2',
  entrada3: 'Entrada3', saida3: 'Saida3', entrada4: 'Entrada4', saida4: 'Saida4',
  entrada5: 'Entrada5', saida5: 'Saida5',
  toleranciaFalta: 'ToleranciaFalta', toleranciaExtra: 'ToleranciaExtra', cargaHoraria: 'CargaHoraria',
} as const;

const CAMPOS_JORNADA_MARCACAO = {
  almocoLivre: 'AlmocoLivre', compensado: 'Compensado', neutro: 'Neutro',
} as const;

function nomeCampoPercentual(campo: CampoPercentualHoraExtra): string {
  return `PontoHorarioHoraExtra${campo.charAt(0).toUpperCase()}${campo.slice(1)}`;
}

async function abrirAba(page: Page, aba: Aba): Promise<void> {
  const conteudo = page.locator('#main');
  const link = getByRoleSge(conteudo, 'link', { name: aba, exact: true });
  await expect(link).toBeVisible();
  await link.click();
  await expect(conteudo.locator(PAINEL_ABA[aba])).toBeVisible();
}

async function definirToggle(page: Page, id: string, esperado: boolean): Promise<void> {
  const campo = page.locator(`#main #${id}`);
  if (await campo.isChecked() !== esperado) {
    await page.locator(`#main label:has(#${id}) .toggle`).click();
  }
  await expect(campo).toBeChecked({ checked: esperado });
}

/** Checkbox do tema (sem `.toggle`): o clique vai no rótulo que o envolve. */
async function definirCheckboxRotulado(page: Page, id: string, esperado: boolean): Promise<void> {
  const campo = page.locator(`#main #${id}`);
  if (await campo.isChecked() !== esperado) {
    await page.locator(`#main label:has(#${id})`).click();
  }
  await expect(campo).toBeChecked({ checked: esperado });
}

async function preencherTexto(page: Page, id: string, valor: string): Promise<void> {
  const campo = page.locator(`#main #${id}`);
  await expect(campo, `O campo "${id}" não está visível para o tipo de horário escolhido`).toBeVisible();
  await expect(campo).toBeEditable();
  await campo.fill(valor);
  await expect(campo).toHaveValue(valor);
}

async function preencherGeral(page: Page, dados: HorarioData): Promise<void> {
  const formulario = page.locator('#main');
  await abrirAba(page, 'Geral');

  for (const [id, campo] of TOGGLES_GERAIS) {
    await definirToggle(page, id, dados[campo]);
  }
  if (dados.cargaHorariaFixaEmHoras) {
    await preencherTexto(page, 'HorarioCompensacao', dados.cargaHorariaFixaEmHoras);
  }
  if (dados.horarioFechamentoNoturno) {
    await preencherTexto(page, 'HorarioFechamentoNoturno', dados.horarioFechamentoNoturno);
  }

  await definirCheckboxRotulado(page, 'ExibirAdcDiurnoCalculoHoraReduzida', dados.exibirHoraDiurnaReduzida);
  if (dados.horaDiurnaReduzida) await preencherTexto(page, 'HoraDiurnaReduzida', dados.horaDiurnaReduzida);
  await definirCheckboxRotulado(page, 'ExibirAdcNoturCalculoHoraReduzida', dados.exibirHoraNoturnaReduzida);
  if (dados.horaNoturnaReduzida) await preencherTexto(page, 'HoraNoturnaReduzida', dados.horaNoturnaReduzida);

  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
}

async function preencherJornada(page: Page, dados: HorarioData): Promise<void> {
  for (const [dia, valores] of Object.entries(dados.jornada) as Array<[typeof DIAS_SEMANA_HORARIO[number], JornadaDiaHorario]>) {
    const indice = DIAS_SEMANA_HORARIO.indexOf(dia);
    for (const [campo, sufixo] of Object.entries(CAMPOS_JORNADA_TEXTO) as Array<[keyof typeof CAMPOS_JORNADA_TEXTO, string]>) {
      const valor = valores[campo];
      if (valor) await preencherTexto(page, `ListaPontoHorarioHora_${indice}__${sufixo}`, valor);
    }
    for (const [campo, sufixo] of Object.entries(CAMPOS_JORNADA_MARCACAO) as Array<[keyof typeof CAMPOS_JORNADA_MARCACAO, string]>) {
      const valor = valores[campo];
      if (valor === undefined) continue;
      const caixa = page.locator(`#main #ListaPontoHorarioHora_${indice}__${sufixo}`);
      await caixa.setChecked(valor);
      await expect(caixa).toBeChecked({ checked: valor });
    }
  }
}

async function lerPercentuais(page: Page): Promise<PercentuaisLidos> {
  const lidos = {} as PercentuaisLidos;
  for (const campo of CAMPOS_PERCENTUAL_HORA_EXTRA) {
    lidos[campo] = await page.locator(`#main #${nomeCampoPercentual(campo)}`).inputValue();
  }
  return lidos;
}

/** Reutiliza a configuração de hora extra de outro horário e devolve os percentuais que ela trouxe. */
async function usarConfiguracaoDeOutroHorario(page: Page, nome: string): Promise<PercentuaisLidos> {
  await abrirAba(page, 'Horas Extras');
  const opcoes = (await page.locator('#main #PontoHorarioHoraExtraId option')
    .evaluateAll((itens) => itens.map((item) => (item as HTMLOptionElement).text.trim())))
    .filter(Boolean);
  if (opcoes.length === 0) {
    throw new Error(`Nenhum Horário cadastrado para reutilizar a configuração de "${nome}". Cadastre-o antes desta automação.`);
  }
  if (!opcoes.includes(nome)) {
    throw new Error(`Horário "${nome}" não encontrado para reutilizar a configuração. Opções existentes: ${opcoes.join(' | ')}.`);
  }

  // Reescolher a opção que já vem selecionada não dispara a carga dos valores.
  if (await select2.getSelectedText(page, '#PontoHorarioHoraExtraId') !== nome) {
    await Promise.all([
      page.waitForResponse((response) => /^\/pontohorario\/getvaloresextra\/\d+$/i.test(new URL(response.url()).pathname), { timeout: 20000 }),
      select2.select(page, '#PontoHorarioHoraExtraId', nome, { exactMatch: true }),
    ]);
  }
  const campo = page.locator('#main #PontoHorarioHoraExtraDiaUtil');
  await expect(campo).toHaveAttribute('readonly', '');
  return lerPercentuais(page);
}

/** Os percentuais só são editáveis na edição (na inclusão o seletor já traz outra configuração). */
async function aplicarPercentuais(page: Page, dados: HorarioData): Promise<void> {
  const percentuais = dados.horasExtras.percentuais;
  if (!percentuais) return;
  await abrirAba(page, 'Horas Extras');
  for (const [campo, valor] of Object.entries(percentuais) as Array<[CampoPercentualHoraExtra, number]>) {
    await preencherTexto(page, nomeCampoPercentual(campo), String(valor));
  }
}

async function aplicarColunas(page: Page, dados: HorarioData): Promise<void> {
  const colunas = Object.entries(dados.colunas);
  if (colunas.length === 0) return;
  await abrirAba(page, 'Coluna');
  for (const [codigo, opcoes] of colunas) {
    const indice = COLUNAS_HORARIO.indexOf(codigo as typeof COLUNAS_HORARIO[number]);
    for (const [opcao, sufixo] of [['impressao', 'Impressao'], ['edicao', 'Edicao'], ['preFolha', 'PreFolha']] as const) {
      const valor = opcoes[opcao];
      if (valor === undefined) continue;
      const caixa = page.locator(`#main #ListaPontoHorarioColuna_${indice}__${sufixo}`);
      await caixa.setChecked(valor);
      await expect(caixa).toBeChecked({ checked: valor });
    }
  }
}

/** Salva, confirma o aviso de sucesso e espera a volta à consulta. */
async function salvarHorario(page: Page): Promise<void> {
  const formulario = page.locator('#main');
  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase() === '/pontohorario/posteditar' && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    salvar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`O salvamento do Horário retornou HTTP ${resposta.status()}.`);
  }

  const aviso = await confirmarAvisoHorario(page);
  if (!/Sucesso/i.test(aviso)) {
    throw new Error(`O SGE não aceitou o Horário: ${aviso}`);
  }
  await expect(tituloConsultaHorario(page)).toBeVisible({ timeout: 20000 });
}

/** Reabre o horário salvo e confere tudo o que a automação configurou. */
async function conferirPersistencia(
  page: Page,
  dados: HorarioData,
  percentuaisReutilizados: PercentuaisLidos | undefined,
): Promise<void> {
  const formulario = page.locator('#main');
  await pesquisarHorario(page, dados.descricao);
  await abrirEdicaoHorario(page, dados.descricao);

  await expect(formulario.locator('#TipoCargaHoraria option:checked')).toHaveText(dados.tipo);
  await expect(formulario.locator('#ColunaRefeicao option:checked')).toHaveText(dados.colunaRefeicao);
  for (const [id, campo] of TOGGLES_GERAIS) {
    await expect(formulario.locator(`#${id}`), `${campo} não foi persistido`).toBeChecked({ checked: dados[campo] });
  }
  await expect(formulario.locator('#ExibirAdcDiurnoCalculoHoraReduzida')).toBeChecked({ checked: dados.exibirHoraDiurnaReduzida });
  await expect(formulario.locator('#ExibirAdcNoturCalculoHoraReduzida')).toBeChecked({ checked: dados.exibirHoraNoturnaReduzida });
  if (dados.cargaHorariaFixaEmHoras) await expect(formulario.locator('#HorarioCompensacao')).toHaveValue(dados.cargaHorariaFixaEmHoras);
  if (dados.horarioFechamentoNoturno) await expect(formulario.locator('#HorarioFechamentoNoturno')).toHaveValue(dados.horarioFechamentoNoturno);
  if (dados.horaDiurnaReduzida) await expect(formulario.locator('#HoraDiurnaReduzida')).toHaveValue(dados.horaDiurnaReduzida);
  if (dados.horaNoturnaReduzida) await expect(formulario.locator('#HoraNoturnaReduzida')).toHaveValue(dados.horaNoturnaReduzida);

  for (const [dia, valores] of Object.entries(dados.jornada) as Array<[typeof DIAS_SEMANA_HORARIO[number], JornadaDiaHorario]>) {
    const indice = DIAS_SEMANA_HORARIO.indexOf(dia);
    for (const [campo, sufixo] of Object.entries(CAMPOS_JORNADA_TEXTO) as Array<[keyof typeof CAMPOS_JORNADA_TEXTO, string]>) {
      const valor = valores[campo];
      if (valor) await expect(formulario.locator(`#ListaPontoHorarioHora_${indice}__${sufixo}`), `jornada ${dia} ${campo}`).toHaveValue(valor);
    }
    for (const [campo, sufixo] of Object.entries(CAMPOS_JORNADA_MARCACAO) as Array<[keyof typeof CAMPOS_JORNADA_MARCACAO, string]>) {
      const valor = valores[campo];
      if (valor !== undefined) await expect(formulario.locator(`#ListaPontoHorarioHora_${indice}__${sufixo}`), `jornada ${dia} ${campo}`).toBeChecked({ checked: valor });
    }
  }

  if (dados.horasExtras.percentuais || percentuaisReutilizados) {
    await abrirAba(page, 'Horas Extras');
    const esperados = percentuaisReutilizados
      ?? Object.fromEntries(Object.entries(dados.horasExtras.percentuais ?? {}).map(([campo, valor]) => [campo, String(valor)]));
    for (const [campo, valor] of Object.entries(esperados)) {
      await expect(formulario.locator(`#${nomeCampoPercentual(campo as CampoPercentualHoraExtra)}`), `percentual ${campo}`).toHaveValue(valor);
    }
  }

  if (Object.keys(dados.colunas).length > 0) {
    await abrirAba(page, 'Coluna');
    for (const [codigo, opcoes] of Object.entries(dados.colunas)) {
      const indice = COLUNAS_HORARIO.indexOf(codigo as typeof COLUNAS_HORARIO[number]);
      for (const [opcao, sufixo] of [['impressao', 'Impressao'], ['edicao', 'Edicao'], ['preFolha', 'PreFolha']] as const) {
        const valor = opcoes[opcao];
        if (valor !== undefined) await expect(formulario.locator(`#ListaPontoHorarioColuna_${indice}__${sufixo}`), `coluna ${codigo} ${opcao}`).toBeChecked({ checked: valor });
      }
    }
  }

  await voltarParaConsultaHorario(page);
}

/** Cria um Horário pela interface e prova a persistência reabrindo o cadastro. */
export async function criarHorario(
  page: Page,
  options: BuildHorarioOptions = {},
  sequencia = 1,
): Promise<HorarioCriado> {
  // O SGE aceita descrição repetida, mas isso tornaria a conferência ambígua; usa a primeira livre.
  const sequenciaLivre = await proximaSequenciaLivreHorario(page, options, sequencia);
  const dados = buildHorario(options, sequenciaLivre);
  await navegarParaAdicionarHorario(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await select2.select(page, '#TipoCargaHoraria', dados.tipo, { exactMatch: true });
  await select2.select(page, '#ColunaRefeicao', dados.colunaRefeicao, { exactMatch: true });
  await preencherGeral(page, dados);
  await preencherJornada(page, dados);

  let percentuaisReutilizados: PercentuaisLidos | undefined;
  if (dados.horasExtras.usarConfiguracaoDoHorario) {
    percentuaisReutilizados = await usarConfiguracaoDeOutroHorario(page, dados.horasExtras.usarConfiguracaoDoHorario);
  }

  await salvarHorario(page);
  await pesquisarHorario(page, dados.descricao);
  await expect(linhaHorario(page, dados.descricao)).toHaveCount(1, { timeout: 15000 });

  // Percentuais e colunas só são gravados pela edição; reabre o horário e aplica.
  if (dados.horasExtras.percentuais || Object.keys(dados.colunas).length > 0) {
    await abrirEdicaoHorario(page, dados.descricao);
    await aplicarPercentuais(page, dados);
    await aplicarColunas(page, dados);
    await salvarHorario(page);
  }

  await conferirPersistencia(page, dados, percentuaisReutilizados);

  console.log(`[QAAUTO] Horário criado e conferido: ${dados.descricao} | Tipo: ${dados.tipo}`);
  return { ...dados, url: page.url() };
}
