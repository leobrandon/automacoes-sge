import { expect, test } from '@playwright/test';
import { criarComponente, excluirComponente } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaComponente } from '../../../../src/helpers/navigation/componente.navigation';
import { lerConfiguracaoCriacaoComponente } from './componentes_config';

const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Componentes', () => {
  test('cria, consulta e exclui somente os Componentes criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoComponente();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criados: string[] = [];
    try {
      for (let indice = 1; indice <= configuracao.quantidade; indice++) {
        const componente = await criarComponente(page, configuracao.dados, indice);
        criados.push(componente.nome);
        await expect(linhaComponente(page, componente.nome)).toHaveCount(1);
        console.log(`✅ Componente criado e consultado: ${componente.nome}`);
      }
    } finally {
      const falhas: Error[] = [];
      for (const nome of criados.reverse()) {
        try {
          const excluido = await excluirComponente(page, nome);
          if (excluido.nome !== nome) throw new Error(`A ação retornou "${excluido.nome}" ao excluir "${nome}".`);
          console.log(`🧹 Componente criado nesta execução removido: ${nome}`);
        } catch (erro) {
          falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhas.length > 0) throw new AggregateError(falhas, 'Falha ao remover um ou mais Componentes desta execução.');
    }
  });
});
