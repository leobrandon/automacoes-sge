import path from 'node:path';
import type { BuildTipoPautaOptions } from '../../../src/factories/tipo-pauta.factory';
import {
  lerConfiguracaoExclusao,
  lerJsonObjeto,
  quantidadeConfigurada,
  textoOpcional,
  type JsonObjeto,
} from '../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoTipoPauta {
  quantidade: number;
  dados: BuildTipoPautaOptions;
}

export interface ConfiguracaoExclusaoTipoPauta {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  /** Exclusão individual: nome exato do Tipo de pauta QAAUTO. */
  nome: string;
}

/** Número inteiro opcional: vazio ou ausente vira undefined. */
function inteiroOpcional(config: JsonObjeto, chave: string): number | undefined {
  const valor = config[chave];
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return undefined;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) throw new Error(`"${chave}" deve ser um número inteiro.`);
  return numero;
}

/** Booleano opcional: vazio ou ausente vira undefined (a factory aplica o padrão). */
function booleanoOpcional(config: JsonObjeto, chave: string): boolean | undefined {
  const valor = config[chave];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'boolean') throw new Error(`"${chave}" deve ser true ou false.`);
  return valor;
}

export function lerConfiguracaoCriacaoTipoPauta(): ConfiguracaoCriacaoTipoPauta {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_tipo_pauta.json'));
  return {
    quantidade: quantidadeConfigurada(config),
    dados: {
      nome: textoOpcional(config, 'nome'),
      eixo: textoOpcional(config, 'eixo'),
      areaAtuacao: textoOpcional(config, 'areaAtuacao'),
      descricao: textoOpcional(config, 'descricao'),
      pontuacaoMaxima: inteiroOpcional(config, 'pontuacaoMaxima'),
      destino: textoOpcional(config, 'destino'),
      calendario: textoOpcional(config, 'calendario'),
      periodicidade: textoOpcional(config, 'periodicidade'),
      registraDataDaPauta: booleanoOpcional(config, 'registraDataDaPauta'),
      permiteCadastroRetroativo: booleanoOpcional(config, 'permiteCadastroRetroativo'),
      quantidadeAgrupadores: inteiroOpcional(config, 'quantidadeAgrupadores'),
      itensPorAgrupador: inteiroOpcional(config, 'itensPorAgrupador'),
    },
  };
}

export function lerConfiguracaoExclusaoTipoPauta(): ConfiguracaoExclusaoTipoPauta {
  const { excluirTodasQAAUTO, termoGeral, descricao } = lerConfiguracaoExclusao(
    path.resolve(__dirname, 'dados_exclusao_tipo_pauta.json'),
  );
  if (!excluirTodasQAAUTO && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO em dados_exclusao_tipo_pauta.json.');
  }
  return { excluirTodasQAAUTO, termoGeral, nome: descricao };
}
