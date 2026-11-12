import { expect, type Page } from '@playwright/test';
import type { ParecerDescritivoData } from '../../factories/tipo-registro-pedagogico.factory';
import { navegarParaAdicionarTipoRegistroPedagogico } from '../../helpers/navigation/tipo-registro-pedagogico.navigation';
import {
  definirAtivo,
  salvarTipoRegistroPedagogico,
  selecionarAnosEscolares,
  selecionarComposicao,
  selecionarOpcaoConfiguravel,
  selecionarTipoTurma,
  validarAnoLetivoSelecionado,
} from './common';
import type { TipoRegistroPedagogicoCriado } from './tipo-registro-pedagogico.types';

/** Cria Parecer Descritivo (Ficha de Acompanhamento) pela interface do SGE. */
export async function criarParecerDescritivo(
  page: Page,
  dados: ParecerDescritivoData,
): Promise<TipoRegistroPedagogicoCriado> {
  await navegarParaAdicionarTipoRegistroPedagogico(page, 'Parecer Descritivo (Ficha de Acompanhamento)');
  await validarAnoLetivoSelecionado(page, dados.ano);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao:visible').fill(dados.descricao);
  await selecionarTipoTurma(page, dados.tipoTurma);
  await selecionarOpcaoConfiguravel(page, 'Finalidade', dados.finalidade);
  await selecionarComposicao(page, dados.composicao);
  await selecionarAnosEscolares(page, dados.anosEscolares);
  await selecionarOpcaoConfiguravel(page, 'Periodicidade', dados.periodicidade);
  await selecionarOpcaoConfiguravel(page, 'TipoDeAssinatura', dados.tipoAssinatura);
  await definirAtivo(page, dados.ativo);
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await salvarTipoRegistroPedagogico(page, dados.descricao);

  console.log('[QAAUTO] Salvamento confirmado: ' + dados.descricao + ' | Tipo: ' + dados.tipo);
  return { descricao: dados.descricao, tipo: dados.tipo, url: page.url() };
}
