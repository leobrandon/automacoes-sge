import fs from 'node:fs';
import path from 'node:path';
import {
  OPCOES_ABONO_JUSTIFICATIVA,
  isJustificativaFrequenciaQAAuto,
  type BuildJustificativaFrequenciaOptions,
  type OpcaoAbonoJustificativa,
} from '../../../../src/factories/justificativa-frequencia.factory';

export interface ConfiguracaoCriacaoJustificativaFrequencia {
  quantidade: number;
  dados: BuildJustificativaFrequenciaOptions;
}

export interface ConfiguracaoExclusaoJustificativaFrequencia {
  excluirSomenteDescricoesConfiguradas: boolean;
  quantidadeEsperada: number;
  descricoes: string[];
}

function lerObjetoJson(nome: string): Record<string, unknown> {
  const caminho = path.resolve(__dirname, nome);
  const valor: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`${nome} deve conter um objeto JSON.`);
  }
  return valor as Record<string, unknown>;
}

function quantidade(config: Record<string, unknown>, campo: string, padrao: number): number {
  const valor = config[campo];
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return padrao;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw new Error(`"${campo}" deve ser um inteiro positivo.`);
  }
  return numero;
}

function textoOpcional(config: Record<string, unknown>, campo: string): string | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string') throw new Error(`O campo "${campo}" deve ser texto.`);
  return valor.trim() || undefined;
}

function opcaoSimNao(config: Record<string, unknown>, campo: string): OpcaoAbonoJustificativa | undefined {
  const valor = textoOpcional(config, campo);
  if (!valor) return undefined;
  if (!OPCOES_ABONO_JUSTIFICATIVA.includes(valor as OpcaoAbonoJustificativa)) {
    throw new Error(`O campo "${campo}" deve ser "Sim" ou "Não".`);
  }
  return valor as OpcaoAbonoJustificativa;
}

export function lerConfiguracaoCriacaoJustificativaFrequencia(): ConfiguracaoCriacaoJustificativaFrequencia {
  const config = lerObjetoJson('dados_justificativa_frequencia.json');
  const total = quantidade(config, 'quantidade', 1);
  const descricao = textoOpcional(config, 'descricao');
  const ativa = opcaoSimNao(config, 'ativa');
  let abonoPorSequencia: OpcaoAbonoJustificativa[] | undefined;

  if (config.abonoPorSequencia !== undefined) {
    if (!Array.isArray(config.abonoPorSequencia)) {
      throw new Error('"abonoPorSequencia" deve ser uma lista de opções "Sim" ou "Não".');
    }
    abonoPorSequencia = config.abonoPorSequencia.map((valor, indice) => {
      if (typeof valor !== 'string' || !OPCOES_ABONO_JUSTIFICATIVA.includes(valor as OpcaoAbonoJustificativa)) {
        throw new Error(`"abonoPorSequencia[${indice}]" deve ser "Sim" ou "Não".`);
      }
      return valor as OpcaoAbonoJustificativa;
    });
    if (abonoPorSequencia.length < total) {
      throw new Error(`"abonoPorSequencia" precisa conter ao menos ${total} opções.`);
    }
  }

  return {
    quantidade: total,
    dados: { descricao, abonoPorSequencia, ativa },
  };
}

export function lerConfiguracaoExclusaoJustificativaFrequencia(): ConfiguracaoExclusaoJustificativaFrequencia {
  const config = lerObjetoJson('dados_exclusao_justificativa_frequencia.json');
  if (typeof config.excluirSomenteDescricoesConfiguradas !== 'boolean') {
    throw new Error('Defina "excluirSomenteDescricoesConfiguradas" como true ou false.');
  }
  if (!Array.isArray(config.descricoes) || config.descricoes.some((descricao) => typeof descricao !== 'string')) {
    throw new Error('"descricoes" deve conter a lista explícita de justificativas para exclusão.');
  }
  return {
    excluirSomenteDescricoesConfiguradas: config.excluirSomenteDescricoesConfiguradas,
    quantidadeEsperada: quantidade(config, 'quantidadeEsperada', 1),
    descricoes: config.descricoes.map((descricao) => descricao.trim()),
  };
}

export function validarUrlSandbox(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('A URL configurada para esta automação deve ser uma URL válida do SANDBOX.');
  }
  return baseUrl;
}

export function validarEscopoExclusao(
  config: ConfiguracaoExclusaoJustificativaFrequencia,
  descricoesAlvo: string[],
): void {
  if (config.excluirSomenteDescricoesConfiguradas !== true) {
    throw new Error('A exclusão só pode atingir as descrições explicitamente listadas no JSON.');
  }
  if (config.quantidadeEsperada !== descricoesAlvo.length) {
    throw new Error(`Quantidade configurada para exclusão (${config.quantidadeEsperada}) diverge da lista explícita (${descricoesAlvo.length}).`);
  }
  const unicas = new Set(descricoesAlvo.map((descricao) => descricao.trim().toLocaleLowerCase('pt-BR')));
  if (unicas.size !== descricoesAlvo.length) {
    throw new Error('A lista de exclusão contém descrições duplicadas.');
  }
  if (descricoesAlvo.some((descricao) => !isJustificativaFrequenciaQAAuto(descricao))) {
    throw new Error('Todas as descrições para exclusão devem começar com QAAUTO.');
  }
}

export function combinarFalhasCiclo(erroPrincipal: unknown, errosLimpeza: Error[]): unknown | undefined {
  if (errosLimpeza.length === 0) return erroPrincipal;
  const erros = erroPrincipal === undefined ? errosLimpeza : [erroPrincipal, ...errosLimpeza];
  return new AggregateError(erros, 'O ciclo de Justificativas de Frequência teve falha durante a execução e/ou limpeza.');
}
