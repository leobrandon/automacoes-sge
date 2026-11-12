import { test } from '@playwright/test';
import { loginSge } from '../../../../src/helpers';
import { excluirModulacaoMagisterio } from '../../../../src/actions';
import { configExclusaoModulacao } from './modulacao_magisterio_config';
test('exclui a modulação exata criada pela execução', async ({ page }) => {
    test.setTimeout(180000);
    const alvo = configExclusaoModulacao();
    await loginSge(page, { baseUrl: process.env.BASE_URL });
    await excluirModulacaoMagisterio(page, alvo);
});
