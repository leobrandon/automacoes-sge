import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MENSAGENS_MANUTENCAO_MATRICULA as MSG,
  abrirManutencaoMatriculaTurma,
  aguardarAnaliseManutencao,
  analisarListaManutencao,
  cancelarManutencao,
  criarAluno,
  esperarErroManutencao,
  excluirAluno,
  gradeLista,
  gradeSobressalentes,
  linhaGrade,
  processarManutencao,
  selecionarTurmaManutencao,
  type ManutencaoMatriculaTurmaDados,
} from '../../../../src/actions';
import { buildAluno } from '../../../../src/factories';
import { loginSge } from '../../../../src/helpers';

const dados = JSON.parse(readFileSync(join(__dirname, 'dados_manutencao_matricula_turma.json'), 'utf8')) as ManutencaoMatriculaTurmaDados;

/** A tela só existe para o perfil de unidade escolar (SGE_USUARIO_UNIDADE / SGE_SENHA_UNIDADE no .env). */
async function entrarComoUnidade(page: import('@playwright/test').Page): Promise<void> {
  const usuario = process.env.SGE_USUARIO_UNIDADE;
  const senha = process.env.SGE_SENHA_UNIDADE;
  if (!usuario || !senha) throw new Error('Defina SGE_USUARIO_UNIDADE e SGE_SENHA_UNIDADE no .env: "Manutenção matrícula por turma" não existe no perfil de Secretaria.');
  await loginSge(page, { baseUrl: process.env.BASE_URL, usuario, senha, timeout: 60000 });
  await abrirManutencaoMatriculaTurma(page);
}

/**
 * Divergência da UI: "Nova manutenção" limpa o valor da turma mas o Select2 continua exibindo a turma anterior,
 * e o SGE recusa a análise com "Selecione a turma.". Reabrir a tela pelo menu garante o formulário limpo.
 */
async function novaManutencao(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#btnNova')).toBeVisible();
  await abrirManutencaoMatriculaTurma(page);
  await expect(page.locator('#NomeDosAlunos')).toBeEditable();
}

test.describe.configure({ mode: 'serial' });

test('MMT-002: recusa lista vazia e nomes repetidos e propõe cadastro de nome inexistente', async ({ page }) => {
  test.setTimeout(120000);
  await entrarComoUnidade(page);

  await selecionarTurmaManutencao(page, dados.turma);
  await page.locator('#btnAnalisar').click();
  await esperarErroManutencao(page, MSG.listaVazia);

  await page.locator('#NomeDosAlunos').fill('QAAUTO Nome Repetido\nqaauto nome répetido');
  await page.locator('#btnAnalisar').click();
  await esperarErroManutencao(page, MSG.nomesRepetidos);
  // Divergência da UI: a recusa por nomes repetidos deixa turma e lista bloqueadas, sem botão Cancelar.
  // Reabrir a tela pelo menu é a saída visível.
  await expect(page.locator('#NomeDosAlunos')).toHaveAttribute('readonly', 'readonly');
  await expect(page.locator('#btnCancelar')).toBeHidden();
  await abrirManutencaoMatriculaTurma(page);
  await expect(page.locator('#NomeDosAlunos')).toBeEditable();

  await analisarListaManutencao(page, dados.turma, [dados.nomeInexistente]);
  await aguardarAnaliseManutencao(page);
  const linha = linhaGrade(gradeLista(page), dados.nomeInexistente);
  await expect(linha).toHaveCount(1);
  await expect(linha).toContainText(MSG.nomeInexistenteSituacao);
  await expect(linha).toContainText(MSG.nomeInexistenteOperacao);
  await expect(linha.locator('input.executar')).toBeChecked();
  await expect(gradeSobressalentes(page).locator('tbody tr')).toHaveCount(0);
  await cancelarManutencao(page);
});

test('MMT-002/003: aloca aluno sem turma, reconhece o vínculo e desaloca como sobressalente', async ({ browser }) => {
  test.setTimeout(480000);
  // O cadastro de aluno exige a visão de Secretaria (Escola editável); a manutenção exige a visão de unidade.
  // Cada visão usa seu próprio contexto de navegador, com sessão independente.
  const ctxSecretaria = await browser.newContext();
  const ctxUnidade = await browser.newContext();
  const pageSecretaria = await ctxSecretaria.newPage();
  const page = await ctxUnidade.newPage();
  await loginSge(pageSecretaria, { baseUrl: process.env.BASE_URL, timeout: 60000 });
  const aluno = await criarAluno(pageSecretaria, buildAluno({ escola: dados.escola, serie: dados.serie, turno: dados.turno }));
  // O SGE grava o nome em maiúsculas, sem colchetes, hífens ou dígitos ("Isaac Silva [QA-AUTO]" vira "ISAAC SILVA QAAUTO"),
  // e a tela compara com o nome gravado. O nome aleatório da factory evita o aviso "Aluno possivelmente já cadastrado".
  const nomeGravado = aluno.nome.toUpperCase().replace(/[\[\]\-\d]/g, '').replace(/\s+/g, ' ').trim();
  let falhaDoTeste: unknown;
  try {
    await entrarComoUnidade(page);

    // 1) Aluno da unidade sem turma: a análise propõe alocar e o processamento cria o vínculo "Cursando".
    await analisarListaManutencao(page, dados.turma, [nomeGravado]);
    await aguardarAnaliseManutencao(page);
    await expect(gradeSobressalentes(page).locator('tbody tr'), `A turma "${dados.turma}" precisa estar sem alunos cursando.`).toHaveCount(0);
    let linha = linhaGrade(gradeLista(page), nomeGravado);
    await expect(linha).toHaveCount(1);
    await expect(linha).toContainText(dados.escola);
    await expect(linha).toContainText(MSG.alunoSemTurma);
    await expect(linha.locator('input.executar')).toBeChecked();
    await processarManutencao(page);

    // 2) Nova análise: o aluno já está na turma, sem caixa de seleção.
    await novaManutencao(page);
    await analisarListaManutencao(page, dados.turma, [nomeGravado]);
    await aguardarAnaliseManutencao(page);
    linha = linhaGrade(gradeLista(page), nomeGravado);
    await expect(linha).toHaveCount(1);
    await expect(linha).toContainText(MSG.alunoJaNaTurma);
    await expect(linha.locator('input.executar')).toHaveCount(0);
    await cancelarManutencao(page);

    // 3) Lista sem o aluno: ele vira sobressalente, marcado para desalocar. Só ele é processado.
    await analisarListaManutencao(page, dados.turma, [dados.nomeInexistente]);
    await aguardarAnaliseManutencao(page);
    const sobressalente = linhaGrade(gradeSobressalentes(page), nomeGravado);
    await expect(sobressalente).toHaveCount(1);
    await expect(sobressalente).toContainText(MSG.desalocar);
    await expect(sobressalente.locator('input.executar')).toBeChecked();
    await linhaGrade(gradeLista(page), dados.nomeInexistente).locator('input.executar').uncheck();
    await processarManutencao(page);

    // 4) Persistência: o aluno voltou a ser candidato a alocação e a turma ficou vazia.
    await novaManutencao(page);
    await analisarListaManutencao(page, dados.turma, [nomeGravado]);
    await aguardarAnaliseManutencao(page);
    await expect(linhaGrade(gradeLista(page), nomeGravado)).toContainText(MSG.alunoSemTurma);
    await expect(gradeSobressalentes(page).locator('tbody tr')).toHaveCount(0);
    await cancelarManutencao(page);
  } catch (erro) {
    falhaDoTeste = erro;
    throw erro;
  } finally {
    // A exclusão não pode mascarar a falha original do cenário.
    // A busca da grade às vezes devolve a lista sem filtro; repete a exclusão (identificada por nome gravado + matrícula).
    let erroExclusao: unknown;
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        await excluirAluno(pageSecretaria, { nome: nomeGravado, matricula: aluno.matricula });
        erroExclusao = undefined;
        break;
      } catch (erro) {
        erroExclusao = erro;
      }
    }
    try {
      if (erroExclusao) {
        if (!falhaDoTeste) throw erroExclusao;
        console.error(`Aluno "${nomeGravado}" (${aluno.matricula}) ficou na homologação: ${String(erroExclusao)}`);
      }
    } finally {
      await ctxUnidade.close();
      await ctxSecretaria.close();
    }
  }
});
