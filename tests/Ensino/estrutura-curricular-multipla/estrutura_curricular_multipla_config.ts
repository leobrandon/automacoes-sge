import fs from 'node:fs';
import path from 'node:path';
import {
  buildEstruturaCurricular,
  type EstruturaCurricularDados,
} from '../../../src/factories/estrutura-curricular-multipla.factory';

function ler(nome: string): Record<string, unknown> {
  const dados: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!dados || typeof dados !== 'object' || Array.isArray(dados))
    throw new Error(`${nome} deve conter um objeto.`);
  return dados as Record<string, unknown>;
}

export function configEstruturaCurricular(): {
  quantidade: number;
  dados: EstruturaCurricularDados;
} {
  const dados = ler('dados_estrutura_curricular_multipla.json');
  const quantidade =
    dados.quantidade == null || dados.quantidade === '' ? 1 : Number(dados.quantidade);
  if (
    !Number.isSafeInteger(quantidade) ||
    quantidade < 1 ||
    ['descricao', 'nivel', 'tipo', 'dataResolucao', 'numeroResolucao'].some(
      (campo) => typeof dados[campo] !== 'string',
    ) ||
    !Array.isArray(dados.grades) ||
    dados.grades.some(
      (g) =>
        !g ||
        typeof g !== 'object' ||
        [
          'anoEscolar',
          'componente',
          'cargaHoraria',
          'aulasSemanais',
          'aulasPresenciais',
          'aulasNaoPresenciais',
        ].some((campo) => typeof g[campo] !== 'string'),
    )
  )
    throw new Error('Configuração de estrutura curricular inválida.');
  const estrutura = dados as unknown as EstruturaCurricularDados;
  buildEstruturaCurricular(estrutura);
  return { quantidade, dados: estrutura };
}

export function configExclusaoEstruturaCurricular(): string {
  const { descricao } = ler('dados_exclusao_estrutura_curricular_multipla.json');
  if (typeof descricao !== 'string' || !/^QAAUTO\b/i.test(descricao.trim()))
    throw new Error('Informe a descrição QAAUTO exata para exclusão.');
  return descricao.trim();
}
