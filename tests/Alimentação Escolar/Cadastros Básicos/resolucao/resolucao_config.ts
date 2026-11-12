import fs from 'node:fs';
import path from 'node:path';
import {
  buildResolucao,
  type BuildResolucaoOptions,
} from '../../../../src/factories/resolucao.factory';

function ler(nome: string): Record<string, unknown> {
  const valor: unknown = JSON.parse(fs.readFileSync(path.resolve(__dirname, nome), 'utf8'));
  if (!valor || typeof valor !== 'object' || Array.isArray(valor))
    throw new Error(`${nome} deve conter um objeto.`);
  return valor as Record<string, unknown>;
}
export function lerConfiguracaoCriacaoResolucao(): {
  quantidade: number;
  dados: BuildResolucaoOptions[];
} {
  const config = ler('dados_resolucao.json');
  const quantidade =
    config.quantidade === '' || config.quantidade == null ? 1 : Number(config.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1)
    throw new Error('quantidade deve ser um inteiro positivo.');
  if (!Array.isArray(config.resolucoes) || config.resolucoes.length < quantidade)
    throw new Error(
      'Informe uma resolução com ano letivo e data distintos para cada item em resolucoes.',
    );
  const dados = config.resolucoes.slice(0, quantidade).map((item: unknown, i: number) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error(`resolucoes[${i}] deve ser um objeto.`);
    const obj = item as Record<string, unknown>;
    for (const campo of ['descricao', 'anoLetivo', 'dataInicial'])
      if (typeof obj[campo] !== 'string')
        throw new Error(`${campo} deve ser texto em resolucoes[${i}].`);
    const opcoes = {
      descricao: obj.descricao as string,
      anoLetivo: obj.anoLetivo as string,
      dataInicial: obj.dataInicial as string,
    };
    buildResolucao(opcoes, i + 1);
    return opcoes;
  });
  if (
    new Set(dados.map((d) => d.anoLetivo)).size !== quantidade ||
    new Set(dados.map((d) => d.dataInicial)).size !== quantidade
  )
    throw new Error('Cada resolução exige ano letivo e data inicial distintos.');
  return { quantidade, dados };
}
export function lerConfiguracaoExclusaoResolucao(): string {
  const config = ler('dados_exclusao_resolucao.json');
  if (config.excluirTodosQAAUTO !== false)
    throw new Error('Esta spec exige exclusão individual; defina excluirTodosQAAUTO como false.');
  if (typeof config.descricao !== 'string' || !/^QAAUTO\b/i.test(config.descricao.trim()))
    throw new Error('Informe a descrição exata QAAUTO da resolução criada para exclusão.');
  return config.descricao.trim();
}
