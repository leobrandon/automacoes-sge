import fs from 'node:fs';
import path from 'node:path';
import {
  COMPONENTES_EDUCACENSO,
  isComponenteQAAuto,
  TIPOS_COMPONENTE,
  type BuildComponenteOptions,
  type ComponenteEducacenso,
  type TipoComponente,
} from '../../../../src/factories/componente.factory';

export interface ConfiguracaoCriacaoComponente {
  quantidade: number;
  dados: BuildComponenteOptions;
}

function lerObjeto(caminho: string): Record<string, unknown> {
  const valor: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`${path.basename(caminho)} deve conter um objeto JSON.`);
  }
  return valor as Record<string, unknown>;
}

function textoOpcional(config: Record<string, unknown>, campo: string): string | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string') throw new Error(`O campo "${campo}" deve ser texto.`);
  return valor.trim() || undefined;
}

function opcaoOpcional<T extends string>(
  config: Record<string, unknown>,
  campo: string,
  opcoes: readonly T[],
): T | undefined {
  const valor = textoOpcional(config, campo);
  if (!valor) return undefined;
  if (!opcoes.includes(valor as T)) {
    throw new Error(`Valor "${valor}" inválido para "${campo}". Opções: ${opcoes.join(', ')}.`);
  }
  return valor as T;
}

export function lerConfiguracaoCriacaoComponente(): ConfiguracaoCriacaoComponente {
  const config = lerObjeto(path.resolve(__dirname, 'dados_componente.json'));
  const valorQuantidade = config.quantidade;
  const quantidade = valorQuantidade === undefined || valorQuantidade === null || valorQuantidade === ''
    ? 1
    : Number(valorQuantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      nome: textoOpcional(config, 'nome'),
      abreviacao: textoOpcional(config, 'abreviacao'),
      codigo: textoOpcional(config, 'codigo'),
      tipo: opcaoOpcional<TipoComponente>(config, 'tipo', TIPOS_COMPONENTE),
      componenteCurricularEducacenso: opcaoOpcional<ComponenteEducacenso>(
        config,
        'componenteCurricularEducacenso',
        COMPONENTES_EDUCACENSO,
      ),
    },
  };
}

export function lerConfiguracaoExclusaoComponente(): {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  nome: string;
} {
  const config = lerObjeto(path.resolve(__dirname, 'dados_exclusao_componente.json'));
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_componente.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') ?? 'QAAUTO';
  const nome = textoOpcional(config, 'nome');
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && !nome) {
    throw new Error('Informe o nome exato do Componente QAAUTO em dados_exclusao_componente.json.');
  }
  if (!config.excluirTodasQAAUTO && !isComponenteQAAuto(nome!)) {
    throw new Error('A exclusão está limitada a nomes iniciados por QAAUTO.');
  }
  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, nome: nome ?? '' };
}
