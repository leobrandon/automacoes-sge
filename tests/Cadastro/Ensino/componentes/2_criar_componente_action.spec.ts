import { expect, test } from '@playwright/test';
import { criarComponente } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaComponente } from '../../../../src/helpers/navigation/componente.navigation';
import { lerConfiguracaoCriacaoComponente } from './componentes_config';

const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ensino > Componentes', () => {
  test('cria e mantém os Componentes configurados para conferência no sandbox', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoComponente();
    test.setTimeout(Math.max(120000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criados: string[] = [];
    for (let indice = 1; indice <= configuracao.quantidade; indice++) {
      const componente = await criarComponente(page, configuracao.dados, indice);
      criados.push(componente.nome);
      expect(componente.nome).toMatch(/^QAAUTO\b/i);
      expect(new URL(componente.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaComponente(page, componente.nome)).toHaveCount(1);
      console.log(`✅ Componente ${indice}/${configuracao.quantidade}: ${componente.nome}`);
    }

    console.log(`✅ Total de Componentes mantidos para conferência: ${criados.length}`);
  });
});
