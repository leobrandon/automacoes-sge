import {test} from '@playwright/test';
import {criarNotaFiscal} from '../../../../src/actions/criar-nota-fiscal.action';
import {excluirNotaFiscalSeExistir} from '../../../../src/actions/excluir-nota-fiscal.action';
import {type NotaFiscalMontada} from '../../../../src/factories/nota-fiscal.factory';
import {loginSge} from '../../../../src/helpers';
import {lerConfiguracaoCriacaoNotaFiscal} from './nota_fiscal_config';

test('Criar e excluir Notas Fiscais QAAUTO da própria execução', async ({page}) => {
  const {quantidade, opcoes} = lerConfiguracaoCriacaoNotaFiscal();
  test.setTimeout(Math.max(180000, quantidade * 120000));
  const criadas: NotaFiscalMontada[] = [];
  const erros: unknown[] = [];
  await loginSge(page, {timeout: 60000});
  try {
    for (let i = 1; i <= quantidade; i++) await criarNotaFiscal(page, opcoes, i, undefined, nota => criadas.push(nota));
  } catch (erro) {
    erros.push(erro);
  } finally {
    for (const nota of [...criadas].reverse()) {
      try {
        await excluirNotaFiscalSeExistir(page, nota);
      } catch (erro) {
        erros.push(new Error(`Limpeza falhou para ${nota.chaveAcesso}`, {cause: erro}));
      }
    }
  }
  if (erros.length) throw new AggregateError(erros, 'Falha no ciclo de Nota Fiscal; verifique as causas e a massa remanescente.');
});
