import { expect, test } from '@playwright/test';
import { loginSge } from '../../../../../src/helpers';
import { buildAtividadesEspecificas } from '../../../../../src/factories/tipo-registro-pedagogico.factory';
import * as actionsDisponiveis from '../../../../../src/actions';
import {
  linhaTipoRegistroPedagogico,
  navegarParaConsultaTipoRegistroPedagogico,
  pesquisarTipoRegistroPedagogico,
} from '../../../../../src/helpers/navigation/tipo-registro-pedagogico.navigation';
import {
  lerConfiguracaoCriacao,
  validarUrlSandbox,
} from '../tipo_registro_pedagogico_config';

test('cria Atividades Específicas com agrupador e item e confirma na grade', async ({ page }) => {
  const actions = actionsDisponiveis as unknown as Record<string, unknown>;
  const criarAtividades = actions.criarAtividadesEspecificas;
  expect(typeof criarAtividades, 'ação de criação de Atividades Específicas deve existir').toBe('function');
  if (typeof criarAtividades !== 'function') return;

  const configuracao = lerConfiguracaoCriacao('Atividades Específicas');
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );
  const esperada = buildAtividadesEspecificas(configuracao.dados, 1);

  test.setTimeout(120000);
  await loginSge(page, { baseUrl });
  const criada = await (criarAtividades as (pagina: typeof page, dados: typeof esperada) => Promise<{
    descricao: string;
    tipo: string;
    url: string;
    agrupador: string;
    item: typeof esperada.item;
  }>)(page, esperada);

  expect(criada.descricao).toBe(esperada.descricao);
  expect(criada.tipo).toBe(esperada.tipo);
  expect(criada.agrupador).toBe(esperada.agrupador);
  expect(criada.item).toEqual(esperada.item);
  await navegarParaConsultaTipoRegistroPedagogico(page);
  await pesquisarTipoRegistroPedagogico(page, esperada.descricao);

  const linha = linhaTipoRegistroPedagogico(page, esperada.descricao);
  await expect(linha).toHaveCount(1);
  const celulas = linha.locator('td:visible');
  await expect(celulas.nth(0)).toHaveText(esperada.descricao);
  await expect(celulas.nth(1)).toHaveText(esperada.tipo);
  await expect(celulas.nth(2)).toHaveText(esperada.tipoTurma);
  if (esperada.composicao) await expect(celulas.nth(3)).toHaveText(esperada.composicao);
  if (esperada.anosEscolares) {
    await expect(celulas.nth(4)).toContainText(esperada.anosEscolares.join(', '));
  }
  console.log(`[QAAUTO] CRIADA E CONFERIDA: ${criada.descricao} | Tipo: ${criada.tipo}`);
});
