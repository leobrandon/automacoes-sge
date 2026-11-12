import { expect, test } from '@playwright/test';
import {
  buildComponente,
  COMPONENTES_EDUCACENSO,
  isComponenteQAAuto,
  TIPOS_COMPONENTE,
} from '../../../../src/factories/componente.factory';

test.describe('Factory de Componentes', () => {
  test('acrescenta a sequência aos campos configurados', () => {
    const componente = buildComponente({
      nome: 'QAAUTO - Componente de teste',
      abreviacao: 'QA',
      codigo: '123',
    }, 3);

    expect(componente.nome).toBe('QAAUTO - Componente de teste 3');
    expect(componente.abreviacao).toBe('QA3');
    expect(componente.codigo).toBe('1233');
  });

  test('gera dados QAAUTO compatíveis com os limites da tela', () => {
    const componente = buildComponente();

    expect(isComponenteQAAuto(componente.nome)).toBe(true);
    expect(componente.nome).toBe('QAAUTO - Componente de Arte e Cultura 1');
    expect(buildComponente({}, 2).nome).toBe('QAAUTO - Componente de Arte e Cultura 2');
    expect(componente.nome).not.toMatch(/\b[A-Z]{8}\b/);
    expect(componente.nome.length).toBeLessThanOrEqual(128);
    expect(componente.abreviacao.length).toBeLessThanOrEqual(10);
    expect(componente.codigo.length).toBeLessThanOrEqual(10);
    expect(TIPOS_COMPONENTE).toContain(componente.tipo);
    expect(COMPONENTES_EDUCACENSO).toContain(componente.componenteCurricularEducacenso);
  });

  test('rejeita nome fora do padrão e sequências inválidas', () => {
    expect(() => buildComponente({ nome: 'Componente sem marcador' })).toThrow(/QAAUTO/);
    expect(() => buildComponente({}, 0)).toThrow(/inteiro positivo/);
    expect(isComponenteQAAuto('Componente QAAUTO')).toBe(false);
  });
});
