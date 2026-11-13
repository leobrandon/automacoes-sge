import { expect, test } from '@playwright/test';
import { criarTurmaAee, excluirTurmaAee, type TurmaAeeIdentificador } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaTurmaAee, pesquisarTurmaAee } from '../../../../src/helpers/navigation/turma-aee.navigation';
import { lerConfiguracaoCriacaoTurmaAee } from './turma_aee_config';

const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Turma AEE', () => {
  test('cria, consulta e exclui somente as Turmas AEE criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTurmaAee();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 180000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const candidatas: TurmaAeeIdentificador[] = [];
    const falhasLimpeza: Error[] = [];
    let erroPrincipal: Error | undefined;
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const dados = {
          ...configuracao.dados,
          descricao: `${configuracao.dados.descricao || 'QAAUTO Turma AEE'} Ciclo`,
        };
        const turma = await criarTurmaAee(page, dados, sequencia, {
          onPersistida: (candidata) => candidatas.push(candidata),
        });
        await expect(linhaTurmaAee(page, turma.descricao)).toHaveCount(1);
      }
    } catch (erro) {
      erroPrincipal = erro instanceof Error ? erro : new Error(String(erro));
    } finally {
      for (const candidata of [...candidatas].reverse()) {
        await limparCandidata(candidata);
      }
    }

    if (erroPrincipal && falhasLimpeza.length > 0) {
      throw new AggregateError([erroPrincipal, ...falhasLimpeza], 'O ciclo da Turma AEE falhou e uma ou mais limpezas também falharam.');
    }
    if (erroPrincipal) throw erroPrincipal;
    if (falhasLimpeza.length > 0) {
      throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Turmas AEE criadas nesta execução.');
    }

    async function limparCandidata(candidata: TurmaAeeIdentificador): Promise<void> {
      try {
        await pesquisarTurmaAee(page, candidata.descricao);
        const linha = linhaTurmaAee(page, candidata.descricao);
        const quantidade = await linha.count();
        if (quantidade === 0) return;
        if (quantidade !== 1) {
          throw new Error(`A consulta retornou ${quantidade} linhas para "${candidata.descricao}"; limpeza interrompida por ambiguidade.`);
        }
        const removida = await excluirTurmaAee(page, candidata);
        if (removida.descricao !== candidata.descricao) {
          throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${candidata.descricao}".`);
        }
      } catch (erro) {
        falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
      }
    }
  });
});
