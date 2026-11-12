import fs from 'node:fs';

export type JsonObjeto = Record<string, unknown>;

/** Lê um dados_<entidade>.json que deve conter um objeto. */
export function lerJsonObjeto(caminho: string): JsonObjeto {
  const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf-8')) as unknown;
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error(`${caminho} deve conter um objeto JSON.`);
  }
  return conteudo as JsonObjeto;
}

/** Texto opcional: vazio ou ausente vira undefined; outro tipo é erro. */
export function textoOpcional(config: JsonObjeto, chave: string): string | undefined {
  const valor = config[chave];
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'string') throw new Error(`"${chave}" deve ser texto.`);
  return valor.trim() || undefined;
}

/** "quantidade": vazio vale 1; precisa ser inteiro positivo. */
export function quantidadeConfigurada(config: JsonObjeto): number {
  const valor = config.quantidade;
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return 1;
  const quantidade = Number(valor);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um número inteiro positivo.');
  }
  return quantidade;
}

export interface ConfiguracaoExclusao {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  descricao: string;
}

/** Lê dados_exclusao_<entidade>.json (lote QAAUTO ou exclusão de uma descrição específica). */
export function lerConfiguracaoExclusao(caminho: string): ConfiguracaoExclusao {
  const config = lerJsonObjeto(caminho);
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false no JSON.');
  }
  const termoGeral = textoOpcional(config, 'termoGeral') ?? 'QAAUTO';
  const descricao = textoOpcional(config, 'descricao') ?? '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A limpeza em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && !descricao) {
    throw new Error('Informe "descricao" para excluir um registro específico.');
  }
  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}
