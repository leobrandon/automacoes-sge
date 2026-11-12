import { expect, type Page } from '@playwright/test';
import type { ConteudoAplicadoData } from '../../factories/tipo-registro-pedagogico.factory';
import { navegarParaAdicionarTipoRegistroPedagogico } from '../../helpers/navigation/tipo-registro-pedagogico.navigation';
import {
  definirAtivo,
  salvarTipoRegistroPedagogico,
  selecionarComposicao,
  selecionarOpcaoConfiguravel,
  selecionarTipoTurma,
  validarAnoLetivoSelecionado,
} from './common';
import type { TipoRegistroPedagogicoCriado } from './tipo-registro-pedagogico.types';

/** Cria Conteúdo Aplicado preenchendo pela interface somente os campos configurados. */
export async function criarConteudoAplicado(
  page: Page,
  dados: ConteudoAplicadoData,
): Promise<TipoRegistroPedagogicoCriado> {
  await navegarParaAdicionarTipoRegistroPedagogico(page, 'Conteúdo Aplicado');
  await validarAnoLetivoSelecionado(page, dados.ano);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao:visible').fill(dados.descricao);
  await selecionarTipoTurma(page, dados.tipoTurma);
  await selecionarComposicao(page, dados.composicao);
  await selecionarOpcaoConfiguravel(page, 'TipoDeAssinatura', dados.tipoAssinatura);
  await definirAtivo(page, dados.ativo);
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await salvarTipoRegistroPedagogico(page, dados.descricao);

  console.log('[QAAUTO] Salvamento confirmado: ' + dados.descricao + ' | Tipo: ' + dados.tipo);
  return { descricao: dados.descricao, tipo: dados.tipo, url: page.url() };
}
