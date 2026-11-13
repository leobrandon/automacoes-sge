import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { selecionarOpcaoApoio } from '../helpers/turma-apoio.helper';
import { celulaDescricaoTurmaAee, linhaTurmaAee, pesquisarTurmaAee } from '../helpers/navigation/turma-aee.navigation';

export interface AlocacaoAlunoAee {
  turma: string;
  escolaTurma: string;
  calendario: string;
  escolaAluno: string;
  aluno: string;
  necessidadeEspecial: string;
  dias: string[];
  atividades: string[];
}

function exato(texto: string): RegExp {
  return new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
}

async function selecionarLista(page: Page, linha: Locator, id: string, valores: string[]): Promise<void> {
  const campo = linha.locator(`#s2id_${id} input`);
  for (const valor of valores) {
    await expect(campo).toBeVisible();
    await campo.click();
    const lista = page.locator('#select2-drop:visible');
    await expect(lista).toBeVisible();
    const opcoes = lista.locator('li.select2-result-selectable');
    const textos = (await opcoes.allInnerTexts()).map(t => t.trim()).filter(Boolean);
    const opcao = opcoes.filter({ hasText: exato(valor) });
    if (await opcao.count() !== 1) throw new Error(`Opção "${valor}" indisponível ou ambígua em ${id}. Disponíveis: ${textos.join(' | ') || 'nenhuma'}.`);
    await opcao.click();
    await expect(linha.locator(`#s2id_${id} .select2-search-choice`).filter({ hasText: exato(valor) })).toHaveCount(1);
  }
  await page.keyboard.press('Escape');
}

/** Aloca um aluno existente em uma turma AEE existente e confirma o vínculo cursando. */
export async function alocarAlunoTurmaAee(page: Page, dados: AlocacaoAlunoAee): Promise<void> {
  for (const campo of ['turma', 'escolaTurma', 'calendario', 'escolaAluno', 'aluno', 'necessidadeEspecial'] as const) {
    if (typeof dados[campo] !== 'string' || !dados[campo].trim()) {
      throw new Error(`Informe ${campo} nos dados da alocação AEE.`);
    }
  }
  for (const campo of ['dias', 'atividades'] as const) {
    const valores = dados[campo];
    if (!Array.isArray(valores) || !valores.length || valores.some(v => typeof v !== 'string' || !v.trim()) || new Set(valores).size !== valores.length) {
      throw new Error(`Informe ${campo} como lista não vazia, sem valores repetidos, nos dados da alocação AEE.`);
    }
  }
  await pesquisarTurmaAee(page, dados.turma);
  const turma = linhaTurmaAee(page, dados.turma);
  await expect(turma).toHaveCount(1);
  await expect(celulaDescricaoTurmaAee(turma, dados.turma)).toHaveCount(1);
  for (const texto of ['AEE', 'Ativa', dados.escolaTurma, dados.calendario]) {
    await expect(getByRoleSge(turma, 'cell', { name: texto, exact: true })).toBeVisible();
  }
  await turma.click();
  const formTurma = page.locator('#formEditarTurmaAEE');
  await expect(formTurma.locator('#Descricao')).toHaveValue(exato(dados.turma));
  const alocar = getByRoleSge(page.locator('#main'), 'link', { name: /Alocar e Desalocar/i });
  await expect(alocar).toBeVisible();
  await alocar.click();
  const form = page.locator('#formAlocarDesalocarAlunosNaTurmaAEE');
  await expect(form.locator('#Descricao')).toHaveValue(exato(dados.turma));
  await expect(form.locator('#CalendarioEscolar_Descricao')).toHaveValue(dados.calendario);
  const alocados = form.locator('#alunosAlocadosNaTurma tbody tr').filter({ has: page.getByText(exato(dados.aluno)) });
  await expect(alocados.filter({ has: page.getByText('Cursando', { exact: true }) })).toHaveCount(0);
  await selecionarOpcaoApoio(page, 'FiltroEscolaId', dados.escolaAluno, 'Escola do aluno', 'alocação AEE');
  await form.locator('#btnPesquisar').click();
  const candidatos = form.locator('#alunosPossiveisDeAlocacao tbody tr').filter({ has: page.getByText(exato(dados.aluno)) });
  await expect(candidatos, `Aluno ${dados.aluno} não encontrado entre os candidatos da escola informada.`).toHaveCount(1, { timeout: 20000 });
  await expect(getByRoleSge(candidatos, 'cell', { name: dados.escolaAluno, exact: true })).toBeVisible();
  await expect(getByRoleSge(candidatos, 'cell', { name: dados.necessidadeEspecial, exact: true })).toBeVisible();
  await candidatos.locator('input.checkBoxAlunoPossivelDeAlocacao').check();
  await selecionarLista(page, candidatos, 'DiasDeComparecimento', dados.dias);
  await selecionarLista(page, candidatos, 'AtividadesNaTurma', dados.atividades);
  await form.locator('#btnAlocar').click();
  const sucesso = page.getByRole('dialog').filter({ hasText: 'O aluno foi alocado.' });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  const vinculo = alocados.filter({ has: page.getByText('Cursando', { exact: true }) });
  await expect(vinculo).toHaveCount(1);
  await expect(getByRoleSge(vinculo, 'cell', { name: dados.escolaAluno, exact: true })).toBeVisible();
  for (const texto of [...dados.dias, ...dados.atividades]) await expect(vinculo).toContainText(texto);
}
