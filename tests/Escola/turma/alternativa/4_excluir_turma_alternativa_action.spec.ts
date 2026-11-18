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

// Modo: REGRESSÃO AUTOMATIZADA. Exclui somente a turma criada pela própria execução (nunca outra QAAUTO).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão individual de Turma Alternativa', () => {
  test('remove somente a Turma Alternativa criada pela própria execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTurmaAlternativa();
    test.setTimeout(300000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    let criada: TurmaAlternativaIdentificador | undefined;
    let erroPrincipal: Error | undefined;
    const falhasLimpeza: Error[] = [];
    try {
      const resultado = await criarTurmaAlternativa(page, {
        ...configuracao.dados,
        descricao: `${configuracao.dados.descricao || 'QAAUTO Turma Alternativa'} Exclusao`,
      }, 1, {
        onPersistida: (alvo) => { criada = alvo; },
      });
      criada = resultado;
      const excluida = await excluirTurmaAlternativa(page, criada);
      expect(excluida.descricao).toBe(criada.descricao);
      expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
    } catch (erro) {
      erroPrincipal = erro instanceof Error ? erro : new Error(String(erro));
    } finally {
      if (criada) {
        try {
          await pesquisarTurma(page, criada.descricao);
          const quantidade = await linhaTurma(page, criada.descricao).count();
          if (quantidade > 1) {
            throw new Error(`Foram encontradas ${quantidade} linhas para "${criada.descricao}"; limpeza interrompida por ambiguidade.`);
          }
          if (quantidade === 1) await excluirTurmaAlternativa(page, criada);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
    }

    if (erroPrincipal && falhasLimpeza.length > 0) {
      throw new AggregateError([erroPrincipal, ...falhasLimpeza], 'A exclusão individual falhou e a limpeza de contingência também falhou.');
    }
    if (erroPrincipal) throw erroPrincipal;
    if (falhasLimpeza.length > 0) throw new AggregateError(falhasLimpeza, 'Falha na limpeza de contingência da Turma Alternativa.');
  });
});
