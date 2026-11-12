import { expect, test } from '@playwright/test';
import { criarEscalaProficiencia, type EscalaProficienciaCriada } from '../../../src/actions/criar-escala-proficiencia.action';
import { loginSge } from '../../../src/helpers';
import { excluirEscalaProficiencia } from '../../../src/actions/excluir-escala-proficiencia.action';
import { configEscalaProficiencia } from './escala_proficiencia_config';
import { limparEscalaCriada } from './limpar_escala_proficiencia.test-helper';

test('cria, exclui e confirma a ausência da Escala de Proficiência desta execução', async ({ page }) => {
  await loginSge(page);
  let criada: EscalaProficienciaCriada | undefined;
  try {
    criada = await criarEscalaProficiencia(page, configEscalaProficiencia(), (registro) => {
      criada = registro;
    });
    const alvo = criada;
    await excluirEscalaProficiencia(page, alvo);
    criada = undefined;
    await expect(page.getByRole('heading', { name: /Consulta Escala de Proficiência/i })).toBeVisible();
  } finally {
    await limparEscalaCriada(page, criada);
  }
});
