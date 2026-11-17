import path from 'node:path';
import type { PlanejamentoEscolaDados } from '../../../src/actions';
import { lerJsonObjeto, quantidadeConfigurada, textoOpcional } from '../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoPlanejamentoEscola {
  quantidade: number;
  escola: string;
  /** true mantém os planejamentos na base para conferência manual; padrão false (a execução limpa o que criou). */
  manterParaConferencia: boolean;
  dados: PlanejamentoEscolaDados;
}

function textoObrigatorio(config: Record<string, unknown>, chave: string, arquivo: string): string {
  const valor = textoOpcional(config, chave);
  if (!valor) throw new Error(`${arquivo}: informe "${chave}" (dado de apoio do tenant).`);
  return valor;
}

export function lerConfiguracaoCriacaoPlanejamentoEscola(): ConfiguracaoCriacaoPlanejamentoEscola {
  const arquivo = 'dados_planejamento.json';
  const config = lerJsonObjeto(path.resolve(__dirname, arquivo));
  if (config.manterParaConferencia !== undefined && typeof config.manterParaConferencia !== 'boolean') {
    throw new Error(`${arquivo}: defina "manterParaConferencia" como true ou false.`);
  }
  return {
    quantidade: quantidadeConfigurada(config),
    escola: textoObrigatorio(config, 'escola', arquivo),
    manterParaConferencia: config.manterParaConferencia === true,
    dados: {
      anoLetivo: textoObrigatorio(config, 'anoLetivo', arquivo),
      tipoDeTurma: textoObrigatorio(config, 'tipoDeTurma', arquivo),
      turma: textoObrigatorio(config, 'turma', arquivo),
      tipoPlanejamento: textoObrigatorio(config, 'tipoPlanejamento', arquivo),
      periodo: textoOpcional(config, 'periodo'),
    },
  };
}

export interface ConfiguracaoExclusaoPlanejamentoEscola {
  escola: string;
  excluirTodasQAAUTO: boolean;
  periodo: string;
  filtro: Omit<PlanejamentoEscolaDados, 'periodo'>;
}

export function lerConfiguracaoExclusaoPlanejamentoEscola(): ConfiguracaoExclusaoPlanejamentoEscola {
  const arquivo = 'dados_exclusao_planejamento.json';
  const config = lerJsonObjeto(path.resolve(__dirname, arquivo));
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error(`${arquivo}: defina "excluirTodasQAAUTO" como true ou false.`);
  }
  const periodo = textoOpcional(config, 'periodo') ?? '';
  if (!config.excluirTodasQAAUTO && !periodo) {
    throw new Error(`${arquivo}: informe "periodo" para excluir um planejamento específico.`);
  }
  return {
    escola: textoObrigatorio(config, 'escola', arquivo),
    excluirTodasQAAUTO: config.excluirTodasQAAUTO,
    periodo,
    filtro: {
      anoLetivo: textoObrigatorio(config, 'anoLetivo', arquivo),
      tipoDeTurma: textoObrigatorio(config, 'tipoDeTurma', arquivo),
      turma: textoObrigatorio(config, 'turma', arquivo),
      tipoPlanejamento: textoObrigatorio(config, 'tipoPlanejamento', arquivo),
    },
  };
}
