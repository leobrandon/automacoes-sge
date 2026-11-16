import { expect, test } from '@playwright/test';
import {
  criarVigenciaConselhoEscolar,
  excluirVigenciaConselhoEscolar,
  validarRecusasConselhoEscolar,
} from '../../../../src/actions';
import { buildConselhoEscolar } from '../../../../src/factories/conselho-escolar.factory';
import { loginSge } from '../../../../src/helpers';
import { entrarNaUnidadeEscolar, linhaVigencia } from '../../../../src/helpers/navigation/conselho-escolar.navigation';
import { lerConfiguracaoCriacaoConselhoEscolar } from './conselho_escolar_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas as vigências criadas nesta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo do Conselho Escolar', () => {
  test('cria vigências com membros e anexos, confere as recusas e exclui o que criou', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoConselhoEscolar();
    test.setTimeout(Math.max(300000, configuracao.vigencias.length * 180000));
    await loginSge(page, { baseUrl: BASE_URL });
    await entrarNaUnidadeEscolar(page, configuracao.escola);

    const vigencias = buildConselhoEscolar(configuracao.vigencias);
    const criadas: Array<{ dataInicio: string; dataFim: string }> = [];
    const falhas: Error[] = [];
    try {
      for (const vigencia of vigencias) {
        const criada = await criarVigenciaConselhoEscolar(page, vigencia, (datas) => criadas.push(datas));
        await expect(linhaVigencia(page, vigencia.dataInicio, vigencia.dataFim)).toHaveCount(1);
        console.log(`✅ Vigência criada: ${criada.dataInicio} a ${criada.dataFim} (membros: ${criada.membros.join('; ')})`);
      }
      await validarRecusasConselhoEscolar(page, vigencias[0]);
    } catch (erro) {
      falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
    } finally {
      const falhasLimpeza = falhas;
      for (const alvo of criadas.reverse()) {
        try {
          const removida = await excluirVigenciaConselhoEscolar(page, alvo);
          if (removida.dataInicio !== alvo.dataInicio || removida.dataFim !== alvo.dataFim) {
            throw new Error(`A ação retornou ${removida.dataInicio} a ${removida.dataFim} ao excluir ${alvo.dataInicio} a ${alvo.dataFim}.`);
          }
          console.log(`🧹 Vigência criada nesta execução removida: ${alvo.dataInicio} a ${alvo.dataFim}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha no ciclo do Conselho Escolar (criação, recusas ou limpeza das vigências desta execução).');
      }
    }
  });
});
