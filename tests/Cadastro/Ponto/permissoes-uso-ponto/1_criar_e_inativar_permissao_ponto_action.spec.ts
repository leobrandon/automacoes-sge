import { expect, test } from '@playwright/test';
import { criarPermissaoPonto, inativarPermissaoPonto } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaPermissaoPonto } from '../../../../src/helpers/navigation/permissao-ponto.navigation';
import { lerConfiguracaoCriacaoPermissaoPonto } from './permissao_ponto_config';

// Modo: REGRESSÃO AUTOMATIZADA. Sem exclusão no SGE, o ciclo termina inativando só o que a execução criou.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Permissões Para Uso do Ponto', () => {
  test('cria, consulta e inativa somente as Permissões criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoPermissaoPonto();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const permissao = await criarPermissaoPonto(page, configuracao.dados, sequencia);
        criadas.push(permissao.descricao);
        await expect(linhaPermissaoPonto(page, permissao.descricao)).toHaveCount(1);
        console.log(`✅ Permissão criada e consultada: ${permissao.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const inativada = await inativarPermissaoPonto(page, descricao);
          if (inativada.descricao !== descricao) {
            throw new Error(`A ação retornou "${inativada.descricao}" ao inativar "${descricao}".`);
          }
          console.log(`🧹 Permissão criada nesta execução inativada: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao inativar uma ou mais Permissões desta execução.');
      }
    }
  });
});
