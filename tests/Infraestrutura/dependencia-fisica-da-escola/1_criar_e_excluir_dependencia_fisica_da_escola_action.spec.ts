import { expect, test } from '@playwright/test';
import { criarDependenciaFisicaDaEscola, excluirDependenciaFisicaDaEscola } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaDependenciaFisicaDaEscola } from '../../../src/helpers/navigation/dependencia-fisica-da-escola.navigation';
import { lerConfiguracaoCriacaoDependenciaFisicaDaEscola } from './dependencia_fisica_da_escola_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
// Pré-condição: Dependências Físicas "QAAUTO Dependencia Fisica 1..N" (criar_dependencia_fisica_action).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Dependência Física da Escola', () => {
  test('cria, consulta e exclui somente os vínculos criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoDependenciaFisicaDaEscola();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: Array<{ dependenciaFisica: string; escola: string }> = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const criada = await criarDependenciaFisicaDaEscola(page, configuracao.dados, sequencia);
        criadas.push({ dependenciaFisica: criada.dependenciaFisica, escola: criada.escola });
        await expect(linhaDependenciaFisicaDaEscola(page, criada.dependenciaFisica, criada.escola)).toHaveCount(1);
        console.log(`✅ Dependência Física da Escola criada e consultada: ${criada.dependenciaFisica}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const item of criadas.reverse()) {
        try {
          const removida = await excluirDependenciaFisicaDaEscola(page, item.dependenciaFisica, item.escola);
          if (removida.dependenciaFisica !== item.dependenciaFisica) {
            throw new Error(`A ação retornou "${removida.dependenciaFisica}" ao excluir "${item.dependenciaFisica}".`);
          }
          console.log(`🧹 Vínculo criado nesta execução removido: ${item.dependenciaFisica}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais vínculos desta execução.');
      }
    }
  });
});
