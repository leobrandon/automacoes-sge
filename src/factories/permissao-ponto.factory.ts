const LIMITE_DESCRICAO = 100;

export interface PermissaoPontoData {
  descricao: string;
  acessoPreFolha: boolean;
  /** Só habilita com `acessoPreFolha`. */
  inserirJustificativaPreFolha: boolean;
  /** Só habilita com `acessoPreFolha`. */
  permitirRegistroManual: boolean;
  registrarPontoViaAplicativo: boolean;
  /** Só habilita com `registrarPontoViaAplicativo`. */
  permitirRegistrarForaDoRaio: boolean;
  sequencia: number;
}

export type BuildPermissaoPontoOptions = Partial<Omit<PermissaoPontoData, 'sequencia'>>;

/** Descrição `QAAUTO <base> <sequência>`; os parâmetros iniciam desligados, como na tela. */
export function buildPermissaoPonto(options: BuildPermissaoPontoOptions = {}, sequencia = 1): PermissaoPontoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Permissão de Ponto deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Permissao Ponto';
  if (!isPermissaoPontoQAAuto(base)) {
    throw new Error('A descrição de Permissão de Ponto deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Permissão de Ponto deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const dados: PermissaoPontoData = {
    descricao,
    acessoPreFolha: options.acessoPreFolha ?? false,
    inserirJustificativaPreFolha: options.inserirJustificativaPreFolha ?? false,
    permitirRegistroManual: options.permitirRegistroManual ?? false,
    registrarPontoViaAplicativo: options.registrarPontoViaAplicativo ?? false,
    permitirRegistrarForaDoRaio: options.permitirRegistrarForaDoRaio ?? false,
    sequencia,
  };

  if (!dados.acessoPreFolha && (dados.inserirJustificativaPreFolha || dados.permitirRegistroManual)) {
    throw new Error('"inserirJustificativaPreFolha" e "permitirRegistroManual" exigem "acessoPreFolha": true.');
  }
  if (!dados.registrarPontoViaAplicativo && dados.permitirRegistrarForaDoRaio) {
    throw new Error('"permitirRegistrarForaDoRaio" exige "registrarPontoViaAplicativo": true.');
  }
  return dados;
}

export function isPermissaoPontoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
