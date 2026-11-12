import { fakeData } from '../helpers/generators/fake-data';

export const OPCOES_SIM_NAO_ANO_ESCOLAR = ['Sim', 'Não'] as const;
export const TIPOS_IDADE_ANO_ESCOLAR = ['Meses', 'Anos'] as const;

export type OpcaoSimNaoAnoEscolar = typeof OPCOES_SIM_NAO_ANO_ESCOLAR[number];
export type TipoIdadeAnoEscolar = typeof TIPOS_IDADE_ANO_ESCOLAR[number] | '';

export interface AnoEscolarData {
  nome: string;
  codigoTurma: string;
  codigoExterno: string;
  nomeCorrespondenteLei9394_96: string;
  composicaoEnsino: string;
  etapaEnsino: string;
  idadeMinima: string;
  tipoIdade: TipoIdadeAnoEscolar;
  dataCompletaAte: string;
  tituloHistorico: string;
  equivalenciaHistorico: string;
  ativo: OpcaoSimNaoAnoEscolar;
  conclusaoEtapa: OpcaoSimNaoAnoEscolar;
  utilizaImpressaoCertificado: OpcaoSimNaoAnoEscolar;
}

export type BuildAnoEscolarOptions = Partial<AnoEscolarData>;

function texto(valor: string | undefined, padrao = ''): string {
  return valor?.trim() || padrao;
}

function nomeDaEtapa(etapaEnsino: string): string {
  const anoOrdinal = etapaEnsino.match(/\b(\d{1,2})\s*[º°]\s*ano\b/i);
  if (anoOrdinal) return `${anoOrdinal[1]}º Ano`;

  const descricao = etapaEnsino.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
  const partes = descricao.split(/\s+-\s+/);
  return partes[partes.length - 1]?.trim() || 'Ano Escolar';
}

function validarOpcao<T extends string>(
  valor: string | undefined,
  opcoes: readonly T[],
  campo: string,
  padrao: T,
): T {
  const escolhido = valor?.trim();
  if (!escolhido) return padrao;
  if (!opcoes.includes(escolhido as T)) {
    throw new Error(`Valor "${escolhido}" inválido para "${campo}". Opções: ${opcoes.join(', ')}.`);
  }
  return escolhido as T;
}

export function buildAnoEscolar(
  options: BuildAnoEscolarOptions = {},
  sequencia = 1,
): AnoEscolarData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Ano Escolar deve ser um inteiro positivo.');
  }

  const codigoTurma = options.codigoTurma?.trim() || fakeData.faker.string.numeric(5);
  const codigoExterno = texto(options.codigoExterno);
  const nomeCorrespondenteLei9394_96 = texto(options.nomeCorrespondenteLei9394_96);
  const composicaoEnsino = texto(options.composicaoEnsino, 'FUNDAMENTAL ANOS INICIAIS');
  const etapaEnsino = texto(options.etapaEnsino, 'Ensino fundamental de 9 anos - 1º ano [14]');
  const nomeBase = texto(options.nome, `QAAUTO - ${nomeDaEtapa(etapaEnsino)}`);
  if (!/^QAAUTO\b/i.test(nomeBase)) {
    throw new Error('O nome do Ano Escolar deve começar com "QAAUTO".');
  }
  const nome = `${nomeBase} ${sequencia}`;
  const idadeMinima = texto(options.idadeMinima);
  const tipoIdade = validarOpcao<TipoIdadeAnoEscolar>(
    options.tipoIdade,
    ['', ...TIPOS_IDADE_ANO_ESCOLAR],
    'tipoIdade',
    '',
  );
  const dataCompletaAte = texto(options.dataCompletaAte);
  const tituloHistorico = texto(options.tituloHistorico);
  const equivalenciaHistorico = texto(options.equivalenciaHistorico);
  const ativo = validarOpcao<OpcaoSimNaoAnoEscolar>(
    options.ativo,
    OPCOES_SIM_NAO_ANO_ESCOLAR,
    'ativo',
    'Sim',
  );
  const conclusaoEtapa = validarOpcao<OpcaoSimNaoAnoEscolar>(
    options.conclusaoEtapa,
    OPCOES_SIM_NAO_ANO_ESCOLAR,
    'conclusaoEtapa',
    'Não',
  );
  const utilizaImpressaoCertificado = validarOpcao<OpcaoSimNaoAnoEscolar>(
    options.utilizaImpressaoCertificado,
    OPCOES_SIM_NAO_ANO_ESCOLAR,
    'utilizaImpressaoCertificado',
    'Não',
  );

  if (nome.length > 128) throw new Error('O Nome do Ano Escolar deve ter até 128 caracteres.');
  if (codigoTurma.length > 5) throw new Error('O Código para Turma deve ter até 5 caracteres.');
  if (!/^[a-z0-9]+$/i.test(codigoTurma)) throw new Error('O Código para Turma deve ser alfanumérico.');
  if (codigoExterno.length > 10 || (codigoExterno && !/^\d+$/.test(codigoExterno))) {
    throw new Error('O Código Externo deve conter somente números e ter até 10 caracteres.');
  }
  if (nomeCorrespondenteLei9394_96.length > 128) {
    throw new Error('O nome correspondente à Lei 9.394/96 deve ter até 128 caracteres.');
  }
  if (!composicaoEnsino || !etapaEnsino) {
    throw new Error('Composição de Ensino e Etapa de Ensino são obrigatórias.');
  }
  if (idadeMinima && !/^\d+$/.test(idadeMinima)) throw new Error('A Idade Mínima deve conter somente números.');
  if (tituloHistorico.length > 100) throw new Error('O Título para Histórico Escolar deve ter até 100 caracteres.');

  return {
    nome,
    codigoTurma,
    codigoExterno,
    nomeCorrespondenteLei9394_96,
    composicaoEnsino,
    etapaEnsino,
    idadeMinima,
    tipoIdade,
    dataCompletaAte,
    tituloHistorico,
    equivalenciaHistorico,
    ativo,
    conclusaoEtapa,
    utilizaImpressaoCertificado,
  };
}

export function isAnoEscolarQAAuto(nome: string): boolean {
  return /^QAAUTO\b/i.test(nome.trim());
}
