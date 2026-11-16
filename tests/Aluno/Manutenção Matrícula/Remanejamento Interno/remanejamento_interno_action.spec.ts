import { expect, test, type Browser, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  abrirRemanejamentoInterno,
  acionarProcessarRemanejamento,
  confirmarSucessoRemanejamento,
  definirDestinoDoAluno,
  esperarAvisoAlunosSemDestino,
  exigirAlunoElegivel,
  linhaAlunoRemanejamento,
  rejeitarSolicitacaoRemanejada,
  responderAviso,
  selecionarEscolaDestino,
  selecionarSerieOrigem,
  type RemanejamentoInternoDados,
} from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';

const dados = JSON.parse(readFileSync(join(__dirname, 'dados_remanejamento_interno.json'), 'utf8')) as RemanejamentoInternoDados;

type Perfil = 'ORIGEM' | 'DESTINO';

/**
 * Cada escola tem o próprio usuário (SGE_USUARIO_<perfil> / SGE_SENHA_<perfil> no .env) e a própria sessão isolada.
 * O contexto é fechado ao fim, inclusive quando o teste falha.
 */
async function comoPerfil(browser: Browser, perfil: Perfil, fluxo: (page: Page) => Promise<void>): Promise<void> {
  const usuario = process.env[`SGE_USUARIO_${perfil}`];
  const senha = process.env[`SGE_SENHA_${perfil}`];
  if (!usuario || !senha) throw new Error(`Defina SGE_USUARIO_${perfil} e SGE_SENHA_${perfil} no .env.`);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    await loginSge(page, { baseUrl: process.env.BASE_URL, usuario, senha, timeout: 60000 });
    await fluxo(page);
  } finally {
    await context.close();
  }
}

test.describe.configure({ mode: 'serial' });

test('RMI-003: alerta alunos sem destino e, ao recusar, não grava solicitação', async ({ browser }) => {
  test.setTimeout(120000);
  await comoPerfil(browser, 'ORIGEM', async origem => {
    await abrirRemanejamentoInterno(origem);
    await selecionarSerieOrigem(origem, dados.serie);
    await selecionarEscolaDestino(origem, dados.escolaDestino);
    await exigirAlunoElegivel(origem, dados.aluno);

    await acionarProcessarRemanejamento(origem);
    await esperarAvisoAlunosSemDestino(origem);
    await responderAviso(origem, 'Não');

    await expect(linhaAlunoRemanejamento(origem, dados.aluno)).toHaveCount(1);
  });
});

test('RMI-005: remaneja na origem, rejeita no destino e o aluno volta elegível', async ({ browser }) => {
  test.setTimeout(240000);
  await comoPerfil(browser, 'ORIGEM', async origem => {
    await abrirRemanejamentoInterno(origem);
    await selecionarSerieOrigem(origem, dados.serie);
    await selecionarEscolaDestino(origem, dados.escolaDestino);
    await definirDestinoDoAluno(origem, dados.aluno, dados.escolaDestino);
    await acionarProcessarRemanejamento(origem);
    // Os demais alunos da grade ficam sem destino: o SGE pede confirmação para ignorá-los.
    await esperarAvisoAlunosSemDestino(origem);
    await responderAviso(origem, 'Sim');
    await confirmarSucessoRemanejamento(origem);

    // Persistência: com solicitação Solicitada, o aluno deixa de ser listado (RMI-002).
    await abrirRemanejamentoInterno(origem);
    await selecionarSerieOrigem(origem, dados.serie);
    await expect(linhaAlunoRemanejamento(origem, dados.aluno)).toHaveCount(0);

    await comoPerfil(browser, 'DESTINO', destino =>
      rejeitarSolicitacaoRemanejada(destino, {
        aluno: dados.aluno,
        motivo: dados.motivoRejeicao,
        escolaOrigem: dados.escolaOrigem,
        anoEscolarOrigem: dados.anoEscolarOrigem,
        anoEscolarDestino: dados.anoEscolarDestino,
      }),
    );

    // Rejeitada a solicitação, o aluno volta a ser elegível na origem.
    await abrirRemanejamentoInterno(origem);
    await selecionarSerieOrigem(origem, dados.serie);
    await exigirAlunoElegivel(origem, dados.aluno);
  });
});
