import { expect, test } from '@playwright/test';
import { loginSge } from '../../../../../src/helpers';
import * as actionsDisponiveis from '../../../../../src/actions';
import {
  linhaTipoRegistroPedagogico,
  navegarParaConsultaTipoRegistroPedagogico,
  pesquisarTipoRegistroPedagogico,
} from '../../../../../src/helpers/navigation/tipo-registro-pedagogico.navigation';
import { lerConfiguracaoExclusao, validarUrlSandbox } from '../tipo_registro_pedagogico_config';

test('exclui somente o Planejamento QAAUTO configurado', async ({ page }) => {
  const actions = actionsDisponiveis as unknown as Record<string, unknown>;
  const excluir = actions.excluirTipoRegistroPedagogico;
  expect(typeof excluir, 'ação de exclusão de Tipo de Registro Pedagógico deve existir').toBe('function');
  if (typeof excluir !== 'function') return;

  const alvo = lerConfiguracaoExclusao('Planejamento');
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );
  test.setTimeout(120000);
  await loginSge(page, { baseUrl });

  const resultado = await (excluir as (pagina: typeof page, dadosAlvo: typeof alvo) => Promise<{
    descricao: string;
    tipo: string;
    url: string;
  }>)(page, alvo);
  expect(resultado.descricao).toBe(alvo.descricao);
  expect(resultado.tipo).toBe(alvo.tipo);
  await navegarParaConsultaTipoRegistroPedagogico(page);
  await pesquisarTipoRegistroPedagogico(page, alvo.descricao);
  await expect(linhaTipoRegistroPedagogico(page, alvo.descricao)).toHaveCount(0);
  console.log('[QAAUTO] EXCLUÍDA E CONFERIDA: ' + alvo.descricao + ' | Tipo: ' + alvo.tipo);
});
