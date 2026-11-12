import { expect, test } from '@playwright/test';
import { lerConfiguracaoExclusaoConceito } from './conceito_config';

test('aceita a exclusão em lote somente com o prefixo QAAUTO configurado', () => {
  const config = lerConfiguracaoExclusaoConceito();

  expect(config.excluirTodasQAAUTO).toBe(true);
  expect(config.termoGeral).toBe('QAAUTO');
  expect(config.descricao).toBe('');
});
