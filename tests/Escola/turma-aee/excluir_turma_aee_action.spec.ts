import { expect, test } from '@playwright/test';
import { criarTurmaAee, excluirTurmaAee, type TurmaAeeIdentificador } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaTurmaAee, pesquisarTurmaAee } from '../../../src/helpers/navigation/turma-aee.navigation';
import { lerConfiguracaoCriacaoTurmaAee } from './turma_aee_config';

const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão individual de Turma AEE', () => {
  test('remove somente a Turma AEE criada pela própria execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTurmaAee();
    test.setTimeout(300000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    let criada: TurmaAeeIdentificador | undefined;
    let erroPrincipal: Error | undefined;
    const falhasLimpeza: Error[] = [];
    try {
      const resultado = await criarTurmaAee(page, {
        ...configuracao.dados,
        descricao: `${configuracao.dados.descricao || 'QAAUTO Turma AEE'} Exclusao`,
      }, 1, {
        onPersistida: (alvo) => { criada = alvo; },
      });
      criada = resultado;
      const excluida = await excluirTurmaAee(page, criada);
      expect(excluida.descricao).toBe(criada.descricao);
      expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
    } catch (erro) {
      erroPrincipal = erro instanceof Error ? erro : new Error(String(erro));
    } finally {
      if (criada) {
        try {
          await pesquisarTurmaAee(page, criada.descricao);
          const linha = linhaTurmaAee(page, criada.descricao);
          const quantidade = await linha.count();
          if (quantidade > 1) throw new Error(`Foram encontradas ${quantidade} linhas para "${criada.descricao}"; limpeza interrompida por ambiguidade.`);
          if (quantidade === 1) await excluirTurmaAee(page, criada);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
    }

    if (erroPrincipal && falhasLimpeza.length > 0) {
      throw new AggregateError([erroPrincipal, ...falhasLimpeza], 'A exclusão individual falhou e a limpeza de contingência também falhou.');
    }
    if (erroPrincipal) throw erroPrincipal;
    if (falhasLimpeza.length > 0) throw new AggregateError(falhasLimpeza, 'Falha na limpeza de contingência da Turma AEE.');
  });
});
