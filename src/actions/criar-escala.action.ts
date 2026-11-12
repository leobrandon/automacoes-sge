import { expect, type Page } from '@playwright/test';
import {
  buildEscala,
  prefixoDescricaoEscala,
  type BuildEscalaOptions,
  type EscalaData,
} from '../factories/escala.factory';
import { select2 } from '../helpers/select2.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  navegarParaAdicionarEscala,
  proximaLetraEscala,
} from '../helpers/navigation/escala.navigation';

export interface EscalaCriada extends EscalaData {
  url: string;
}

/** Adiciona um ciclo à Escala aberta em edição, escolhendo o Horário no diálogo. */
async function adicionarCicloEscala(page: Page, horario: string): Promise<void> {
  const formulario = page.locator('#main');
  await expect(formulario.getByText('Nenhum ciclo configurado para a escala.')).toBeVisible();
  await getByRoleSge(formulario, 'button', { name: /Adicionar/i }).click();

  const dialogo = page.getByRole('dialog', { name: 'Editar Configuração Escala' });
  await expect(dialogo).toBeVisible({ timeout: 15000 });
  await select2.select(page, '#PontoHorarioId', horario, { exactMatch: true });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR') === '/pontoescala/posteditarescaladia'
        && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    dialogo.getByRole('button', { name: /Salvar/i }).click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`O salvamento do ciclo da Escala retornou HTTP ${resposta.status()}.`);
  }

  await expect(dialogo).toBeHidden({ timeout: 15000 });
  await expect(formulario.getByText('Nenhum ciclo configurado para a escala.')).toBeHidden();
  await expect(formulario.locator('td').getByText(horario, { exact: true })).toBeVisible();
}

/** Cria uma Escala pela interface, configura um ciclo e confirma a persistência em edição. */
export async function criarEscala(
  page: Page,
  options: BuildEscalaOptions,
  sequencia = 1,
): Promise<EscalaCriada> {
  const letra = await proximaLetraEscala(page, prefixoDescricaoEscala(options, sequencia));
  const dados = buildEscala(options, sequencia, letra);
  await navegarParaAdicionarEscala(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await select2.select(page, '#TipoEscala', dados.tipo, { exactMatch: true });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR').startsWith('/pontoescala')
        && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    getByRoleSge(formulario, 'button', { name: /Salvar/i }).click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`O salvamento da Escala retornou HTTP ${resposta.status()}.`);
  }

  await expect(getByRoleSge(formulario, 'heading', { name: /Editar Escala/i }))
    .toBeVisible({ timeout: 20000 });
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await expect(getByRoleSge(formulario, 'button', { name: dados.tipo, exact: true })).toBeDisabled();

  await adicionarCicloEscala(page, dados.horario);

  const criada: EscalaCriada = { ...dados, url: page.url() };
  console.log(`[QAAUTO] Escala salva com ciclo: ${criada.descricao} | Tipo: ${criada.tipo} | Horário: ${criada.horario}`);
  return criada;
}
