export interface MotivoAlteracaoData {
  descricao: string;
  situacao: 'Ativo' | 'Inativo';
}

export type BuildMotivoAlteracaoOptions = Partial<MotivoAlteracaoData>;

let sequencia = 0;

export const MOTIVOS_ALTERACAO_EXEMPLOS = [
  'Substituição por Falta de Ingrediente',
  'Ajuste por Safra Sazonal de Alimentos',
  'Substituição para Dieta Especial',
  'Atraso na Entrega do Fornecedor',
  'Ajuste no Número de Refeições Servidas',
  'Solicitação da Nutricionista da Rede',
  'Substituição de Fruta por Maturação',
  'Alteração de Marca por Indisponibilidade',
  'Adequação Nutricional Emergencial',
  'Reposição de Estoque da Unidade',
];

/**
 * Factory para geração de motivos de alteração com prefixo QAAUTO e sequência iniciando em 1.
 * Exemplo: 'QAAUTO Substituição por Falta de Ingrediente - 1'
 */
export function buildMotivoAlteracao(options: BuildMotivoAlteracaoOptions = {}): MotivoAlteracaoData {
  const numero = ++sequencia;
  const indice = (numero - 1) % MOTIVOS_ALTERACAO_EXEMPLOS.length;
  const exemplo = MOTIVOS_ALTERACAO_EXEMPLOS[indice];
  const defaultDescricao = `QAAUTO ${exemplo} - ${numero}`;

  const descricao = options.descricao !== undefined
    ? options.descricao.trim()
    : defaultDescricao;

  const situacao = options.situacao ?? 'Ativo';

  if (!/^QAAUTO\b/.test(descricao) || descricao.length > 100) {
    throw new Error('Descrição deve começar com QAAUTO e conter no máximo 100 caracteres.');
  }
  if (situacao !== 'Ativo' && situacao !== 'Inativo') {
    throw new Error('Situação inválida.');
  }

  return { descricao, situacao };
}
import { fakeData } from '../helpers/generators/fake-data';

