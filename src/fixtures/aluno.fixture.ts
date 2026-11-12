import { test as baseTest, expect as baseExpect } from '@playwright/test';
import { buildAluno, BuildAlunoOptions } from '../factories';
import { criarAluno, excluirAluno, AlunoCriado } from '../actions';
import { loginSge, waitForSgeLoaders } from '../helpers';

/**
 * Opções de customização passadas pelo teste para a criação do aluno na fixture.
 */
export interface AlunoFixtureOptions {
  /** Overrides ou opções personalizadas para o buildAluno() */
  alunoOptions?: Partial<BuildAlunoOptions>;
}

/**
 * Contexto disponibilizado ao teste contendo o aluno recém-criado.
 */
export interface AlunoFixtureContext {
  /** Objeto com os dados do estudante criado e confirmado pelo SGE via UI */
  aluno: AlunoCriado;
}

/**
 * Fixture estendida do Playwright que gerencia o ciclo de vida completo de um estudante:
 * 1. Login no SGE (se não autenticado);
 * 2. Geração determinística/realista de dados via buildAluno();
 * 3. Criação do aluno via criarAluno();
 * 4. Disponibilização de { aluno } para o teste;
 * 5. Teardown garantido pós-teste (independente de sucesso/falha) via excluirAluno().
 */
export const test = baseTest.extend<AlunoFixtureContext & AlunoFixtureOptions>({
  // Opções padrão da fixture de aluno (podem ser sobrescritas com test.use({ alunoOptions: ... }))
  alunoOptions: [{}, { option: true }],

  aluno: async ({ page, alunoOptions }, use) => {
    // 1. Garantir que a sessão está autenticada no SGE
    const currentUrl = page.url();
    if (
      !currentUrl.includes('homologa-sge.pontoid.com.br') ||
      currentUrl.includes('/Acesso/Entrar') ||
      currentUrl === 'about:blank'
    ) {
      await loginSge(page);
    }

    // 2. Preparar os dados do estudante respeitando o ambiente de homologação
    const dadosAluno = buildAluno({
      escola: /ESCOLA MUNICIPAL/i,
      serie: /1º Ano|2º Ano|3º Ano|Ano/i,
      turno: /Matutino|Vespertino|Integral/i,
      ...alunoOptions,
    });

    // 3. Criação do aluno via UI
    let alunoCriado: AlunoCriado | undefined;
    try {
      alunoCriado = await criarAluno(page, dadosAluno);
    } catch (error) {
      console.error(`[Fixture:aluno] Falha na criação do aluno "${dadosAluno.nome}":`, error);
      throw error;
    }

    // 4. Execução do teste e Cleanup garantido (try / finally)
    let testError: unknown;
    try {
      await use(alunoCriado);
    } catch (error) {
      testError = error;
      throw error;
    } finally {
      // O cleanup só é disparado se o aluno chegou a ser persistido/criado
      if (alunoCriado) {
        try {
          await excluirAluno(page, alunoCriado);
        } catch (cleanupError) {
          console.error(
            `[Fixture:aluno] ALERTA CRÍTICO: Falha na exclusão do estudante "${alunoCriado.nome}" (CPF: ${alunoCriado.cpf || 'N/A'}, Matrícula: ${alunoCriado.matricula || 'N/A'}). Dado residual pode permanecer no ambiente de homologação:`,
            cleanupError
          );
          // Se o teste passou mas o cleanup falhou, lançar o erro de cleanup para falhar o teste
          if (!testError) {
            throw cleanupError;
          }
        }
      }
    }
  },
});

export const expect = baseExpect;
