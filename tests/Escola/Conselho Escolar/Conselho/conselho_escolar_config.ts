import path from 'node:path';
import {
  TIPOS_ANEXO_CONSELHO,
  TIPOS_MEMBRO_CONSELHO,
  dataValidaConselho,
  type AnexoConselhoConfig,
  type MembroConselhoConfig,
  type TipoAnexoConselho,
  type TipoMembroConselho,
  type VigenciaConselhoConfig,
} from '../../../../src/factories/conselho-escolar.factory';
import { lerJsonObjeto, textoOpcional, type JsonObjeto } from '../../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoConselhoEscolar {
  escola: string;
  vigencias: VigenciaConselhoConfig[];
}

export interface ConfiguracaoExclusaoConselhoEscolar {
  escola: string;
  vigencias: Array<{ dataInicio: string; dataFim: string }>;
}

function escolaConfigurada(config: JsonObjeto, arquivo: string): string {
  const escola = textoOpcional(config, 'escola');
  if (!escola) throw new Error(`${arquivo}: informe "escola" (nome exato em Cadastro > Escolas > Escola).`);
  return escola;
}

function lista(config: JsonObjeto, chave: string, arquivo: string): JsonObjeto[] {
  const valor = config[chave];
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new Error(`${arquivo}: "${chave}" deve ser uma lista com ao menos um item.`);
  }
  return valor.map((item, indice) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`${arquivo}: "${chave}[${indice}]" deve ser um objeto.`);
    }
    return item as JsonObjeto;
  });
}

function data(item: JsonObjeto, chave: string, arquivo: string): string {
  const valor = textoOpcional(item, chave);
  if (!valor || !dataValidaConselho(valor)) {
    throw new Error(`${arquivo}: "${chave}" deve ser uma data válida no formato DD/MM/AAAA (recebido: "${valor ?? ''}").`);
  }
  return valor;
}

function opcao<T extends string>(item: JsonObjeto, chave: string, opcoes: readonly T[], arquivo: string): T {
  const valor = textoOpcional(item, chave);
  if (!valor || !opcoes.includes(valor as T)) {
    throw new Error(`${arquivo}: "${chave}" inválido ("${valor ?? ''}"). Opções: ${opcoes.join(', ')}.`);
  }
  return valor as T;
}

function listaOpcional(item: JsonObjeto, chave: string, arquivo: string): JsonObjeto[] {
  const valor = item[chave];
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) throw new Error(`${arquivo}: "${chave}" deve ser uma lista.`);
  return valor.map((elemento, indice) => {
    if (typeof elemento !== 'object' || elemento === null || Array.isArray(elemento)) {
      throw new Error(`${arquivo}: "${chave}[${indice}]" deve ser um objeto.`);
    }
    return elemento as JsonObjeto;
  });
}

export function lerConfiguracaoCriacaoConselhoEscolar(): ConfiguracaoCriacaoConselhoEscolar {
  const arquivo = 'dados_conselho_escolar.json';
  const config = lerJsonObjeto(path.resolve(__dirname, arquivo));
  const vigencias = lista(config, 'vigencias', arquivo).map((item): VigenciaConselhoConfig => {
    const dataInicio = data(item, 'dataInicio', arquivo);
    const dataFim = data(item, 'dataFim', arquivo);
    const membros = listaOpcional(item, 'membros', arquivo).map((membro): MembroConselhoConfig => {
      const funcao = textoOpcional(membro, 'funcao');
      if (!funcao) throw new Error(`${arquivo}: informe "funcao" em cada membro.`);
      return {
        tipo: opcao<TipoMembroConselho>(membro, 'tipo', TIPOS_MEMBRO_CONSELHO, arquivo),
        funcao,
        pessoa: textoOpcional(membro, 'pessoa'),
      };
    });
    const anexos = listaOpcional(item, 'anexos', arquivo).map((anexo): AnexoConselhoConfig => ({
      tipo: opcao<TipoAnexoConselho>(anexo, 'tipo', TIPOS_ANEXO_CONSELHO, arquivo),
    }));
    return { dataInicio, dataFim, membros, anexos };
  });

  const primeira = vigencias[0];
  if (primeira.membros.length === 0 || primeira.anexos.length === 0) {
    throw new Error(`${arquivo}: a primeira vigência precisa de ao menos um membro e um anexo (usada nas recusas).`);
  }
  return { escola: escolaConfigurada(config, arquivo), vigencias };
}

export function lerConfiguracaoExclusaoConselhoEscolar(): ConfiguracaoExclusaoConselhoEscolar {
  const arquivo = 'dados_exclusao_conselho_escolar.json';
  const config = lerJsonObjeto(path.resolve(__dirname, arquivo));
  return {
    escola: escolaConfigurada(config, arquivo),
    vigencias: lista(config, 'vigencias', arquivo).map((item) => ({
      dataInicio: data(item, 'dataInicio', arquivo),
      dataFim: data(item, 'dataFim', arquivo),
    })),
  };
}
