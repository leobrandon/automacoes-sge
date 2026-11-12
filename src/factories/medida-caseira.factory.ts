export interface MedidaCaseiraData {
  /** Descrição da medida caseira (obrigatório, até 100 caracteres) */
  descricao: string;
  /** Situação do registro ('Ativo' | 'Inativo') */
  situacao: string;
}

export type BuildMedidaCaseiraOptions = Partial<MedidaCaseiraData>;

let sequencia = 0;

export const MEDIDAS_CASEIRAS_EXEMPLOS = [
  'Xícara 200ml',
  'Colher de Sopa 15ml',
  'Colher de Sobremesa 10ml',
  'Colher de Chá 5ml',
  'Copo Americano 190ml',
  'Concha Média 100ml',
  'Prato Fundo 250g',
  'Prato Raso 200g',
  'Fatia Média 30g',
  'Pegador 50g',
  'Escumadeira 80g',
  'Unidade Pequena',
  'Porção 100g',
];

/**
 * Factory para geração determinística e isolada de dados de Medida Caseira.
 *
 * Defaults:
 * - Descrição com prefixo QAAUTO e sequência iniciando em 1 (ex.: 'QAAUTO Xícara 200ml - 1')
 * - Situação: 'Ativo'
 *
 * @param options Overrides parciais ou totais para a massa de dados
 * @returns Objeto MedidaCaseiraData pronto para consumo em actions e testes
 */
export function buildMedidaCaseira(options: BuildMedidaCaseiraOptions = {}): MedidaCaseiraData {
  const numero = ++sequencia;
  const indice = (numero - 1) % MEDIDAS_CASEIRAS_EXEMPLOS.length;
  const exemplo = MEDIDAS_CASEIRAS_EXEMPLOS[indice];
  const defaultDescricao = `QAAUTO ${exemplo} - ${numero}`;

  const descricao = (options.descricao !== undefined && options.descricao !== '')
    ? options.descricao.trim()
    : defaultDescricao;

  const situacao = options.situacao ?? 'Ativo';

  if (descricao.length > 100) {
    throw new Error('A descrição da medida caseira deve ter no máximo 100 caracteres.');
  }

  return {
    descricao,
    situacao,
  };
}
import { fakeData } from '../helpers/generators/fake-data';

