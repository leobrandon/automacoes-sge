import { expect, test, type Browser, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  abrirRemanejamentoInterno,
  acionarProcessarRemanejamento,
  aprovarSolicitacaoRemanejada,
  confirmarSucessoRemanejamento,
  consultarAlunoNaUnidade,
  criarAluno,
  definirDestinoDoAluno,
  esperarAvisoAlunosSemDestino,
  responderAviso,
  selecionarEscolaDestino,
  selecionarSerieOrigem,
} from '../../../../src/actions';
import { buildAluno } from '../../../../src/factories';
import { loginSge } from '../../../../src/helpers';

interface Dados {
  escolaOrigem: string;
  serieAluno: string;
  turno: string;
  turma: string;
  serie: string;
  escolaDestino: string;
  anoEscolarOrigem: string;
  anoEscolarDestino: string;
}

const dados = JSON.parse(readFileSync(join(__dirname, 'dados_matricular_alunos_remanejados.json'), 'utf8')) as Dados;

/** Entra com o usuário informado (ou com a Secretaria, sem variáveis) numa sessão isolada e fecha o contexto ao fim. */
async function comoUsuario(
  browser: Browser,
  credenciais: { usuario: string; senha: string } | undefined,
  fluxo: (page: Page) => Promise<void>,
): Promise<void> {
  if (credenciais && (!credenciais.usuario || !credenciais.senha)) throw new Error('Credenciais de unidade ausentes no .env (SGE_USUARIO/SENHA_ORIGEM e _DESTINO).');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    await loginSge(page, { baseUrl: process.env.BASE_URL, ...credenciais, timeout: 60000 });
    await fluxo(page);
  } finally {
    await context.close();
  }
}

const origemEnv = () => ({ usuario: process.env.SGE_USUARIO_ORIGEM ?? '', senha: process.env.SGE_SENHA_ORIGEM ?? '' });
const destinoEnv = () => ({ usuario: process.env.SGE_USUARIO_DESTINO ?? '', senha: process.env.SGE_SENHA_DESTINO ?? '' });

test('MAR-002: aprovar a solicitação matricula o aluno na escola de destino', async ({ browser }) => {
  test.setTimeout(360000);
  let nome = '';
  let matricula: string | undefined;

  // O cadastro de aluno exige a visão de Secretaria (Escola editável).
  await comoUsuario(browser, undefined, async secretaria => {
    const turma = new RegExp(dados.turma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const aluno = await criarAluno(secretaria, buildAluno({ escola: dados.escolaOrigem, serie: dados.serieAluno, turno: dados.turno, turma }));
    // O SGE grava o nome em maiúsculas, sem colchetes, hífens ou dígitos.
    nome = aluno.nome.toUpperCase().replace(/[\[\]\-\d]/g, '').replace(/\s+/g, ' ').trim();
    matricula = aluno.matricula;
  });
  // Aprovar é irreversível e o SGE recusa excluir o aluno depois ("existem dados associados"):
  // a massa fica na homologação e é registrada no relatório.
  test.info().annotations.push({ type: 'massa-qaauto', description: `${nome} (${matricula ?? 'sem matrícula'}) ficará matriculado em ${dados.escolaDestino}.` });

  await comoUsuario(browser, origemEnv(), async origem => {
    await abrirRemanejamentoInterno(origem);
    await selecionarSerieOrigem(origem, dados.serie);
    await selecionarEscolaDestino(origem, dados.escolaDestino);
    await definirDestinoDoAluno(origem, nome, dados.escolaDestino);
    await acionarProcessarRemanejamento(origem);
    await esperarAvisoAlunosSemDestino(origem);
    await responderAviso(origem, 'Sim');
    await confirmarSucessoRemanejamento(origem);
  });

  await comoUsuario(browser, destinoEnv(), async destino => {
    // Antes de aprovar, o aluno ainda não pertence à escola de destino.
    expect(await consultarAlunoNaUnidade(destino, nome), `"${nome}" não deveria constar no destino antes da aprovação.`).toHaveLength(0);

    await aprovarSolicitacaoRemanejada(destino, {
      aluno: nome,
      escolaOrigem: dados.escolaOrigem,
      anoEscolarOrigem: dados.anoEscolarOrigem,
      anoEscolarDestino: dados.anoEscolarDestino,
    });

    // Persistência: o aluno passa a constar no destino, matriculado e ainda sem turma.
    const linhas = await consultarAlunoNaUnidade(destino, nome);
    expect(linhas, `"${nome}" não apareceu na escola de destino após a aprovação.`).toHaveLength(1);
    expect(linhas[0]).toContain('Matriculado');
    expect(linhas[0]).toContain('<Não vinculado>');
  });
});
