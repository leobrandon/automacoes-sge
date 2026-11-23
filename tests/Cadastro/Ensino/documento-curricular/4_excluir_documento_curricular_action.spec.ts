import { expect, test } from '@playwright/test';
import { criarDocumentoCurricular, excluirDocumentoCurricular, excluirDocumentosCurricularesQAAuto } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoCriacaoDocumentoCurricular, lerConfiguracaoExclusaoDocumentoCurricular } from './documento_curricular_config';

function sandboxUrl(): string {
  const baseUrl = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';
  return baseUrl;
}

test('Excluir Documento Curricular criado nesta execução', async ({ page }) => {
  const config = lerConfiguracaoCriacaoDocumentoCurricular();
  const exclusao = lerConfiguracaoExclusaoDocumentoCurricular();
  await loginSge(page, { baseUrl: sandboxUrl() });
  if (exclusao.excluirTodasQAAUTO) {
    const resultado = await excluirDocumentosCurricularesQAAuto(page, exclusao.termoGeral);
    expect(resultado.totalEncontrados, 'A busca QAAUTO deve localizar registros antes de afirmar que a exclusão foi executada.').toBeGreaterThan(0);
    expect(resultado.falhas, 'Todos os registros encontrados com prefixo QAAUTO devem ser excluídos.').toEqual([]);
    expect(resultado.totalExcluidos).toBe(resultado.totalEncontrados);
    expect(resultado.excluidos.every(item => /^QAAUTO\b/i.test(item))).toBe(true);
    return;
  }

  const alvo = exclusao.descricao || (await criarDocumentoCurricular(page, config.dados, 1)).descricao;
  const excluido = await excluirDocumentoCurricular(page, alvo);
  expect(excluido.descricao).toBe(alvo);
});
