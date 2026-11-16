import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildPessoaComunidade,
  type AnexoConselhoData,
  type MembroConselhoData,
  type VigenciaConselhoData,
} from '../factories/conselho-escolar.factory';
import { DatepickerHelper } from '../helpers/datepicker.helper';
import { Select2Helper } from '../helpers/select2.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirVigencia,
  botaoExcluirVigencia,
  confirmarPerguntaConselho,
  fecharAvisoConselho,
  linhaVigencia,
  modalVisivel,
  navegarParaConselhoEscolar,
  tabelaAnexos,
  tabelaMembros,
} from '../helpers/navigation/conselho-escolar.navigation';

export interface VigenciaConselhoCriada {
  dataInicio: string;
  dataFim: string;
  membros: string[];
  anexos: string[];
  url: string;
}

/** PDF mínimo aceito pelo SGE (extensão .pdf, abaixo de 2 MB). */
const CONTEUDO_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Abre o modal "Adicionar nova vigência" a partir da grade, preenche e devolve o modal. */
async function abrirModalVigencia(page: Page, dataInicio: string, dataFim: string): Promise<Locator> {
  await navegarParaConselhoEscolar(page);
  await getByRoleSge(page.locator('#main'), 'button', { name: /Adicionar vigência/i }).click();
  const modal = modalVisivel(page, '#DataInicio');
  await expect(modal.locator('#DataInicio')).toBeVisible({ timeout: 15000 });
  await DatepickerHelper.fill(page, '.modal:visible #DataInicio', dataInicio);
  if (dataFim) await DatepickerHelper.fill(page, '.modal:visible #DataFim', dataFim);
  return modal;
}

async function cancelarModal(modal: Locator): Promise<void> {
  await getByRoleSge(modal, 'button', { name: /Cancelar/ }).click();
  await expect(modal).toBeHidden({ timeout: 15000 });
}

async function adicionarVigencia(page: Page, dataInicio: string, dataFim: string): Promise<void> {
  const modal = await abrirModalVigencia(page, dataInicio, dataFim);
  await getByRoleSge(modal, 'button', { name: /Salvar/ }).click();
  await fecharAvisoConselho(page, /A vigência foi adicionada/i);
  await botaoExcluirVigencia(page).waitFor({ state: 'visible', timeout: 20000 });
}

async function selecionarFuncao(page: Page, funcao: string): Promise<void> {
  const opcao = new RegExp(`^\\s*${escapar(funcao)}\\s*\\(\\d+ anos?\\)\\s*$`, 'i');
  try {
    await Select2Helper.select(page, '.modal:visible #s2id_FuncaoConselhoEscolarId', opcao);
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new Error(
      `A função "${funcao}" não está disponível para novos membros. Cadastre-a (ativa e com o tipo de membro desejado) `
      + `em Escola > Conselho Escolar > Função, perfil Secretaria, ou ajuste "funcao" no dados_conselho_escolar.json. ${detalhe}`,
      { cause: erro },
    );
  }
}

async function preencherComunidade(page: Page, modal: Locator, membro: MembroConselhoData): Promise<void> {
  const pessoa = membro.comunidade ?? buildPessoaComunidade(0);
  const cpf = modal.locator('#Pessoa_CPF');
  await expect(cpf).toBeEnabled();
  await cpf.click();
  await cpf.fill(pessoa.cpf);
  await expect(cpf).toHaveValue(pessoa.cpfFormatado);
  await cpf.press('Tab');
  const nome = modal.locator('#Pessoa_Nome');
  await expect(nome, `Os dados da comunidade não habilitaram após o CPF ${pessoa.cpfFormatado}.`)
    .toBeEditable({ timeout: 30000 });
  await nome.fill(pessoa.nome);
  await DatepickerHelper.fill(page, '.modal:visible #Pessoa_DataNascimento', pessoa.dataNascimento);
  const celular = modal.locator('#Pessoa_Celular');
  await celular.click();
  // A máscara de celular reagrupa os dígitos de forma própria (ex.: "(62) 9999-90001"); valida-se os 11 dígitos.
  await celular.pressSequentially(pessoa.celular, { delay: 50 });
  await celular.press('Tab');
  await expect.poll(async () => (await celular.inputValue()).replace(/\D/g, ''), {
    message: 'O celular da comunidade não manteve os 11 dígitos informados.',
  }).toBe(pessoa.celular);
}

/** Abre o modal de membro e preenche; devolve o modal e o texto da pessoa listada (quando houver). */
async function preencherMembro(
  page: Page,
  membro: MembroConselhoData,
): Promise<{ modal: Locator; pessoaListada: string }> {
  await page.locator('a[onclick="abrirModalMembro(0)"]').click();
  const modal = modalVisivel(page, '#FuncaoConselhoEscolarId');
  await expect(modal).toBeVisible({ timeout: 15000 });

  await selecionarFuncao(page, membro.funcao);
  await Select2Helper.select(page, '.modal:visible #s2id_Tipo', membro.tipo, { exactMatch: true });

  if (membro.tipo === 'Comunidade') {
    await preencherComunidade(page, modal, membro);
    return { modal, pessoaListada: '' };
  }

  await Select2Helper.select(page, '.modal:visible #s2id_PessoaId', membro.pessoa ? membro.pessoa : /\d{3}\.\d{3}\.\d{3}-\d{2}/);
  const pessoaListada = await Select2Helper.getSelectedText(page, '.modal:visible #s2id_PessoaId');
  return { modal, pessoaListada };
}

async function adicionarMembro(page: Page, membro: MembroConselhoData): Promise<string> {
  const { modal, pessoaListada } = await preencherMembro(page, membro);
  await getByRoleSge(modal, 'button', { name: /Salvar/ }).click();
  await fecharAvisoConselho(page, /O membro foi adicionado/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  // A linha traz "CPF - NOME (idade)"; o CPF identifica o membro de comunidade com exatidão.
  const identificador = membro.comunidade ? membro.comunidade.cpfFormatado : pessoaListada;
  const linha = tabelaMembros(page).locator('tbody tr').filter({ hasText: new RegExp(escapar(identificador), 'i') });
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha).toContainText(membro.tipo);
  return identificador;
}

async function adicionarAnexo(page: Page, anexo: AnexoConselhoData): Promise<string> {
  await page.locator('a[onclick="abrirModalAnexo(0)"]').click();
  const modal = modalVisivel(page, '#arquivo');
  await expect(modal.locator('#Descricao')).toBeVisible({ timeout: 15000 });
  await modal.locator('#Descricao').fill(anexo.descricao);
  await Select2Helper.select(page, '.modal:visible #s2id_Tipo', anexo.tipo, { exactMatch: true });
  await modal.locator('#arquivo').setInputFiles({
    name: anexo.nomeArquivo,
    mimeType: 'application/pdf',
    buffer: CONTEUDO_PDF,
  });
  await expect(modal.getByText(anexo.nomeArquivo)).toBeVisible();
  await getByRoleSge(modal, 'button', { name: /Salvar/ }).click();
  await fecharAvisoConselho(page, /O anexo foi adicionado/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  const linha = tabelaAnexos(page).locator('tbody tr').filter({ hasText: anexo.descricao });
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha).toContainText(anexo.tipo);
  return anexo.descricao;
}

/**
 * Cria a vigência e seus membros e anexos pela interface, provando cada item na tela
 * e a contagem na grade. `aoCriarVigencia` é chamado assim que a vigência existe, para
 * o chamador registrar a limpeza mesmo que um passo seguinte falhe.
 */
export async function criarVigenciaConselhoEscolar(
  page: Page,
  vigencia: VigenciaConselhoData,
  aoCriarVigencia?: (datas: { dataInicio: string; dataFim: string }) => void,
): Promise<VigenciaConselhoCriada> {
  await adicionarVigencia(page, vigencia.dataInicio, vigencia.dataFim);
  aoCriarVigencia?.({ dataInicio: vigencia.dataInicio, dataFim: vigencia.dataFim });

  const membros: string[] = [];
  for (const membro of vigencia.membros) membros.push(await adicionarMembro(page, membro));
  const anexos: string[] = [];
  for (const anexo of vigencia.anexos) anexos.push(await adicionarAnexo(page, anexo));

  await navegarParaConselhoEscolar(page);
  const linha = linhaVigencia(page, vigencia.dataInicio, vigencia.dataFim);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha).toHaveText(
    new RegExp(`${vigencia.dataInicio}\\s*${vigencia.dataFim}\\s*${membros.length}\\s*${anexos.length}`),
  );
  return { dataInicio: vigencia.dataInicio, dataFim: vigencia.dataFim, membros, anexos, url: page.url() };
}

/**
 * Confere as recusas do SGE (início > fim, conflito de vigência, função repetida,
 * exclusão de vigência com anexos/membros) sem persistir nada além da vigência informada,
 * que deve existir com ao menos um membro e um anexo.
 */
export async function validarRecusasConselhoEscolar(page: Page, vigencia: VigenciaConselhoData): Promise<void> {
  const membro = vigencia.membros[0];
  if (!membro) throw new Error('A vigência usada nas recusas precisa ter ao menos um membro.');

  // 1. Data inicial maior que a final.
  let modal = await abrirModalVigencia(page, '01/01/2999', '01/01/2998');
  await getByRoleSge(modal, 'button', { name: /Salvar/ }).click();
  await fecharAvisoConselho(page, /A data inicial não pode ser maior que a final/i);
  await cancelarModal(modal);

  // 2. Vigência conflitante com a existente.
  modal = await abrirModalVigencia(page, vigencia.dataInicio, vigencia.dataFim);
  await getByRoleSge(modal, 'button', { name: /Salvar/ }).click();
  await fecharAvisoConselho(page, /a data inicial conflita com outra vigência existente/i);
  await cancelarModal(modal);

  // 3. Mesma função na mesma vigência (nova pessoa de comunidade, mesma função do primeiro membro).
  await abrirVigencia(page, vigencia.dataInicio, vigencia.dataFim);
  const repetido: MembroConselhoData = {
    tipo: 'Comunidade',
    funcao: membro.funcao,
    comunidade: buildPessoaComunidade(9),
  };
  const { modal: modalMembro } = await preencherMembro(page, repetido);
  await getByRoleSge(modalMembro, 'button', { name: /Salvar/ }).click();
  await fecharAvisoConselho(page, /Já existe um outro membro com essa função durante a vigência/i);
  await cancelarModal(modalMembro);

  // 4. Excluir vigência que possui anexos vinculados.
  await botaoExcluirVigencia(page).click();
  await confirmarPerguntaConselho(page, /Tem certeza que deseja remover essa vigência/i);
  await fecharAvisoConselho(page, /Não é possível remover essa vigência, pois existem/i);
  await expect(botaoExcluirVigencia(page)).toBeVisible();
}
