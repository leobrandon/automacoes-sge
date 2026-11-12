import { expect, test } from '@playwright/test';
import { excluirTipoOcorrenciaEscolar, excluirTiposOcorrenciaEscolarQAAuto } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import {
  lerConfiguracaoExclusaoTipoOcorrenciaEscolar,
  validarEscopoExclusao,
  validarUrlSandbox,
} from './tipo_ocorrencia_escolar_config';

test('exclui os Tipos de Ocorrência Escolar QAAUTO conforme o modo do JSON', async ({ page }) => {
  const config = lerConfiguracaoExclusaoTipoOcorrenciaEscolar();
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );
  if (!config.excluirTodasQAAUTO) {
    validarEscopoExclusao(config, config.descricoes);
    test.setTimeout(60000 * config.quantidadeEsperada);
  }

  await loginSge(page, { baseUrl });
  if (config.excluirTodasQAAUTO) {
    await excluirTiposOcorrenciaEscolarQAAuto(page, total => test.setTimeout(60000 * (total + 1)));
  } else {
    for (const descricao of config.descricoes) {
      await excluirTipoOcorrenciaEscolar(page, descricao);
    }
  }

  expect(new URL(page.url()).origin).toBe(new URL(baseUrl).origin);
});
