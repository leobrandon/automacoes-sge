import { expect, type Locator, type Page } from '@playwright/test';
import { navegarParaManutencaoMatriculaTurma } from '../helpers/navigation/manutencao-matricula-turma.navigation';

export interface ManutencaoMatriculaTurmaDados {
  /** Rótulo completo da turma no seletor (descrição - série - composição - turno). Deve estar sem alunos cursando. */
  turma: string;
  /** Nome que não existe no tenant, usado para provar a proposta de cadastro. */
  nomeInexistente: string;
  escola: string;
  serie: string;
  turno: string;
}

export const MENSAGENS_MANUTENCAO_MATRICULA = {
  listaVazia: 'Informe a lista de alunos.',
  nomesRepetidos: 'Existem nomes repetidos na lista.',
  alunoSemTurma: 'Alocar na turma.',
  alunoJaNaTurma: 'Escola já alocado na turma',
  nomeInexistenteSituacao: 'Escola não cadastrado na rede.',
  nomeInexistenteOperacao: 'Cadastrar o escola e alocar na turma.',
  desalocar: 'Desalocar.',
  processado: 'Processamento completado!',
} as const;

function exato(texto: string): RegExp {
  return new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
}

export async function abrirManutencaoMatriculaTurma(page: Page): Promise<void> {
  await navegarParaManutencaoMatriculaTurma(page);
}

/** Escolhe a turma no Select2 e exige exatamente uma opção com o rótulo informado. */
export async function selecionarTurmaManutencao(page: Page, turma: string): Promise<void> {
  // Após "Nova manutenção" o Select2 pode ainda exibir a turma anterior com o valor já limpo ("Selecione a turma."):
  // só reaproveita a seleção quando o texto exibido e o valor do campo coincidem.
  const escolhida = page.locator('#s2id_TurmaId .select2-chosen');
  const valorAtual = await page.locator('#TurmaId').inputValue();
  if (valorAtual && exato(turma).test(await escolhida.innerText())) return;
  await page.locator('#s2id_TurmaId .select2-choice').click();
  const lista = page.locator('#select2-drop:visible');
  await expect(lista).toBeVisible();
  const opcoes = lista.locator('li.select2-result-selectable');
  await expect(opcoes.first(), 'Nenhuma turma ativa na unidade/ano letivo da sessão.').toBeVisible();
  const opcao = opcoes.filter({ hasText: exato(turma) });
  if (await opcao.count() !== 1) {
    const disponiveis = (await opcoes.allInnerTexts()).map(t => t.trim()).join(' | ');
    throw new Error(`Turma "${turma}" indisponível ou ambígua. Disponíveis: ${disponiveis}.`);
  }
  await opcao.click();
  await expect(page.locator('#s2id_TurmaId .select2-chosen')).toHaveText(exato(turma));
}

/** Preenche turma + lista (um nome por linha) e aciona Analisar. Não espera o resultado. */
export async function analisarListaManutencao(page: Page, turma: string, nomes: string[]): Promise<void> {
  await selecionarTurmaManutencao(page, turma);
  await page.locator('#NomeDosAlunos').fill(nomes.join('\n'));
  await page.locator('#btnAnalisar').click();
}

export function gradeLista(page: Page): Locator {
  return page.locator('#gridAlunos');
}

export function gradeSobressalentes(page: Page): Locator {
  return page.locator('#gridAlunosSobressalentes');
}

/** Linha de um aluno na grade; o nome aparece em maiúsculas para alunos existentes, por isso a busca ignora caixa. */
export function linhaGrade(grade: Locator, nome: string): Locator {
  return grade.locator('tbody tr').filter({ has: grade.page().getByRole('cell', { name: new RegExp(`^\\s*${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }) });
}

/**
 * Espera o resultado da análise. Quando todas as linhas já estão alocadas não há o que processar e o botão
 * Processar fica oculto, por isso a prova de que a análise terminou é a grade preenchida com o botão Analisar oculto.
 * Se o SGE recusar a análise, o texto do aviso entra na mensagem de falha em vez de um timeout genérico.
 */
export async function aguardarAnaliseManutencao(page: Page): Promise<void> {
  const grade = gradeLista(page);
  const aviso = page.locator('#divSmallBoxes, .SmallBox, .divMessageBox');
  let recusa = '';
  try {
    await expect.poll(async () => {
      if (await grade.locator('tbody tr').count() > 0 && await page.locator('#btnAnalisar').isHidden()) return 'ok';
      const textos = (await aviso.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
      const erro = textos.find(t => /Erro/i.test(t));
      if (erro) recusa = erro;
      return 'aguardando';
    }, { timeout: 20000 }).toBe('ok');
  } catch (erro) {
    throw new Error(recusa ? `O SGE recusou a análise: ${recusa}` : `A análise não retornou resultado: ${String(erro)}`);
  }
}

export async function cancelarManutencao(page: Page): Promise<void> {
  await page.locator('#btnCancelar').click();
  await expect(page.locator('#btnAnalisar')).toBeVisible();
  await expect(page.locator('#NomeDosAlunos')).toBeEnabled();
}

export interface ResultadoLinhaManutencao {
  nome: string;
  mensagem: string;
}

/**
 * Aciona Processar e devolve a mensagem de cada linha processada (coluna "Mensagem").
 * O aviso "Processamento completado!" fica num bloco oculto (#completedDisplay) e não prova nada: o resultado real
 * está na coluna Mensagem. O SGE responde "Não selecionado." para linhas marcadas quando o servidor não reconhece a
 * operação enviada; isso é falha do produto e é reportada com a evidência, sem ajustar o esperado.
 */
export async function processarManutencao(page: Page): Promise<ResultadoLinhaManutencao[]> {
  await page.locator('#btnProcessar').click();
  await expect(page.locator('#btnNova')).toBeVisible({ timeout: 30000 });
  const linhas = page.locator('#gridAlunos tbody tr, #gridAlunosSobressalentes tbody tr');
  await expect(linhas.first()).toBeVisible();
  const resultado = await linhas.evaluateAll(trs => trs.map(tr => {
    const celulas = Array.from((tr as HTMLTableRowElement).cells).map(c => (c.textContent ?? '').replace(/\s+/g, ' ').trim());
    return { nome: celulas[0] ?? '', mensagem: celulas[celulas.length - 1] ?? '' };
  }));
  const recusadas = resultado.filter(l => /Não selecionado/i.test(l.mensagem));
  if (recusadas.length) {
    throw new Error(
      `O SGE não executou a operação de ${recusadas.map(l => l.nome).join(', ')}: a coluna Mensagem mostra "${recusadas[0].mensagem}" ` +
      'mesmo com a linha marcada (a requisição ExecutarManutencaoMatricula foi enviada com o guid da linha).',
    );
  }
  return resultado;
}

/** Erro exibido pelo SGE (toast "Erro!"): o texto some em segundos, por isso a asserção usa o texto exato. */
export async function esperarErroManutencao(page: Page, mensagem: string): Promise<void> {
  await expect(page.getByText(mensagem, { exact: true }).first()).toBeVisible({ timeout: 10000 });
}
