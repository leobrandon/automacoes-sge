import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildAcompanhamento,
  isAcompanhamentoQAAuto,
  type AcompanhamentoData,
  type BuildAcompanhamentoOptions,
} from '../factories/acompanhamento.factory';
import {
  abrirModalAdicionarAcompanhamento,
  confirmarAvisoAcompanhamento,
  linhaAcompanhamento,
  pesquisarAcompanhamento,
  tituloConsultaAcompanhamento,
  voltarParaConsultaAcompanhamento,
} from '../helpers/navigation/acompanhamento.navigation';
import { datepicker } from '../helpers/datepicker.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface AcompanhamentoCriado extends AcompanhamentoData {
  protocolo: string;
  /** Pontuação lançada pela Secretaria, no formato do SGE ("100,00"); vazia se a pauta não tem itens. */
  pontuacaoObtida: string;
  pontuacaoTotal: string;
  url: string;
}

interface PeriodoOpcao {
  /** Nome sem as datas, como aparece na grade ("4º Bimestre"). */
  nome: string;
  /** Texto completo da opção ("4º Bimestre (01/10/2026 a 11/12/2026)"). */
  texto: string;
  dataInicial: string;
  dataFinal: string;
}

/** Todas as combinações de escola e período da pauta já estão ocupadas (ou foram recusadas pelo SGE). */
class SemCombinacaoLivreError extends Error {}

interface CombinacaoRegistrada {
  /** "NOME DA ESCOLA - código", como a grade mostra. */
  escola: string;
  periodo: string;
}

/**
 * Combinações escola + período que a grade já mostra para a pauta. Lê só a primeira página da pesquisa; o que
 * não estiver nela continua sendo barrado pelo SGE ("Já existe..."), que a action trata como recusa.
 */
async function combinacoesRegistradas(page: Page, tipoPauta: string): Promise<CombinacaoRegistrada[]> {
  await pesquisarAcompanhamento(page, tipoPauta);
  const linhas = await page.locator('#main #grid table tbody tr').evaluateAll((trs) => trs.map((tr) => ({
    pauta: tr.querySelector('strong')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    escola: tr.querySelectorAll('strong')[1]?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    periodo: /Período:\s*([^\n]+)/.exec((tr as HTMLElement).innerText)?.[1]?.trim() ?? '',
  })));
  return linhas
    .filter((l) => l.pauta.toLowerCase() === tipoPauta.toLowerCase() && l.escola && l.periodo)
    .map(({ escola, periodo }) => ({ escola, periodo }));
}

/** Recusas do SGE ao abrir o formulário que só significam "esta combinação não serve, tente outra". */
const RECUSA_DA_COMBINACAO = /Já existe um acompanhamento|data retroativa|dentro do período/i;

function normalizar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function numeroBr(texto: string): number {
  return Number(texto.replace(/\./g, '').replace(',', '.'));
}

function dataBr(texto: string): number {
  const [dia, mes, ano] = texto.split('/').map(Number);
  return new Date(ano, mes - 1, dia).getTime();
}

async function opcoesDoSelect(modal: Locator, id: string): Promise<string[]> {
  return (await modal.locator(`#${id} option`).allTextContents()).map(normalizar).filter(Boolean);
}

/**
 * Escolhe no Select2 do modal. `#UnidadeId` e `#DreId` também existem nos filtros avançados da consulta,
 * então o container é sempre buscado dentro do modal (o helper `select2` pegaria o dos filtros).
 */
async function escolherNoModal(page: Page, modal: Locator, id: string, texto: string): Promise<void> {
  await modal.locator(`#s2id_${id} .select2-choice`).click();
  const lista = page.locator('#select2-drop:visible');
  await expect(lista).toBeVisible();
  await lista.locator('li.select2-result-selectable')
    .filter({ hasText: new RegExp(`^\\s*${escaparRegex(texto)}\\s*$`) })
    .click();
  await expect(modal.locator(`#${id} option:checked`)).toHaveText(texto);
}

async function periodosDisponiveis(modal: Locator): Promise<PeriodoOpcao[]> {
  await expect.poll(
    async () => modal.locator('#PeriodoValor option').evaluateAll((o) => o.filter((x) => (x as HTMLOptionElement).value !== '').length),
    { message: 'Nenhum período carregado para o destino escolhido (verifique o Calendário-base do Tipo de pauta).', timeout: 15000 },
  ).toBeGreaterThan(0);
  return modal.locator('#PeriodoValor option').evaluateAll((opcoes) => opcoes
    .filter((o) => (o as HTMLOptionElement).value !== '')
    .map((o) => {
      const opcao = o as HTMLOptionElement;
      const texto = (opcao.textContent ?? '').replace(/\s+/g, ' ').trim();
      return {
        nome: texto.replace(/\s*\(.*$/, ''),
        texto,
        dataInicial: opcao.dataset.dataInicial ?? '',
        dataFinal: opcao.dataset.dataFinal ?? '',
      };
    }));
}

/**
 * Passo 2 do modal: tenta cada destino/período candidato até o SGE abrir o formulário. Sem exclusão pela
 * tela, as combinações usadas por execuções anteriores ficam ocupadas; as recusas conhecidas do SGE
 * (já registrado, data retroativa) só pulam para a próxima combinação.
 */
async function abrirFormularioEmCombinacaoLivre(
  page: Page,
  modal: Locator,
  dados: AcompanhamentoData,
  registradas: CombinacaoRegistrada[],
): Promise<{ escola: string; periodo: PeriodoOpcao }> {
  await modal.locator('#s2id_UnidadeId:not(.select2-container-disabled) .select2-choice')
    .waitFor({ state: 'visible', timeout: 15000 });
  const escolas = await opcoesDoSelect(modal, 'UnidadeId');
  if (dados.escola && !escolas.includes(dados.escola)) {
    throw new Error(`A escola "${dados.escola}" não é destino permitido da pauta. Opções: ${escolas.join(' | ')}.`);
  }
  const candidatas = dados.escola ? [dados.escola] : escolas;
  const recusas: string[] = [];
  let hoje = '';

  for (const escola of candidatas) {
    await escolherNoModal(page, modal, 'UnidadeId', escola);
    const periodos = await periodosDisponiveis(modal);
    const alvo = dados.periodo ? periodos.filter((p) => p.nome === dados.periodo) : periodos;
    if (alvo.length === 0) {
      throw new Error(
        `O período "${dados.periodo}" não existe para esta pauta. Opções: ${periodos.map((p) => p.nome).join(' | ')}.`,
      );
    }

    for (const periodo of alvo) {
      // Combinação que a grade já mostra: pula sem gastar uma tentativa (e o aviso) no SGE.
      if (registradas.some((r) => (r.escola === escola || r.escola.startsWith(`${escola} - `)) && r.periodo === periodo.nome)) {
        recusas.push(`${escola} / ${periodo.nome}: já consta na grade`);
        continue;
      }
      await escolherNoModal(page, modal, 'PeriodoValor', periodo.texto);

      const hora = modal.locator('#HoraDaPauta');
      if (await hora.isVisible()) {
        throw new Error('A pauta exige Hora da pauta, que esta automação ainda não preenche.');
      }
      // Pauta que registra data vem com a data de hoje e o campo guarda o último valor digitado; a data
      // precisa cair dentro do período escolhido (hoje, se couber; senão o início do período).
      const data = modal.locator('#DataDaPauta');
      if (await data.isVisible()) {
        if (!hoje) hoje = await data.inputValue();
        const cabeHoje = dataBr(hoje) >= dataBr(periodo.dataInicial) && dataBr(hoje) <= dataBr(periodo.dataFinal);
        const alvoData = cabeHoje ? hoje : periodo.dataInicial;
        if (await data.inputValue() !== alvoData) await datepicker.fill(page, '#DataDaPauta', alvoData);
      }

      await getByRoleSge(modal.locator('.modal-footer'), 'button', { name: /Abrir formulário/ }).click();

      const aberto = page.getByRole('dialog').filter({ hasText: /Dados iniciais validados/i });
      const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
      await expect(aberto.or(atencao).first()).toBeVisible({ timeout: 20000 });
      if (await aberto.first().isVisible()) {
        await confirmarAvisoAcompanhamento(page);
        return { escola, periodo };
      }

      const aviso = normalizar(await atencao.first().innerText());
      if (!RECUSA_DA_COMBINACAO.test(aviso)) {
        throw new Error(`O SGE não abriu o formulário (${escola} / ${periodo.texto}): ${aviso}`);
      }
      recusas.push(`${escola} / ${periodo.nome}: ${aviso.replace(/^!?\s*Atenção!?\s*/i, '').replace(/\s*Ok$/, '')}`);
      await confirmarAvisoAcompanhamento(page);
    }
  }

  throw new SemCombinacaoLivreError(
    `Nenhuma combinação livre de escola e período para "${dados.tipoPauta}". Não há exclusão de acompanhamento `
    + 'pela tela: cadastre outro Tipo de pauta (criar_tipo_pauta_action, de preferência com "Permite cadastro '
    + 'retroativo") ou informe outra pauta/escola/período em dados_acompanhamento.json. '
    + `Recusas: ${recusas.join(' || ')}.`,
  );
}

/** Fecha o modal de abertura sem registrar nada. */
async function cancelarModalAbertura(modal: Locator): Promise<void> {
  await getByRoleSge(modal.locator('.modal-footer'), 'button', { name: /Cancelar/ }).click();
  await expect(modal).toBeHidden({ timeout: 15000 });
}

/** Lança o percentual configurado em todos os itens (visão Secretaria) e confere a pontuação somada. */
async function responderItens(conteudo: Locator, percentual: number): Promise<{ obtida: string; total: string }> {
  const itens = conteudo.locator('input[name$=".PontuacaoAplicada"]');
  const quantidade = await itens.count();
  const resumo = async (): Promise<{ obtida: string; total: string }> => {
    const texto = await conteudo.innerText();
    const partes = /Pontuação obtida\s+([\d.]+,\d{2})\s*\/\s*([\d.]+,\d{2})\s*pts/.exec(texto);
    return { obtida: partes?.[1] ?? '', total: partes?.[2] ?? '' };
  };
  if (quantidade === 0) {
    await expect(conteudo).toContainText(/Nenhum item disponível para preenchimento/i);
    return { obtida: '', total: '' };
  }

  // Cada item é uma linha com a resposta (aqui só Sim/Não) e a pontuação; o SGE recusa salvar sem a resposta
  // ("Informe o valor da resposta"), então a linha é respondida "Sim" e depois recebe o percentual.
  const linhas = conteudo.locator('.pauta-item-row');
  await expect(linhas).toHaveCount(quantidade);
  for (let i = 0; i < quantidade; i++) {
    const item = linhas.nth(i);
    const tipoDeCampo = await item.getAttribute('data-tipo-de-campo');
    if (tipoDeCampo !== '0') {
      throw new Error(
        `O item ${i + 1} da pauta usa o tipo de campo ${tipoDeCampo}; a automação só responde itens Sim/Não (tipo 0).`,
      );
    }
    const simNao = item.locator('input[data-resposta-sim-nao]');
    // O checkbox é estilizado: o clique vai no rótulo que o contém.
    await item.locator('label.pauta-item-simnao').click();
    await expect(simNao).toBeChecked();
    await item.locator(`button.pauta-score-shortcut[data-percentual="${percentual}"]`).click();
    await expect(item.locator('input[name$=".PontuacaoAplicada"]')).not.toHaveValue('');
  }

  const { total } = await resumo();
  const esperada = (numeroBr(total) * percentual) / 100;
  await expect.poll(async () => numeroBr((await resumo()).obtida), {
    message: `A pontuação obtida deveria somar ${percentual}% do total (${total}).`,
  }).toBeCloseTo(esperada, 2);
  return resumo();
}

/**
 * Cria o acompanhamento pelo modal, lança a pontuação como Secretaria, salva e prova a persistência pela
 * grade e reabrindo o registro. Não exclui: a tela não oferece exclusão para este perfil.
 */
export async function criarAcompanhamento(
  page: Page,
  options: BuildAcompanhamentoOptions = {},
): Promise<AcompanhamentoCriado> {
  const dados = buildAcompanhamento(options);

  // A automação não cria dados de apoio: usa Tipo de pauta QAAUTO que já exista (e falha dizendo o que cadastrar).
  const modalInicial = await abrirModalAdicionarAcompanhamento(page);
  const pautas = await opcoesDoSelect(modalInicial, 'TipoDePautaId');
  const qaauto = pautas.filter(isAcompanhamentoQAAuto);
  if (qaauto.length === 0) {
    throw new Error(
      'Nenhum Tipo de pauta QAAUTO cadastrado. Execute criar_tipo_pauta_action antes de criar o Acompanhamento '
      + '(a pauta precisa de Área de atuação: execute criar_area_atuacao_action antes, se também não houver).',
    );
  }
  if (dados.tipoPauta && !pautas.includes(dados.tipoPauta)) {
    throw new Error(`O Tipo de pauta "${dados.tipoPauta}" não existe. Opções QAAUTO: ${qaauto.join(' | ')}.`);
  }
  await cancelarModalAbertura(modalInicial);

  // Pauta informada = só ela. Sem pauta no JSON, tenta as QAAUTO em ordem até uma ter itens e combinação livre.
  const candidatas = dados.tipoPauta ? [dados.tipoPauta] : qaauto;
  const descartadas: string[] = [];
  const conteudo = page.locator('#main');
  let escolhida: { tipoPauta: string; escola: string; periodo: PeriodoOpcao } | undefined;

  for (const candidata of candidatas) {
    // Lê a grade antes de abrir o modal (com ele aberto a consulta fica bloqueada).
    const registradas = await combinacoesRegistradas(page, candidata);
    const modal = await abrirModalAdicionarAcompanhamento(page);
    await escolherNoModal(page, modal, 'TipoDePautaId', candidata);
    // `#main` fica com aria-hidden quando o modal é reaberto: sem `getByRoleSge` o botão não é encontrado.
    await getByRoleSge(modal.locator('.modal-footer'), 'button', { name: /Continuar/ }).click();

    let aberta: { escola: string; periodo: PeriodoOpcao };
    try {
      aberta = await abrirFormularioEmCombinacaoLivre(page, modal, { ...dados, tipoPauta: candidata }, registradas);
    } catch (erro) {
      if (!(erro instanceof SemCombinacaoLivreError) || dados.tipoPauta) throw erro;
      descartadas.push(`${candidata}: sem combinação livre de escola e período`);
      await cancelarModalAbertura(modal);
      continue;
    }

    // O título traz um glifo de ícone antes do nome, então não dá para ancorar o início do nome acessível.
    await expect(getByRoleSge(conteudo, 'heading', { name: new RegExp(`${escaparRegex(candidata)}(\\s|$)`, 'i') }))
      .toBeVisible({ timeout: 20000 });
    if (!dados.tipoPauta && await conteudo.locator('.pauta-item-row').count() === 0) {
      // Sem itens não há pontuação a lançar: descarta (o formulário aberto não foi salvo, nada é gravado).
      descartadas.push(`${candidata}: sem itens para pontuar`);
      await voltarParaConsultaAcompanhamento(page);
      continue;
    }
    escolhida = { tipoPauta: candidata, ...aberta };
    break;
  }

  if (!escolhida) {
    throw new Error(
      'Nenhum Tipo de pauta QAAUTO utilizável (precisa de itens e de uma combinação livre de escola e período). '
      + `Descartadas: ${descartadas.join(' | ')}. Execute criar_tipo_pauta_action para cadastrar outra pauta.`,
    );
  }
  const { tipoPauta, escola, periodo } = escolhida;
  await expect(conteudo).toContainText(/Status da pauta\s+Aberto/);
  const { obtida, total } = await responderItens(conteudo, dados.percentualResposta);

  const salvar = getByRoleSge(conteudo, 'button', { name: /Salvar/ });
  await expect(salvar).toBeVisible();
  // O aviso de sucesso deste salvamento não é estável na tela (some junto com o recarregamento da página),
  // então a prova do salvamento é a resposta do POST e a mudança de situação para "Em preenchimento".
  const [resposta] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.toLowerCase() === '/acompanhamento/salvarrespostas'
      && r.request().method() === 'POST', { timeout: 30000 }),
    salvar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`O SGE não salvou o Acompanhamento: HTTP ${resposta.status()}.`);
  }
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(conteudo).toContainText(/Status da pauta\s+Em preenchimento/, { timeout: 20000 })
    .catch(async (erro) => {
      if (await atencao.first().isVisible()) {
        throw new Error(`O SGE não salvou o Acompanhamento: ${normalizar(await atencao.first().innerText())}`);
      }
      throw erro;
    });
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15000 });
  // O protocolo definitivo só existe depois do primeiro salvamento (o da abertura é provisório).
  const protocolo = /Protocolo\s+(\d+)/.exec(await conteudo.innerText())?.[1] ?? '';
  expect(protocolo, 'protocolo do acompanhamento').not.toBe('');

  await voltarParaConsultaAcompanhamento(page);
  await pesquisarAcompanhamento(page, tipoPauta);
  const linha = linhaAcompanhamento(page, tipoPauta, periodo.nome, escola);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha).toContainText('Em preenchimento');
  if (total) {
    await expect(linha).not.toContainText('Sem pontuação');
    await expect(linha).toContainText(`/ ${total}`);
  }

  // Reabre pela grade para conferir o que foi gravado.
  await linha.locator('strong').filter({ hasText: new RegExp(`^\\s*${escaparRegex(tipoPauta)}\\s*$`, 'i') }).click();
  await expect(conteudo).toContainText(new RegExp(`Protocolo\\s+${protocolo}`), { timeout: 20000 });
  await expect(conteudo).toContainText(escola);
  await expect(conteudo).toContainText(new RegExp(`Período\\s+${escaparRegex(periodo.nome)}`));
  if (obtida) await expect(conteudo).toContainText(`${obtida} / ${total} pts`);
  await voltarParaConsultaAcompanhamento(page);
  await expect(tituloConsultaAcompanhamento(page)).toBeVisible();

  console.log(`[QAAUTO] Acompanhamento criado e conferido: ${tipoPauta} / ${escola} / ${periodo.nome} / protocolo ${protocolo}`);
  return {
    ...dados,
    tipoPauta,
    escola,
    periodo: periodo.nome,
    protocolo,
    pontuacaoObtida: obtida,
    pontuacaoTotal: total,
    url: page.url(),
  };
}
