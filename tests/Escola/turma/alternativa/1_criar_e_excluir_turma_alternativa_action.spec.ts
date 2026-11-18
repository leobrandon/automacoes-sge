import { expect, test } from '@playwright/test';
import {
  criarTurmaAlternativa,
  excluirTurmaAlternativa,
  type TurmaAlternativaIdentificador,
} from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import {
  linhaTurma,
  pesquisarTurma,
} from '../../../../src/helpers/navigation/turma.navigation';
import { lerConfiguracaoCriacaoTurmaAlternativa } from './turma_alternativa_config';

// Modo: REGRESSÃO AUTOMATIZADA. Ciclo completo: cria a quantidade configurada e exclui só o que esta execução criou.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Turma Alternativa', () => {
  test('cria, consulta e exclui somente as Turmas Alternativas criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTurmaAlternativa();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 180000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const candidatas: TurmaAlternativaIdentificador[] = [];
    const falhasLimpeza: Error[] = [];
    let erroPrincipal: Error | undefined;
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const dados = {
          ...configuracao.dados,
          descricao: `${configuracao.dados.descricao || 'QAAUTO Turma Alternativa'} Ciclo`,
        };
        const turma = await criarTurmaAlternativa(page, dados, sequencia, {
          onPersistida: (candidata) => candidatas.push(candidata),
        });
        await expect(linhaTurma(page, turma.descricao)).toHaveCount(1);
      }
    } catch (erro) {
      erroPrincipal = erro instanceof Error ? erro : new Error(String(erro));
    } finally {
      for (const candidata of [...candidatas].reverse()) {
        try {
          await pesquisarTurma(page, candidata.descricao);
          const quantidade = await linhaTurma(page, candidata.descricao).count();
          if (quantidade === 0) continue;
          if (quantidade !== 1) {
            throw new Error(`A consulta retornou ${quantidade} linhas para "${candidata.descricao}"; limpeza interrompida por ambiguidade.`);
          }
          const removida = await excluirTurmaAlternativa(page, candidata);
          if (removida.descricao !== candidata.descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${candidata.descricao}".`);
          }
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
    }

    if (erroPrincipal && falhasLimpeza.length > 0) {
      throw new AggregateError([erroPrincipal, ...falhasLimpeza], 'O ciclo da Turma Alternativa falhou e uma ou mais limpezas também falharam.');
    }
    if (erroPrincipal) throw erroPrincipal;
    if (falhasLimpeza.length > 0) {
      throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Turmas Alternativas criadas nesta execução.');
    }
  });
});
