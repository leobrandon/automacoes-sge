import { expect, type Page } from '@playwright/test';
import { buildVeiculo, formatarPlaca, type BuildVeiculoOptions, type VeiculoData } from '../factories/veiculo.factory';
import { select2 } from '../helpers/select2.helper';
import {
  abrirEdicaoVeiculo,
  linhaVeiculo,
  navegarParaAdicionarVeiculo,
  pesquisarVeiculo,
  proximaSequenciaLivreVeiculo,
  tituloConsultaVeiculo,
  voltarParaConsultaVeiculo,
} from '../helpers/navigation/veiculo.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface VeiculoCriado extends VeiculoData {
  url: string;
}

/** Cria pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarVeiculo(
  page: Page,
  options: BuildVeiculoOptions = {},
  sequencia = 1,
): Promise<VeiculoCriado> {
  // Modelo repetido tornaria a conferência ambígua e a placa repetida é recusada; usa a primeira sequência livre.
  const sequenciaLivre = await proximaSequenciaLivreVeiculo(page, options, sequencia);
  const dados = buildVeiculo(options, sequenciaLivre);
  await navegarParaAdicionarVeiculo(page);

  const formulario = page.locator('#main');
  await select2.select(page, '#TipoVeiculo', dados.tipo, { exactMatch: true });
  await expect(formulario.locator('#TipoVeiculo')).not.toHaveValue('');
  await formulario.locator('#Modelo').fill(dados.modelo);
  await select2.select(page, '#ListaTipoCombustivel', dados.tipoCombustivel, { exactMatch: true, isMultiple: true });
  // A máscara da placa descarta o valor injetado por fill(); digita caractere a caractere.
  await formulario.locator('#Placa').click();
  await formulario.locator('#Placa').pressSequentially(dados.placa);
  await expect(formulario.locator('#Placa')).toHaveValue(formatarPlaca(dados.placa));
  await formulario.locator('#Renavam').fill(dados.renavam);
  await formulario.locator('#Ano').fill(String(dados.ano));
  await formulario.locator('#MesVencimentoIPVA').selectOption(dados.mesVencimentoIpva);
  await formulario.locator('#Capacidade').fill(String(dados.capacidade));
  await formulario.locator('#VinculoVeiculo').selectOption(dados.vinculo);
  await formulario.locator('#CategoriaCNH').selectOption(dados.categoriaCnh);
  await formulario.locator('#KmInicial').fill(String(dados.kmInicial));
  await formulario.locator('#DataKmInicial').fill(dados.dataKmInicial);
  await expect(formulario.locator('#DataKmInicial')).toHaveValue(dados.dataKmInicial);
  // O calendário aberto pelo campo cobre o botão Salvar; sair do campo o fecha.
  await formulario.locator('#Modelo').click();
  await expect(page.locator('#ui-datepicker-div')).toBeHidden();

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();

  // O resultado vem num modal (swal2) com botão "Ok": "Sucesso!" ou "Atenção!".
  const aviso = page.locator('.swal2-container').filter({ hasText: /Sucesso!|Atenção!/ });
  await expect(aviso).toBeVisible({ timeout: 30000 });
  const textoAviso = (await aviso.innerText()).replace(/\s+/g, ' ').trim();
  if (!/Veículo cadastrado com sucesso!/.test(textoAviso)) {
    const validacoes = (await formulario.locator('.field-validation-error, .state-error').allInnerTexts())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou o Veículo "${dados.modelo}" (placa ${formatarPlaca(dados.placa)}): ${textoAviso}. `
      + `Validações visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }
  await aviso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(aviso).toBeHidden({ timeout: 15000 });

  // Salvar mantém a tela na edição do registro recém-criado.
  await expect(getByRoleSge(formulario, 'heading', { name: /Editar Veículo/i })).toBeVisible({ timeout: 20000 });
  await voltarParaConsultaVeiculo(page);
  await expect(tituloConsultaVeiculo(page)).toBeVisible();

  await pesquisarVeiculo(page, dados.modelo);
  await expect(linhaVeiculo(page, dados.modelo)).toHaveCount(1, { timeout: 15000 });
  await expect(linhaVeiculo(page, dados.modelo).getByText(formatarPlaca(dados.placa), { exact: true })).toBeVisible();

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoVeiculo(page, dados.modelo);
  await expect(formulario.locator('#Placa')).toHaveValue(formatarPlaca(dados.placa));
  await expect(formulario.locator('#Renavam')).toHaveValue(dados.renavam);
  await expect(formulario.locator('#Ano')).toHaveValue(String(dados.ano));
  await expect(formulario.locator('#Capacidade')).toHaveValue(String(dados.capacidade));
  await expect(formulario.locator('#VinculoVeiculo')).toHaveValue(dados.vinculo);
  await expect(formulario.locator('#CategoriaCNH')).toHaveValue(dados.categoriaCnh);
  await voltarParaConsultaVeiculo(page);

  console.log(`[QAAUTO] Veículo criado e conferido: ${dados.modelo} | Placa: ${formatarPlaca(dados.placa)}`);
  return { ...dados, url: page.url() };
}
