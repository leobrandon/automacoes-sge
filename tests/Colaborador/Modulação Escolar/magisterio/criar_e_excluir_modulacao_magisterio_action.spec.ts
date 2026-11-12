import { test } from '@playwright/test';
import { loginSge } from '../../../../src/helpers';
import { criarModulacaoMagisterio, excluirModulacaoMagisterio } from '../../../../src/actions';
import type { AtribuicaoMagisterio } from '../../../../src/factories/modulacao-magisterio.factory';
import { configModulacoes } from './modulacao_magisterio_config';
test('cria e exclui modulações desta execução', async ({ page }) => {
    const dados = configModulacoes();
    test.setTimeout(Math.max(180000, dados.length * 120000));
    await loginSge(page, { baseUrl: process.env.BASE_URL });
    const criadas: AtribuicaoMagisterio[] = [];
    let erro: unknown;
    try {
        for (const item of dados)
            criadas.push(await criarModulacaoMagisterio(page, item));
    }
    catch (e) {
        erro = e;
    }
    finally {
        const falhas: unknown[] = [];
        for (const item of criadas.reverse()) {
            try {
                await excluirModulacaoMagisterio(page, item);
            }
            catch (e) {
                falhas.push(e);
            }
        }
        if (erro)
            falhas.unshift(erro);
        if (falhas.length)
            throw new AggregateError(falhas, 'Falha na criação ou limpeza da modulação.');
    }
});
