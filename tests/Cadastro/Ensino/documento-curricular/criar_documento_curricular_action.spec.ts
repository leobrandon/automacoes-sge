import { expect, test } from '@playwright/test';
import { criarDocumentoCurricular } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoCriacaoDocumentoCurricular } from './documento_curricular_config';

function sandboxUrl(): string {
  const baseUrl = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';
  return baseUrl;
}

test('Criar Documento Curricular', async ({ page }) => {
  const config = lerConfiguracaoCriacaoDocumentoCurricular();
  await loginSge(page, { baseUrl: sandboxUrl() });
  for (let sequencia = 1; sequencia <= config.quantidade; sequencia++) {
    const criado = await criarDocumentoCurricular(page, config.dados, sequencia);
    expect(criado.descricao).toMatch(/^QAAUTO\b/i);
    expect(criado.composicaoEnsino).toBe(config.dados.composicaoEnsino || 'ENSINO MÉDIO INOVADOR');
    expect(criado.anoEscolar).toBe(config.dados.anoEscolar || '2° SÉRIE');
    expect(criado.componentes.length).toBeGreaterThan(0);
    expect(criado.estruturas).toHaveLength(config.dados.estruturas?.length ?? 2);
  }
});
