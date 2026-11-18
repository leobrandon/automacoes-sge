import { test } from '@playwright/test';
import { criarEscalaProficiencia, type EscalaProficienciaCriada } from '../../../src/actions/criar-escala-proficiencia.action';
import { excluirEscalaProficiencia } from '../../../src/actions/excluir-escala-proficiencia.action';
import { loginSge } from '../../../src/helpers';
import { configEscalaProficiencia } from './escala_proficiencia_config';
import { limparEscalaCriada } from './limpar_escala_proficiencia.test-helper';

test('exclui uma Escala de Proficiência QAAUTO criada pela execução', async ({ page }) => {
  await loginSge(page);
  let criada: EscalaProficienciaCriada | undefined;
  try {
    criada = await criarEscalaProficiencia(page, configEscalaProficiencia(), (registro) => {
      criada = registro;
    });
    await excluirEscalaProficiencia(page, criada);
    criada = undefined;
  } finally {
    await limparEscalaCriada(page, criada);
  }
});
