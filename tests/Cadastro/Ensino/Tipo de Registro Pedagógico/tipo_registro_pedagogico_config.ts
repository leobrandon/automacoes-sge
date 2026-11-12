import fs from 'node:fs';
import path from 'node:path';
import {
  TIPOS_REGISTRO_PEDAGOGICO,
  TIPOS_TURMA_REGISTRO_PEDAGOGICO,
  buildAtividadesEspecificas,
  buildConteudoAplicado,
  buildParecerDescritivo,
  buildPlanejamento,
  isTipoRegistroPedagogicoQAAuto,
  type BuildAtividadesEspecificasOptions,
  type BuildConteudoAplicadoOptions,
  type BuildParecerDescritivoOptions,
  type BuildPlanejamentoOptions,
  type TipoRegistroPedagogicoTipo,
  type TipoTurmaRegistroPedagogico,
} from '../../../../src/factories/tipo-registro-pedagogico.factory';

const ARQUIVOS_POR_TIPO: Record<TipoRegistroPedagogicoTipo, { pasta: string; criacao: string; exclusao: string }> = {
  'Atividades Específicas': {
    pasta: 'Atividades Específicas',
    criacao: 'dados_atividades_especificas.json',
    exclusao: 'dados_exclusao_atividades_especificas.json',
  },
  'Conteúdo Aplicado': {
    pasta: 'Conteúdo Aplicado',
    criacao: 'dados_conteudo_aplicado.json',
    exclusao: 'dados_exclusao_conteudo_aplicado.json',
  },
  'Parecer Descritivo (Ficha de Acompanhamento)': {
    pasta: 'Parecer Descritivo (Ficha de Acompanhamento)',
    criacao: 'dados_parecer_descritivo.json',
    exclusao: 'dados_exclusao_parecer_descritivo.json',
  },
  Planejamento: {
    pasta: 'Planejamento',
    criacao: 'dados_planejamento.json',
    exclusao: 'dados_exclusao_planejamento.json',
  },
};

export type ConfiguracaoCriacaoTipoRegistroPedagogico = {
  tipo: TipoRegistroPedagogicoTipo;
  dados: BuildAtividadesEspecificasOptions | BuildConteudoAplicadoOptions | BuildParecerDescritivoOptions | BuildPlanejamentoOptions;
};

export interface ConfiguracaoExclusaoTipoRegistroPedagogico {
  excluirSomenteDescricoesConfiguradas: true;
  descricao: string;
  tipo: TipoRegistroPedagogicoTipo;
  tipoTurma: TipoTurmaRegistroPedagogico;
  ano: number;
  composicao?: string;
  anosEscolares?: string[];
}

function objetoJson(valor: unknown, origem: string): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`${origem} deve conter um objeto JSON.`);
  }
  return valor as Record<string, unknown>;
}

function lerObjetoJson(nomeArquivo: string): Record<string, unknown> {
  const caminho = path.resolve(__dirname, nomeArquivo);
  const conteudo: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  return objetoJson(conteudo, nomeArquivo);
}

function nomeArquivo(tipo: TipoRegistroPedagogicoTipo, operacao: 'criacao' | 'exclusao'): string {
  const arquivos = ARQUIVOS_POR_TIPO[tipo];
  return path.join(arquivos.pasta, arquivos[operacao]);
}

function texto(config: Record<string, unknown>, campo: string, obrigatorio = false): string | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) {
      const nomeExibido = campo === 'tipoRegistro' ? 'tipo do registro' : campo;
      throw new Error(`O campo "${nomeExibido}" é obrigatório.`);
    }
    return undefined;
  }
  if (typeof valor !== 'string' || !valor.trim()) throw new Error(`O campo "${campo}" deve ser texto preenchido.`);
  return valor.trim();
}

function turma(config: Record<string, unknown>): TipoTurmaRegistroPedagogico {
  const valor = texto(config, 'tipoTurma', true);
  if (!TIPOS_TURMA_REGISTRO_PEDAGOGICO.includes(valor as TipoTurmaRegistroPedagogico)) {
    throw new Error('O campo "tipoTurma" precisa corresponder a uma opção válida do formulário.');
  }
  return valor as TipoTurmaRegistroPedagogico;
}

function ano(config: Record<string, unknown>): number {
  const valor = config.ano;
  if (!Number.isSafeInteger(valor) || (valor as number) < 2000 || (valor as number) > 2200) {
    throw new Error('O campo "ano" deve ser um ano letivo inteiro válido.');
  }
  return valor as number;
}

function ativo(config: Record<string, unknown>): boolean | undefined {
  if (config.ativo === undefined) return undefined;
  if (typeof config.ativo !== 'boolean') throw new Error('O campo "ativo" deve ser booleano.');
  return config.ativo;
}

function anosEscolares(config: Record<string, unknown>): string[] | undefined {
  if (config.anosEscolares === undefined) return undefined;
  if (!Array.isArray(config.anosEscolares) || config.anosEscolares.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error('O campo "anosEscolares" deve conter nomes de anos escolares preenchidos.');
  }
  return config.anosEscolares.map((item) => (item as string).trim());
}

function itemAtividades(config: Record<string, unknown>): BuildAtividadesEspecificasOptions['item'] | undefined {
  if (config.item === undefined) return undefined;
  const item = objetoJson(config.item, 'item');
  const tipo = texto(item, 'tipo');
  const titulo = texto(item, 'titulo');
  const obrigatorio = item.obrigatorio;
  const tamanhoMaximo = item.tamanhoMaximo;
  if (tamanhoMaximo !== undefined && (
    !Number.isSafeInteger(tamanhoMaximo) || (tamanhoMaximo as number) < 1 || (tamanhoMaximo as number) > 100000
  )) {
    throw new Error('O campo "item.tamanhoMaximo" deve ser um inteiro entre 1 e 100000.');
  }
  if (obrigatorio !== undefined && typeof obrigatorio !== 'boolean') {
    throw new Error('O campo "item.obrigatorio" deve ser booleano.');
  }
  return {
    ...(tipo ? { tipo: tipo as NonNullable<BuildAtividadesEspecificasOptions['item']>['tipo'] } : {}),
    ...(titulo ? { titulo } : {}),
    ...(obrigatorio !== undefined ? { obrigatorio: obrigatorio as boolean } : {}),
    ...(tamanhoMaximo !== undefined ? { tamanhoMaximo: tamanhoMaximo as number } : {}),
  };
}

function validarOpcoesCriacao(
  tipo: TipoRegistroPedagogicoTipo,
  config: Record<string, unknown>,
): ConfiguracaoCriacaoTipoRegistroPedagogico['dados'] {
  const dadosBase = {
    descricao: texto(config, 'descricao', true),
    tipoTurma: turma(config),
    ano: ano(config),
    composicao: texto(config, 'composicao'),
    anosEscolares: anosEscolares(config),
    ativo: ativo(config),
  };

  switch (tipo) {
    case 'Atividades Específicas': {
      const dados = {
        ...dadosBase,
        agrupador: texto(config, 'agrupador'),
        item: itemAtividades(config),
      } as BuildAtividadesEspecificasOptions;
      buildAtividadesEspecificas(dados, 1);
      return dados;
    }
    case 'Conteúdo Aplicado': {
      const dados = { ...dadosBase, tipoAssinatura: texto(config, 'tipoAssinatura', true) } as BuildConteudoAplicadoOptions;
      buildConteudoAplicado(dados, 1);
      return dados;
    }
    case 'Parecer Descritivo (Ficha de Acompanhamento)': {
      const dados = {
        ...dadosBase,
        finalidade: texto(config, 'finalidade', true),
        periodicidade: texto(config, 'periodicidade', true),
        tipoAssinatura: texto(config, 'tipoAssinatura', true),
      } as BuildParecerDescritivoOptions;
      buildParecerDescritivo(dados, 1);
      return dados;
    }
    case 'Planejamento': {
      const dados = {
        ...dadosBase,
        finalidade: texto(config, 'finalidade', true),
        periodicidade: texto(config, 'periodicidade', true),
        tipoRegistro: texto(config, 'tipoRegistro', true),
        tipoAssinatura: texto(config, 'tipoAssinatura', true),
      } as BuildPlanejamentoOptions;
      buildPlanejamento(dados, 1);
      return dados;
    }
  }
}

export function validarConfiguracaoCriacao(
  tipo: TipoRegistroPedagogicoTipo,
  conteudo: unknown,
): ConfiguracaoCriacaoTipoRegistroPedagogico['dados'] {
  if (!TIPOS_REGISTRO_PEDAGOGICO.includes(tipo)) throw new Error('O tipo do arquivo de criação não é válido.');
  return validarOpcoesCriacao(tipo, objetoJson(conteudo, 'A configuração de criação'));
}

export function validarConfiguracaoExclusao(
  tipoEsperado: TipoRegistroPedagogicoTipo,
  conteudo: unknown,
): ConfiguracaoExclusaoTipoRegistroPedagogico {
  const config = objetoJson(conteudo, 'A configuração de exclusão');
  if (config.excluirSomenteDescricoesConfiguradas !== true) {
    throw new Error('A exclusão só pode atingir a descrição exata informada no JSON.');
  }

  const tipo = texto(config, 'tipo', true);
  if (!TIPOS_REGISTRO_PEDAGOGICO.includes(tipo as TipoRegistroPedagogicoTipo)) {
    throw new Error('O campo "tipo" do alvo de exclusão não é válido.');
  }
  if (tipo !== tipoEsperado) {
    throw new Error(`O tipo do alvo (${tipo}) diverge do tipo do spec (${tipoEsperado}).`);
  }

  const descricao = texto(config, 'descricao', true) as string;
  if (!isTipoRegistroPedagogicoQAAuto(descricao)) {
    throw new Error('A descrição do alvo de exclusão deve começar com QAAUTO.');
  }
  if (!/\s1$/.test(descricao)) {
    throw new Error('A descrição do alvo deve corresponder à sequência exata 1 configurada para criação.');
  }
  if (descricao.length > 100) throw new Error('A descrição do alvo deve ter até 100 caracteres.');

  const valorTurma = turma(config);
  const valorAno = ano(config);
  const composicao = texto(config, 'composicao');
  const listaAnos = anosEscolares(config);
  const podeOmitirComposicao = valorTurma === 'AEE'
    || (tipo === 'Atividades Específicas' && valorTurma === 'Diversificada');
  if (!podeOmitirComposicao && !composicao) {
    throw new Error('Informe a composição exata para o alvo de exclusão.');
  }

  return {
    excluirSomenteDescricoesConfiguradas: true,
    descricao,
    tipo: tipo as TipoRegistroPedagogicoTipo,
    tipoTurma: valorTurma,
    ano: valorAno,
    ...(composicao ? { composicao } : {}),
    ...(listaAnos ? { anosEscolares: listaAnos } : {}),
  };
}

export function lerConfiguracaoCriacao(tipo: TipoRegistroPedagogicoTipo): ConfiguracaoCriacaoTipoRegistroPedagogico {
  return { tipo, dados: validarConfiguracaoCriacao(tipo, lerObjetoJson(nomeArquivo(tipo, 'criacao'))) };
}

export function lerConfiguracaoExclusao(tipo: TipoRegistroPedagogicoTipo): ConfiguracaoExclusaoTipoRegistroPedagogico {
  return validarConfiguracaoExclusao(tipo, lerObjetoJson(nomeArquivo(tipo, 'exclusao')));
}

export function validarUrlSandbox(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('A URL configurada deve ser uma URL válida do SANDBOX.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('A URL do sandbox deve usar HTTP ou HTTPS.');
  }
  return baseUrl;
}
