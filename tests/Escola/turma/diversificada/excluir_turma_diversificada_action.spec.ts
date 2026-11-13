import { expect, test } from '@playwright/test';
import {
  criarTurmaDiversificada,
  excluirTurmaDiversificada,
  type TurmaDiversificadaIdentificador,
} from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import {
  linhaTurmaDiversificada,
  pesquisarTurmaDiversificada,
} from '../../../../src/helpers/navigation/turma-diversificada.navigation';
import { lerConfiguracaoCriacaoTurmaDiversificada } from './turma_diversificada_config';

// Modo: REGRESSÃO AUTOMATIZADA. Exclui somente a turma criada pela própria execução (nunca outra QAAUTO).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão individual de Turma Diversificada', () => {
  test('remove somente a Turma Diversificada criada pela própria execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTurmaDiversificada();
    test.setTimeout(300000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    let criada: TurmaDiversificadaIdentificador | undefined;
    let erroPrincipal: Error | undefined;
    const falhasLimpeza: Error[] = [];
    try {
      const resultado = await criarTurmaDiversificada(page, {
        ...configuracao.dados,
        descricao: `${configuracao.dados.descricao || 'QAAUTO Turma Diversificada'} Exclusao`,
      }, 1, {
        onPersistida: (alvo) => { criada = alvo; },
      });
      criada = resultado;
      const excluida = await excluirTurmaDiversificada(page, criada);
      expect(excluida.descricao).toBe(criada.descricao);
      expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
    } catch (erro) {
      erroPrincipal = erro instanceof Error ? erro : new Error(String(erro));
    } finally {
      if (criada) {
        try {
          await pesquisarTurmaDiversificada(page, criada.descricao);
          const quantidade = await linhaTurmaDiversificada(page, criada.descricao).count();
          if (quantidade > 1) {
            throw new Error(`Foram encontradas ${quantidade} linhas para "${criada.descricao}"; limpeza interrompida por ambiguidade.`);
          }
          if (quantidade === 1) await excluirTurmaDiversificada(page, criada);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
    }

    if (erroPrincipal && falhasLimpeza.length > 0) {
      throw new AggregateError([erroPrincipal, ...falhasLimpeza], 'A exclusão individual falhou e a limpeza de contingência também falhou.');
    }
    if (erroPrincipal) throw erroPrincipal;
    if (falhasLimpeza.length > 0) throw new AggregateError(falhasLimpeza, 'Falha na limpeza de contingência da Turma Diversificada.');
  });
});
