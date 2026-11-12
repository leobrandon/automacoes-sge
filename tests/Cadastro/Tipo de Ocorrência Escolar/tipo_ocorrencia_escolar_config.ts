import fs from 'node:fs';
import path from 'node:path';
import {
  OPCOES_CAMPO_OCORRENCIA,
  OPCOES_SIM_NAO,
  buildTipoOcorrenciaEscolar,
  isTipoOcorrenciaEscolarQAAuto,
  type OpcaoCampoOcorrencia,
  type OpcaoSimNao,
  type TipoOcorrenciaEscolarData,
} from '../../../src/factories/tipo-ocorrencia-escolar.factory';

export interface ConfiguracaoCriacaoTipoOcorrenciaEscolar {
  quantidade: number;
  dados: TipoOcorrenciaEscolarData;
}

export interface ConfiguracaoExclusaoTipoOcorrenciaEscolar {
  excluirTodasQAAUTO: boolean;
  excluirSomenteDescricoesConfiguradas: boolean;
  quantidadeEsperada: number;
  descricoes: string[];
}

const DESCRICAO_MAXIMA = 100;

function lerObjetoJson(nomeArquivo: string): Record<string, unknown> {
  const caminho = path.resolve(__dirname, nomeArquivo);
  const valor: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`${nomeArquivo} deve conter um objeto JSON.`);
  }
  return valor as Record<string, unknown>;
}

function lerObjeto(valor: unknown, campo: string): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`"${campo}" deve ser um objeto.`);
  }
  return valor as Record<string, unknown>;
}

function lerTexto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new Error(`"${campo}" deve ser um texto não vazio.`);
  }
  return valor.trim();
}

function lerOpcaoCampo(valor: unknown, campo: string): OpcaoCampoOcorrencia {
  if (typeof valor !== 'string' || !OPCOES_CAMPO_OCORRENCIA.includes(valor as OpcaoCampoOcorrencia)) {
    throw new Error(`"${campo}" deve ser "Não", "Sim" ou "Sim e Obrigatório".`);
  }
  return valor as OpcaoCampoOcorrencia;
}

function lerOpcaoSimNao(valor: unknown, campo: string): OpcaoSimNao {
  if (typeof valor !== 'string' || !OPCOES_SIM_NAO.includes(valor as OpcaoSimNao)) {
    throw new Error(`"${campo}" deve ser "Sim" ou "Não".`);
  }
  return valor as OpcaoSimNao;
}

function lerDadosCriacao(config: Record<string, unknown>): TipoOcorrenciaEscolarData {
  const descricao = lerTexto(config.descricao, 'descricao');
  const ativo = lerOpcaoSimNao(config.ativo, 'ativo');
  const parametrizacao = lerObjeto(config.parametrizacao, 'parametrizacao');
  const dadosEnvolvidos = lerObjeto(config.dadosEnvolvidos, 'dadosEnvolvidos');

  const dados: TipoOcorrenciaEscolarData = {
    descricao,
    ativo,
    parametrizacao: {
      naturezaOcorrencia: lerOpcaoCampo(parametrizacao.naturezaOcorrencia, 'parametrizacao.naturezaOcorrencia'),
      dataOcorrencia: lerOpcaoCampo(parametrizacao.dataOcorrencia, 'parametrizacao.dataOcorrencia'),
      turnoOcorrencia: lerOpcaoCampo(parametrizacao.turnoOcorrencia, 'parametrizacao.turnoOcorrencia'),
      horaOcorrencia: lerOpcaoCampo(parametrizacao.horaOcorrencia, 'parametrizacao.horaOcorrencia'),
      descricaoOcorrencia: lerOpcaoCampo(parametrizacao.descricaoOcorrencia, 'parametrizacao.descricaoOcorrencia'),
      procedimentoAdotado: lerOpcaoCampo(parametrizacao.procedimentoAdotado, 'parametrizacao.procedimentoAdotado'),
      informarEnvolvidos: lerOpcaoCampo(parametrizacao.informarEnvolvidos, 'parametrizacao.informarEnvolvidos'),
    },
    dadosEnvolvidos: {
      aluno: lerOpcaoSimNao(dadosEnvolvidos.aluno, 'dadosEnvolvidos.aluno'),
      responsavelDoAluno: lerOpcaoSimNao(dadosEnvolvidos.responsavelDoAluno, 'dadosEnvolvidos.responsavelDoAluno'),
      servidor: lerOpcaoSimNao(dadosEnvolvidos.servidor, 'dadosEnvolvidos.servidor'),
      outro: lerOpcaoSimNao(dadosEnvolvidos.outro, 'dadosEnvolvidos.outro'),
    },
  };

  const nomeado = buildTipoOcorrenciaEscolar(dados, 1);
  if (nomeado.descricao.length > DESCRICAO_MAXIMA) {
    throw new Error(`"descricao" deve caber com a sequência em até ${DESCRICAO_MAXIMA} caracteres.`);
  }
  return dados;
}

export function lerConfiguracaoCriacaoTipoOcorrenciaEscolar(): ConfiguracaoCriacaoTipoOcorrenciaEscolar {
  const config = lerObjetoJson('dados_tipo_ocorrencia_escolar.json');
  const quantidade = config.quantidade === undefined || config.quantidade === null || config.quantidade === ''
    ? 1
    : config.quantidade;
  if (typeof quantidade !== 'number' || !Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um número inteiro positivo.');
  }
  const dados = lerDadosCriacao(config);
  buildTipoOcorrenciaEscolar(dados, quantidade);
  return { quantidade, dados };
}

export function lerConfiguracaoExclusaoTipoOcorrenciaEscolar(): ConfiguracaoExclusaoTipoOcorrenciaEscolar {
  const config = lerObjetoJson('dados_exclusao_tipo_ocorrencia_escolar.json');
  if (config.excluirTodasQAAUTO !== undefined && typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('"excluirTodasQAAUTO" deve ser true ou false.');
  }
  if (config.excluirTodasQAAUTO === true) {
    return { excluirTodasQAAUTO: true, excluirSomenteDescricoesConfiguradas: false, quantidadeEsperada: 0, descricoes: [] };
  }
  if (config.excluirSomenteDescricoesConfiguradas !== undefined && config.excluirSomenteDescricoesConfiguradas !== true) {
    throw new Error('A exclusão exige "excluirSomenteDescricoesConfiguradas": true.');
  }
  if (typeof config.quantidadeEsperada !== 'number' || !Number.isSafeInteger(config.quantidadeEsperada) || config.quantidadeEsperada < 1) {
    throw new Error('"quantidadeEsperada" deve ser um inteiro positivo.');
  }
  if (!Array.isArray(config.descricoes) || config.descricoes.length !== config.quantidadeEsperada) {
    throw new Error('"descricoes" deve conter a quantidadeEsperada de alvos explícitos.');
  }

  const descricoes = config.descricoes.map((valor, indice) => {
    const descricao = lerTexto(valor, `descricoes[${indice}]`);
    if (descricao.length > DESCRICAO_MAXIMA || !isTipoOcorrenciaEscolarQAAuto(descricao)) {
      throw new Error(`"descricoes[${indice}]" deve ser uma descrição QAAUTO exata com sequência numérica.`);
    }
    return descricao;
  });

  const resultado: ConfiguracaoExclusaoTipoOcorrenciaEscolar = {
    excluirTodasQAAUTO: false,
    excluirSomenteDescricoesConfiguradas: true,
    quantidadeEsperada: config.quantidadeEsperada,
    descricoes,
  };
  validarEscopoExclusao(resultado, resultado.descricoes);
  return resultado;
}

export function validarUrlSandbox(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('A URL configurada para esta automação deve ser uma URL válida do SANDBOX.');
  }
  if (url.username || url.password) {
    throw new Error('A URL do SANDBOX não pode conter credenciais.');
  }
  return baseUrl;
}

export function validarEscopoExclusao(
  config: ConfiguracaoExclusaoTipoOcorrenciaEscolar,
  descricoesAlvo: string[],
): void {
  if (config.excluirTodasQAAUTO) {
    throw new Error('O modo de exclusão em lote deve buscar os alvos QAAUTO pela interface.');
  }
  if (config.excluirSomenteDescricoesConfiguradas !== true) {
    throw new Error('A exclusão só pode atingir descrições explicitamente listadas no JSON.');
  }
  if (descricoesAlvo.length !== config.quantidadeEsperada) {
    throw new Error('A quantidade de alvos deve corresponder a quantidadeEsperada.');
  }
  if (config.descricoes.length !== descricoesAlvo.length
    || config.descricoes.some((descricao, indice) => descricao !== descricoesAlvo[indice])) {
    throw new Error('Os alvos de exclusão devem corresponder exatamente à lista do JSON.');
  }

  const descricoesUnicas = new Set(descricoesAlvo.map((descricao) => descricao.trim().toLocaleLowerCase('pt-BR')));
  if (descricoesUnicas.size !== descricoesAlvo.length) {
    throw new Error('A lista de exclusão contém descrições duplicadas.');
  }
  if (descricoesAlvo.some((descricao) => descricao !== descricao.trim()
    || descricao.length > DESCRICAO_MAXIMA
    || !isTipoOcorrenciaEscolarQAAuto(descricao))) {
    throw new Error('Cada alvo deve ser uma descrição QAAUTO exata com sequência numérica.');
  }
}
