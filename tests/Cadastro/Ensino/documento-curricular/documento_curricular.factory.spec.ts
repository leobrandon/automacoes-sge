import { expect, test } from '@playwright/test';
import { buildDocumentoCurricular, isDocumentoCurricularQAAuto } from '../../../../src/factories/documento-curricular.factory';
import { lerConfiguracaoCriacaoDocumentoCurricular, lerConfiguracaoExclusaoDocumentoCurricular } from './documento_curricular_config';

test.describe('Factory de Documento Curricular', () => {
  test('gera documentos, estruturas e itens QAAUTO com sequência', () => {
    const documento = buildDocumentoCurricular({}, 7);
    expect(documento.descricao).toBe('QAAUTO Documento Curricular 7');
    expect(documento.composicaoEnsino).toBe('ENSINO MÉDIO INOVADOR');
    expect(documento.anoEscolar).toBe('2° SÉRIE');
    expect(documento.componente).toBe('ARTES');
    expect(documento.estruturas).toHaveLength(2);
    expect(documento.estruturas.every(estrutura => estrutura.itens.length === 1)).toBe(true);
    expect(documento.estruturas[0].itens[0].codigo).toBe('001');
    expect(documento.estruturas[1].itens[0].descricaoItemPai).toBe(documento.estruturas[0].itens[0].descricao);
  });

  test('aceita valores configuráveis e exige QAAUTO nos dados', () => {
    const documento = buildDocumentoCurricular({ descricao: 'QAAUTO Documento Curricular Sob Medida' }, 2);
    expect(documento.descricao).toBe('QAAUTO Documento Curricular Sob Medida 2');
    expect(() => buildDocumentoCurricular({ descricao: 'Documento comum' })).toThrow(/QAAUTO/);
    expect(isDocumentoCurricularQAAuto(documento.descricao)).toBe(true);
    expect(isDocumentoCurricularQAAuto('Outro documento')).toBe(false);
  });

  test('valida código conforme o tipo de estrutura', () => {
    expect(() => buildDocumentoCurricular({ estruturas: [{
      descricao: 'QAAUTO Estrutura sem código', possuiCodigo: 'Sim', ativo: 'Sim',
      itens: [{ descricao: 'QAAUTO Item sem código', ativo: 'Sim' }],
    }] })).toThrow(/precisa de código/);
  });

  test('normaliza vários componentes e preserva a configuração singular', () => {
    const varios = buildDocumentoCurricular({ componentes: [' ARTES ', 'CIÊNCIAS', 'COMPUTAÇÃO'] });
    expect(varios.componentes).toEqual(['ARTES', 'CIÊNCIAS', 'COMPUTAÇÃO']);
    expect(buildDocumentoCurricular({ componente: 'ARTES' }).componentes).toEqual(['ARTES']);
    expect(() => buildDocumentoCurricular({ componentes: ['ARTES', 'ARTES'] })).toThrow(/repetidos/);
  });

  test('lê os dados e respeita a configuração explícita de exclusão', () => {
    const criacao = lerConfiguracaoCriacaoDocumentoCurricular();
    const exclusao = lerConfiguracaoExclusaoDocumentoCurricular();
    expect(criacao.quantidade).toBeGreaterThan(0);
    expect(criacao.dados.estruturas).toHaveLength(2);
    expect(typeof exclusao.excluirTodasQAAUTO).toBe('boolean');
    expect(exclusao.termoGeral).toBe('QAAUTO');
  });
});

