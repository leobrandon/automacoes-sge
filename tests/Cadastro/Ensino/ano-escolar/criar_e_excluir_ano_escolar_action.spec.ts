import { expect, test } from '@playwright/test';
import { criarAnoEscolar, excluirAnoEscolar } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaAnoEscolar } from '../../../../src/helpers/navigation/ano-escolar.navigation';
import { lerConfiguracaoCriacaoAnoEscolar } from './ano_escolar_config';

function sandboxUrl(): string {
  const baseUrl = process.env.BASE_URL || 'https://sandbox.pontoid.com.br';
  return baseUrl;
}

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove somente os registros desta execução.
test.describe('Ciclo completo de Ano Escolar', () => {
  test('cria, consulta e exclui somente os Anos Escolares criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAnoEscolar();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: sandboxUrl() });

    const nomesCriados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const ano = await criarAnoEscolar(page, configuracao.dados, sequencia);
        nomesCriados.push(ano.nome);
        await expect(linhaAnoEscolar(page, ano.nome)).toHaveCount(1);
        console.log(`✅ Ano Escolar criado e consultado: ${ano.nome}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const nome of nomesCriados.reverse()) {
        try {
          const excluido = await excluirAnoEscolar(page, nome);
          if (excluido.nome !== nome) {
            throw new Error(`A ação retornou "${excluido.nome}" ao excluir "${nome}".`);
          }
          console.log(`🧹 Ano Escolar criado nesta execução removido: ${nome}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Anos Escolares desta execução.');
      }
    }
  });
});
