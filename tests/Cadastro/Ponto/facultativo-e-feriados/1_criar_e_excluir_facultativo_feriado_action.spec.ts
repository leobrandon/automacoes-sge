import { expect, test } from '@playwright/test';
import { criarFacultativoFeriado, excluirFacultativoFeriado } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaFacultativoFeriado } from '../../../../src/helpers/navigation/facultativo-feriado.navigation';
import { lerConfiguracaoCriacaoFacultativoFeriado } from './facultativo_feriado_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Facultativo e Feriados', () => {
  test('cria, consulta e exclui somente os registros criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoFacultativoFeriado();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const registro = await criarFacultativoFeriado(page, configuracao.dados, sequencia);
        criados.push(registro.descricao);
        await expect(linhaFacultativoFeriado(page, registro.descricao)).toHaveCount(1);
        console.log(`✅ Feriado/Facultativo criado e consultado: ${registro.descricao} | ${registro.data}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criados.reverse()) {
        try {
          const removido = await excluirFacultativoFeriado(page, descricao);
          if (removido.descricao !== descricao) {
            throw new Error(`A ação retornou "${removido.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Feriado/Facultativo criado nesta execução removido: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Feriados/Facultativos desta execução.');
      }
    }
  });
});
