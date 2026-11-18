import { test } from '@playwright/test';
import { loginSge } from '../../../../src/helpers';
import { criarModulacaoMagisterio } from '../../../../src/actions';
import { configModulacoes } from './modulacao_magisterio_config';
test('cria e mantém modulação de magistério', async ({ page }) => {
    const dados = configModulacoes();
    test.setTimeout(Math.max(180000, dados.length * 120000));
    await loginSge(page, { baseUrl: process.env.BASE_URL });
    for (const item of dados)
        await criarModulacaoMagisterio(page, item);
});
