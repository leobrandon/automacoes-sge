import { expect, test } from '@playwright/test';
import { criarTipoOcorrenciaEscolar } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import {
  lerConfiguracaoCriacaoTipoOcorrenciaEscolar,
  validarUrlSandbox,
} from './tipo_ocorrencia_escolar_config';

test('cria e confere a parametrização do Tipo de Ocorrência Escolar QAAUTO', async ({ page }) => {
  const config = lerConfiguracaoCriacaoTipoOcorrenciaEscolar();
  test.setTimeout(60000 * config.quantidade);
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );

  await loginSge(page, { baseUrl });
  for (let sequencia = 1; sequencia <= config.quantidade; sequencia++) {
    console.log(`[QAAUTO] Criando Tipo de Ocorrência Escolar ${sequencia}/${config.quantidade}`);
    const criado = await criarTipoOcorrenciaEscolar(page, config.dados, sequencia);
    expect(new URL(criado.url).origin).toBe(new URL(baseUrl).origin);
    console.log(`[QAAUTO] Criação e parametrização conferidas na consulta: ${criado.descricao}`);
  }
});
