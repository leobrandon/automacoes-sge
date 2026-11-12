import { expect, type Page } from '@playwright/test';
import {
  buildMotivoConcessao,
  type BuildMotivoConcessaoOptions,
  type MotivoConcessaoData,
} from '../factories/motivo-concessao.factory';
import {
  abrirEdicaoMotivoConcessao,
  abrirFormularioAdicionarMotivoConcessao,
  confirmarSucessoMotivoConcessao,
  definirToggleMotivoConcessao,
  formularioMotivoConcessao,
  linhaMotivoConcessao,
  navegarParaConsultaMotivoConcessao,
  pesquisarMotivoConcessao,
  proximaSequenciaLivreMotivoConcessao,
  salvarMotivoConcessao,
  situacaoMotivoConcessao,
} from '../helpers/navigation/motivo-concessao.navigation';

export interface MotivoConcessaoCriado extends MotivoConcessaoData {
  url: string;
}

/** Cria um Motivo de Concessão pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarMotivoConcessao(
  page: Page,
  options: BuildMotivoConcessaoOptions = {},
  sequencia = 1,
): Promise<MotivoConcessaoCriado> {
  // Motivos não podem ser excluídos e o SGE recusa título repetido: usa sempre um título ainda inexistente.
  const sequenciaLivre = await proximaSequenciaLivreMotivoConcessao(page, options, sequencia);
  const dados = buildMotivoConcessao(options, sequenciaLivre);
  await abrirFormularioAdicionarMotivoConcessao(page);

  const formulario = formularioMotivoConcessao(page);
  await formulario.locator('#Titulo').fill(dados.titulo);
  await formulario.locator('#Descricao').fill(dados.descricao);
  await definirToggleMotivoConcessao(page, 'EntregaDefinitiva', dados.entregaDefinitiva);
  await salvarMotivoConcessao(page);
  await confirmarSucessoMotivoConcessao(page, dados.titulo);

  await pesquisarMotivoConcessao(page, dados.titulo);
  const linha = linhaMotivoConcessao(page, dados.titulo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha.getByRole('cell', { name: dados.descricao, exact: true })).toHaveCount(1);
  await expect(situacaoMotivoConcessao(linha, 'Ativo')).toHaveCount(1);

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoMotivoConcessao(page, dados.titulo);
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await expect(formulario.locator('#EntregaDefinitiva')).toBeChecked({ checked: dados.entregaDefinitiva });
  await expect(formulario.locator('#Ativo')).toBeChecked();
  await navegarParaConsultaMotivoConcessao(page);

  console.log(`[QAAUTO] Motivo de Concessão criado e conferido: ${dados.titulo}`);
  return { ...dados, url: page.url() };
}
