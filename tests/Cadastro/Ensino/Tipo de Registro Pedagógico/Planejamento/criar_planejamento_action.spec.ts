import { expect, test } from '@playwright/test';
import { loginSge } from '../../../../../src/helpers';
import {
  buildPlanejamento,
  type BuildPlanejamentoOptions,
} from '../../../../../src/factories/tipo-registro-pedagogico.factory';
import * as actionsDisponiveis from '../../../../../src/actions';
import {
  linhaTipoRegistroPedagogico,
  navegarParaConsultaTipoRegistroPedagogico,
  pesquisarTipoRegistroPedagogico,
} from '../../../../../src/helpers/navigation/tipo-registro-pedagogico.navigation';
import { lerConfiguracaoCriacao, validarUrlSandbox } from '../tipo_registro_pedagogico_config';

test('cria Planejamento pela consulta do Tipo de Registro Pedagógico', async ({ page }) => {
  const actions = actionsDisponiveis as unknown as Record<string, unknown>;
  const criarPlanejamento = actions.criarPlanejamento;
  expect(typeof criarPlanejamento, 'ação de criação de Planejamento deve existir').toBe('function');
  if (typeof criarPlanejamento !== 'function') return;

  const configuracao = lerConfiguracaoCriacao('Planejamento');
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );
  const esperada = buildPlanejamento(configuracao.dados as BuildPlanejamentoOptions, 1);

  test.setTimeout(120000);
  await loginSge(page, { baseUrl });
  const criada = await (criarPlanejamento as (pagina: typeof page, dados: typeof esperada) => Promise<{
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
