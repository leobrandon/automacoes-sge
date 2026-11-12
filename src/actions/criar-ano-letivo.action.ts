import {expect, type Page} from '@playwright/test';
import {buildAnoLetivo, digitosDaMascara, type AnoLetivoDados} from '../factories/ano-letivo.factory';
import {getByRoleSge} from '../helpers/sge-locators.helper';
import {consultaAnoLetivo, linhaAnoLetivo, pesquisarAnoLetivo, voltarParaConsultaAnoLetivo} from '../helpers/navigation/ano-letivo.navigation';

/**
 * `aoCriar` é chamado assim que o SGE confirma a gravação, antes da verificação de persistência,
 * para que o ciclo completo consiga excluir o ano mesmo se uma verificação posterior falhar.
 */
export async function criarAnoLetivo(page: Page, dados: AnoLetivoDados, aoCriar?: (ano: string) => void): Promise<string> {
  const d = buildAnoLetivo(dados);
  await consultaAnoLetivo(page);
  const m = page.locator('#main');
  // Falha rápida: não cria nem toca em ano que já exista (pode ser dado real da rede).
  await pesquisarAnoLetivo(page, d.ano);
  await expect(linhaAnoLetivo(page, d.ano), `O ano ${d.ano} já existe no tenant; a automação não o altera nem exclui.`).toHaveCount(0);

  await m.locator('button').filter({hasText: 'Adicionar'}).first().click();
  await expect(m.locator('h4').filter({hasText: 'Adicionar Ano Letivo'})).toBeVisible();
  // Campos mascarados: digitar somente os dígitos; fill() contornaria a máscara.
  for (const [id, valor] of [['Ano', d.ano], ['MetaAproveitamento', d.metaAproveitamento], ['MetaMedia', d.metaMedia]] as const) {
    const campo = m.locator(`#${id}`);
    await campo.click();
    await campo.pressSequentially(digitosDaMascara(valor));
    await expect(campo).toHaveValue(valor);
  }
  await expect(m.locator('#Padrao')).not.toBeChecked();
  await m.locator('button').filter({hasText: /^\s*Salvar\s*$/}).click();
  await expect(m.locator('h4').filter({hasText: 'Editar Ano Letivo'})).toBeVisible();
  await expect(m.locator('#Ano')).toHaveValue(d.ano);
  aoCriar?.(d.ano);

  await voltarParaConsultaAnoLetivo(page);
  await pesquisarAnoLetivo(page, d.ano);
  const linha = linhaAnoLetivo(page, d.ano);
  await expect(linha).toHaveCount(1);
  // A grade tem colunas ocultas (13 td), então valida por célula visível, não por posição.
  await expect(getByRoleSge(linha, 'cell', {name: d.metaAproveitamento, exact: true})).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', {name: d.metaMedia.replace(/,(\d)$/, ',$10'), exact: true})).toBeVisible();
  return d.ano;
}
