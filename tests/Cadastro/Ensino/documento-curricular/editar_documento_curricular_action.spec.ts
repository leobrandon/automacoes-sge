import { expect, test } from '@playwright/test';
import { editarDocumentoCurricular } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoCriacaoDocumentoCurricular } from './documento_curricular_config';

function sandboxUrl(): string {
  const baseUrl = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';
  return baseUrl;
}

test('Editar Documento Curricular, estruturas e conteúdos', async ({ page }) => {
  const config = lerConfiguracaoCriacaoDocumentoCurricular();
  await loginSge(page, { baseUrl: sandboxUrl() });
  const resultado = await editarDocumentoCurricular(page, config.dados, 1);
  expect(resultado.documento.descricao).toMatch(/^QAAUTO\b/i);
  expect(resultado.estruturasIncluidas).toHaveLength(config.dados.estruturas?.length ?? 2);
  const quantidadeEsperada = (config.dados.estruturas ?? []).reduce((total, estrutura) => total + (estrutura.itens?.length ?? 0), 0);
  expect(resultado.itensIncluidos).toHaveLength(quantidadeEsperada || resultado.estruturasIncluidas.length);
  expect(resultado.anoEscolarUsado).toBeTruthy();
  expect(resultado.componenteUsado).toBeTruthy();
});
