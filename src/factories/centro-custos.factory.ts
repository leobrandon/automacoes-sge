const LIMITE_DESCRICAO = 500;

export const SITUACOES_CUSTO = ['Provisório', 'Definitivo'] as const;
export const TIPOS_CUSTO = ['Custeio', 'Investimento', 'Folha de pagamento'] as const;
// "Suplementar" exige escolher o orçamento a suplementar: fora do escopo desta automação.
export const TIPOS_ORCAMENTO = ['Anual', 'Mensal', 'Extraordinário'] as const;

export function isCentroCustosQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}

/** Data de hoje no fuso do SGE: `DD/MM/AAAA`, competência `MM/AAAA` e ano. */
function hoje(): {data: string; competencia: string; ano: string} {
  const data = new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric'}).format(new Date());
  const [, mes, ano] = data.split('/');
  return {data, competencia: `${mes}/${ano}`, ano};
}

function descricaoQAAuto(base: string | undefined, padrao: string, sequencia: number): string {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) throw new Error('A sequência deve ser um inteiro positivo.');
  const b = base?.trim() || padrao;
  if (!isCentroCustosQAAuto(b)) throw new Error(`A descrição deve começar com QAAUTO: "${b}".`);
  const descricao = `${b} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) throw new Error(`A descrição deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  return descricao;
}

/** Aceita "1000,00" ou "1.000,00" e devolve como o campo exibe ("1.000,00"). */
export function formatarValorSge(valor: string, campo: string): string {
  const v = valor.trim();
  if (!/^(\d{1,3}(\.\d{3})*|\d+),\d{2}$/.test(v)) throw new Error(`${campo} deve estar no formato 1.234,56 (recebido "${valor}").`);
  const centavos = Number(v.replace(/\D/g, ''));
  if (!Number.isSafeInteger(centavos) || centavos <= 0) throw new Error(`${campo} deve ser maior que zero.`);
  return (centavos / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function competencia(valor: string, campo: string): string {
  if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(valor)) throw new Error(`${campo} deve estar no formato MM/AAAA (recebido "${valor}").`);
  return valor;
}

const chaveCompetencia = (c: string) => Number(c.slice(3) + c.slice(0, 2));

function opcao<T extends readonly string[]>(valor: string, opcoes: T, campo: string): T[number] {
  if (!opcoes.includes(valor)) throw new Error(`${campo} deve ser um de: ${opcoes.join(', ')} (recebido "${valor}").`);
  return valor as T[number];
}

function obrigatorio(valor: string | undefined, campo: string, dica: string): string {
  const v = valor?.trim();
  if (!v) throw new Error(`Informe "${campo}" nos dados (${dica}).`);
  return v;
}

// ---------------------------------------------------------------- Lançamento de Custo

export interface CustoDados {
  descricao: string;
  /** "Provisório" ou "Definitivo". */
  situacao: string;
  /** Destinatário/Unidade exatamente como no select (ex.: "ESCOLA MUNICIPAL CULTURA"). Dado de apoio do tenant. */
  destinatario: string;
  /** Categoria cadastrada no tenant (dado de apoio). */
  categoria: string;
  /** Opcional: vazio não seleciona. */
  subcategoria: string;
  tipoCusto: string;
  /** Opcional: orçamento vinculado (lista depende do destinatário). */
  orcamento: string;
  valor: string;
  dataLancamento: string;
  competencia: string;
}

export type CustoOpcoes = Partial<CustoDados>;
export interface CustoMontado extends CustoDados {
  sequencia: number;
}

/** Descrição `QAAUTO <base> <sequência>`; vazios recebem padrão (data de hoje, competência do mês atual). */
export function buildCusto(o: CustoOpcoes = {}, sequencia = 1): CustoMontado {
  const h = hoje();
  const dataLancamento = o.dataLancamento?.trim() || h.data;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataLancamento)) throw new Error(`dataLancamento deve estar no formato DD/MM/AAAA (recebido "${dataLancamento}").`);
  return {
    descricao: descricaoQAAuto(o.descricao, 'QAAUTO Lancamento de Custo', sequencia),
    situacao: opcao(o.situacao?.trim() || 'Provisório', SITUACOES_CUSTO, 'situacao'),
    destinatario: obrigatorio(o.destinatario, 'destinatario', 'unidade cadastrada no tenant'),
    categoria: obrigatorio(o.categoria, 'categoria', 'categoria cadastrada no tenant'),
    subcategoria: o.subcategoria?.trim() || '',
    tipoCusto: opcao(o.tipoCusto?.trim() || 'Custeio', TIPOS_CUSTO, 'tipoCusto'),
    orcamento: o.orcamento?.trim() || '',
    valor: formatarValorSge(o.valor?.trim() || '123,45', 'valor'),
    dataLancamento,
    competencia: competencia(o.competencia?.trim() || dataLancamento.slice(3), 'competencia'),
    sequencia,
  };
}

// ---------------------------------------------------------------- Orçamento (Previsão Orçamentária)

export interface OrcamentoDados {
  descricao: string;
  exercicio: string;
  /** Opcional. */
  codigo: string;
  competenciaInicial: string;
  competenciaFinal: string;
  tipo: string;
  /** Opcional: programa financeiro cadastrado no tenant. */
  programaFinanceiro: string;
  /** Destinatário/Unidade exatamente como no select (ex.: "Secretaria de Educação"). */
  destinatario: string;
  valorPrevisto: string;
}

export type OrcamentoOpcoes = Partial<OrcamentoDados>;
export interface OrcamentoMontado extends OrcamentoDados {
  sequencia: number;
}

/** Padrão: exercício do ano atual, competências 01 a 12 desse ano, tipo Anual. */
export function buildOrcamento(o: OrcamentoOpcoes = {}, sequencia = 1): OrcamentoMontado {
  const exercicio = o.exercicio?.trim() || hoje().ano;
  if (!/^\d{4}$/.test(exercicio)) throw new Error(`exercicio deve ter 4 dígitos (recebido "${exercicio}").`);
  const competenciaInicial = competencia(o.competenciaInicial?.trim() || `01/${exercicio}`, 'competenciaInicial');
  const competenciaFinal = competencia(o.competenciaFinal?.trim() || `12/${exercicio}`, 'competenciaFinal');
  if (chaveCompetencia(competenciaInicial) > chaveCompetencia(competenciaFinal)) {
    throw new Error(`competenciaInicial (${competenciaInicial}) não pode ser posterior à competenciaFinal (${competenciaFinal}).`);
  }
  return {
    descricao: descricaoQAAuto(o.descricao, 'QAAUTO Orcamento', sequencia),
    exercicio,
    codigo: o.codigo?.trim() || '',
    competenciaInicial,
    competenciaFinal,
    tipo: opcao(o.tipo?.trim() || 'Anual', TIPOS_ORCAMENTO, 'tipo'),
    programaFinanceiro: o.programaFinanceiro?.trim() || '',
    destinatario: obrigatorio(o.destinatario, 'destinatario', 'unidade cadastrada no tenant'),
    valorPrevisto: formatarValorSge(o.valorPrevisto?.trim() || '1.000,00', 'valorPrevisto'),
    sequencia,
  };
}

// ---------------------------------------------------------------- Lançamento de Receita

export const ORIGENS_RECURSO = ['Repasse regular', 'Saldo de exercício anterior', 'Rendimento de aplicações'] as const;
const LIMITE_OBSERVACAO = 2000;

export interface ReceitaDados {
  descricao: string;
  dataRecebimento: string;
  /** Destino exatamente como no select (ex.: "ESCOLA MUNICIPAL CULTURA"). Dado de apoio do tenant. */
  destino: string;
  /** Opcional: programa financeiro cadastrado no tenant. */
  programaFinanceiro: string;
  /** Opcional: categoria cadastrada no tenant. */
  categoria: string;
  /** Opcional: depende da categoria. */
  subcategoria: string;
  origemRecurso: string;
  valor: string;
  /** Opcional. */
  observacao: string;
}

export type ReceitaOpcoes = Partial<ReceitaDados>;
export interface ReceitaMontada extends ReceitaDados {
  sequencia: number;
}

/** Descrição `QAAUTO <base> <sequência>`; vazios recebem padrão (recebimento hoje, origem "Repasse regular"). */
export function buildReceita(o: ReceitaOpcoes = {}, sequencia = 1): ReceitaMontada {
  const dataRecebimento = o.dataRecebimento?.trim() || hoje().data;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataRecebimento)) throw new Error(`dataRecebimento deve estar no formato DD/MM/AAAA (recebido "${dataRecebimento}").`);
  const observacao = o.observacao?.trim() || '';
  if (observacao.length > LIMITE_OBSERVACAO) throw new Error(`A observação deve ter até ${LIMITE_OBSERVACAO} caracteres.`);
  const categoria = o.categoria?.trim() || '';
  const subcategoria = o.subcategoria?.trim() || '';
  if (subcategoria && !categoria) throw new Error('Informe "categoria" para usar "subcategoria".');
  return {
    descricao: descricaoQAAuto(o.descricao, 'QAAUTO Lancamento de Receita', sequencia),
    dataRecebimento,
    destino: obrigatorio(o.destino, 'destino', 'unidade cadastrada no tenant'),
    programaFinanceiro: o.programaFinanceiro?.trim() || '',
    categoria,
    subcategoria,
    origemRecurso: opcao(o.origemRecurso?.trim() || 'Repasse regular', ORIGENS_RECURSO, 'origemRecurso'),
    valor: formatarValorSge(o.valor?.trim() || '123,45', 'valor'),
    observacao,
    sequencia,
  };
}
