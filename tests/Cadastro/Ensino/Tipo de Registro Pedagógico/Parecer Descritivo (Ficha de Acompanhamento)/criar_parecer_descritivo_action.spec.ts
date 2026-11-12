import { expect, test } from '@playwright/test';
import { loginSge } from '../../../../../src/helpers';
import {
  buildParecerDescritivo,
  type BuildParecerDescritivoOptions,
} from '../../../../../src/factories/tipo-registro-pedagogico.factory';
import * as actionsDisponiveis from '../../../../../src/actions';
import {
  linhaTipoRegistroPedagogico,
  navegarParaConsultaTipoRegistroPedagogico,
  pesquisarTipoRegistroPedagogico,
} from '../../../../../src/helpers/navigation/tipo-registro-pedagogico.navigation';
import { lerConfiguracaoCriacao, validarUrlSandbox } from '../tipo_registro_pedagogico_config';

test('cria Parecer Descritivo pela consulta do Tipo de Registro Pedagógico', async ({ page }) => {
  const actions = actionsDisponiveis as unknown as Record<string, unknown>;
  const criarParecer = actions.criarParecerDescritivo;
  expect(typeof criarParecer, 'ação de criação de Parecer Descritivo deve existir').toBe('function');
  if (typeof criarParecer !== 'function') return;

  const configuracao = lerConfiguracaoCriacao('Parecer Descritivo (Ficha de Acompanhamento)');
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );
  const esperada = buildParecerDescritivo(configuracao.dados as BuildParecerDescritivoOptions, 1);

  test.setTimeout(120000);
  await loginSge(page, { baseUrl });
  const criada = await (criarParecer as (pagina: typeof page, dados: typeof esperada) => Promise<{
    descricao: string;
    tipo: string;
    url: string;
  }>)(page, esperada);

  expect(criada.descricao).toBe(esperada.descricao);
  expect(criada.tipo).toBe(esperada.tipo);
  await navegarParaConsultaTipoRegistroPedagogico(page);
  await pesquisarTipoRegistroPedagogico(page, esperada.descricao);
  const linha = linhaTipoRegistroPedagogico(page, esperada.descricao);
  await expect(linha).toHaveCount(1);
  const celulas = linha.locator('td:visible');
  await expect(celulas.nth(0)).toHaveText(esperada.descricao);
  await expect(celulas.nth(1)).toHaveText(esperada.tipo);
  await expect(celulas.nth(2)).toHaveText(esperada.tipoTurma);
  if (esperada.composicao) await expect(celulas.nth(3)).toHaveText(esperada.composicao);
  if (esperada.anosEscolares?.length) {
    await expect(celulas.nth(4)).toContainText(esperada.anosEscolares.join(', '));
  }
  await expect(page.locator('#header')).toContainText(new RegExp('ANO LETIVO:\\s*' + esperada.ano, 'i'));
  console.log('[QAAUTO] CRIADA E CONFERIDA: ' + criada.descricao + ' | Tipo: ' + criada.tipo);
});
