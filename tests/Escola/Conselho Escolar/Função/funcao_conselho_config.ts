import path from 'node:path';
import {
  OPCOES_ATIVO_FUNCAO_CONSELHO,
  type BuildFuncaoConselhoOptions,
  type OpcaoAtivoFuncaoConselho,
} from '../../../../src/factories/funcao-conselho.factory';
import { TIPOS_MEMBRO_CONSELHO, type TipoMembroConselho } from '../../../../src/factories/conselho-escolar.factory';
import {
  lerConfiguracaoExclusao,
  lerJsonObjeto,
  quantidadeConfigurada,
  textoOpcional,
  type ConfiguracaoExclusao,
} from '../../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoFuncaoConselho {
  quantidade: number;
  dados: BuildFuncaoConselhoOptions;
}

export function lerConfiguracaoCriacaoFuncaoConselho(): ConfiguracaoCriacaoFuncaoConselho {
  const arquivo = 'dados_funcao_conselho.json';
  const config = lerJsonObjeto(path.resolve(__dirname, arquivo));

  const tiposBrutos = config.tipos;
  if (tiposBrutos !== undefined && !Array.isArray(tiposBrutos)) {
    throw new Error(`${arquivo}: "tipos" deve ser uma lista.`);
  }
  const tipos = ((tiposBrutos ?? []) as unknown[]).map((tipo) => {
    if (typeof tipo !== 'string' || !TIPOS_MEMBRO_CONSELHO.includes(tipo as TipoMembroConselho)) {
      throw new Error(`${arquivo}: tipo inválido "${String(tipo)}". Opções: ${TIPOS_MEMBRO_CONSELHO.join(', ')}.`);
    }
    return tipo as TipoMembroConselho;
  });

  const idadeTexto = textoOpcional(config, 'idadeMinima');
  const ativo = textoOpcional(config, 'ativo');
  if (ativo && !OPCOES_ATIVO_FUNCAO_CONSELHO.includes(ativo as OpcaoAtivoFuncaoConselho)) {
    throw new Error(`${arquivo}: "ativo" inválido "${ativo}". Opções: ${OPCOES_ATIVO_FUNCAO_CONSELHO.join(', ')}.`);
  }

  return {
    quantidade: quantidadeConfigurada(config),
    dados: {
      descricao: textoOpcional(config, 'descricao'),
      tipos: tipos.length ? tipos : undefined,
      idadeMinima: idadeTexto ? Number(idadeTexto) : undefined,
      ativo: ativo as OpcaoAtivoFuncaoConselho | undefined,
    },
  };
}

export function lerConfiguracaoExclusaoFuncaoConselho(): ConfiguracaoExclusao {
  const configuracao = lerConfiguracaoExclusao(path.resolve(__dirname, 'dados_exclusao_funcao_conselho.json'));
  if (!configuracao.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(configuracao.descricao)) {
    throw new Error('Informe em "descricao" o nome exato da função, iniciado por QAAUTO.');
  }
  return configuracao;
}
