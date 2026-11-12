import { expect, test } from '@playwright/test';
import { criarEscalaProficiencia, type EscalaProficienciaCriada } from '../../../src/actions/criar-escala-proficiencia.action';
import { loginSge } from '../../../src/helpers';
import { configEscalaProficiencia } from './escala_proficiencia_config';
import { limparEscalaCriada } from './limpar_escala_proficiencia.test-helper';

test('cria uma Escala de Proficiência QAAUTO com parâmetros e confere a persistência', async ({ page }) => {
  await loginSge(page);
  let criada: EscalaProficienciaCriada | undefined;
  try {
    criada = await criarEscalaProficiencia(page, configEscalaProficiencia(), (registro) => {
      criada = registro;
    });
    expect(criada.descricao).toContain('QAAUTO');
    expect(criada.parametros).toHaveLength(1);
  } finally {
    await limparEscalaCriada(page, criada);
  }
});
