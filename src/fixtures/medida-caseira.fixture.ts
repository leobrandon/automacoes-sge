import { test as baseTest, expect as baseExpect } from '@playwright/test';
import { buildMedidaCaseira, BuildMedidaCaseiraOptions } from '../factories';
import { criarMedidaCaseira, excluirMedidaCaseira, MedidaCaseiraCriada } from '../actions';
import { loginSge, waitForSgeLoaders } from '../helpers';

/**
 * Opções de customização passadas pelo teste para a criação da medida caseira na fixture.
 */
export interface MedidaCaseiraFixtureOptions {
  /** Overrides ou opções personalizadas para o buildMedidaCaseira() */
  medidaCaseiraOptions?: Partial<BuildMedidaCaseiraOptions>;
}

/**
 * Contexto disponibilizado ao teste contendo a medida caseira recém-criada.
 */
export interface MedidaCaseiraFixtureContext {
  /** Objeto com os dados da medida caseira criada e confirmada pelo SGE via UI */
  medidaCaseira: MedidaCaseiraCriada;
}

/**
 * Fixture estendida do Playwright que gerencia o ciclo de vida completo de uma Medida Caseira:
 * 1. Login no SGE (se não autenticado);
 * 2. Geração determinística de dados via buildMedidaCaseira();
 * 3. Criação da medida via criarMedidaCaseira();
 * 4. Disponibilização de { medidaCaseira } para o teste;
 * 5. Teardown garantido pós-teste (independente de sucesso/falha) via excluirMedidaCaseira().
 */
export const testMedidaCaseira = baseTest.extend<MedidaCaseiraFixtureContext & MedidaCaseiraFixtureOptions>({
  // Opções padrão (podem ser sobrescritas com test.use({ medidaCaseiraOptions: ... }))
  medidaCaseiraOptions: [{}, { option: true }],

  medidaCaseira: async ({ page, medidaCaseiraOptions }, use) => {
    // 1. Garantir que a sessão está autenticada no SGE
    const currentUrl = page.url();
    if (
      currentUrl.toLowerCase().includes('/acesso/entrar') ||
      currentUrl === 'about:blank'
    ) {
      await loginSge(page);
    }

    // 2. Preparar os dados da medida caseira
    const dadosMedida = buildMedidaCaseira({
      ...medidaCaseiraOptions,
    });

    // 3. Criação da medida via UI
    let medidaCriada: MedidaCaseiraCriada | undefined;
    try {
      medidaCriada = await criarMedidaCaseira(page, dadosMedida);
    } catch (error) {
      console.error(
        `[Fixture:medidaCaseira] Falha na criação da medida caseira "${dadosMedida.descricao}":`,
        error
      );
      throw error;
    }

    // 4. Execução do teste e Cleanup garantido (try / finally)
    let testError: unknown;
    try {
      await use(medidaCriada);
    } catch (error) {
      testError = error;
      throw error;
    } finally {
      // O cleanup só é disparado se a medida chegou a ser persistida
      if (medidaCriada) {
        try {
          await excluirMedidaCaseira(page, medidaCriada.descricao);
        } catch (cleanupError) {
          console.error(
            `[Fixture:medidaCaseira] ALERTA CRÍTICO: Falha na exclusão da medida caseira "${medidaCriada.descricao}". Dado residual pode permanecer no ambiente de homologação:`,
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

export const expectMedidaCaseira = baseExpect;
