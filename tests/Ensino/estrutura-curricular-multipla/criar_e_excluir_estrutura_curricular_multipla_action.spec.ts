import { expect, test } from '@playwright/test';
import {
  criarEstruturaCurricularMultipla,
  excluirEstruturaCurricularMultipla,
} from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configEstruturaCurricular } from './estrutura_curricular_multipla_config';

test('cria estruturas com anos e grades e exclui os registros desta execução', async ({ page }) => {
  const config = configEstruturaCurricular();
  test.setTimeout(Math.max(180000, config.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const criadas: string[] = [];
  try {
    for (let i = 1; i <= config.quantidade; i++)
      await criarEstruturaCurricularMultipla(page, config.dados, i, (nome) => criadas.push(nome));
  } finally {
    const falhas: Error[] = [];
    for (const nome of criadas.reverse()) {
      try {
        expect(await excluirEstruturaCurricularMultipla(page, nome)).toBe(nome);
      } catch (erro) {
        falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
      }
    }
    if (falhas.length)
      throw new AggregateError(falhas, 'Falha ao excluir estruturas desta execução.');
  }
});
