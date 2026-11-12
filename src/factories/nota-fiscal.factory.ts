export interface NotaFiscalOpcoes {
  fornecedor: string;
  cnpjFornecedor: string;
  unidade: string;
  serie: string;
  numeroInicial?: string;
  dataEmissao?: string;
  valor?: string;
  numeroContrato?: string;
}

export interface NotaFiscalMontada extends NotaFiscalOpcoes {
  numero: string;
  chaveAcesso: string;
  dataEmissao: string;
  dataCadastro: string;
  numeroContrato: string;
  valor: string;
}

export const isNotaFiscalQAAuto = (texto: string): boolean => /^QAAUTO(?:\s|$)/.test(texto);
export const hojeNotaFiscal = (): string => new Intl.DateTimeFormat('pt-BR', {timeZone: 'America/Sao_Paulo'}).format(new Date());

export function numeroInicialNotaFiscal(opcoes: NotaFiscalOpcoes): number {
  const numero = Number(opcoes.numeroInicial?.trim() || '1');
  if (!Number.isInteger(numero) || numero < 1 || numero > 999999999) throw new Error('numeroInicial deve ser inteiro positivo de até 9 dígitos.');
  return numero;
}

export function gerarChaveAcesso(cnpj: string, serie: string, numero: string, emissao: string): string {
  const digitos = cnpj.replace(/\D/g, '');
  if (!/^\d{14}$/.test(digitos)) throw new Error('CNPJ do fornecedor deve conter 14 dígitos.');
  if (!/^\d{1,3}$/.test(serie)) throw new Error('Série deve conter de 1 a 3 dígitos.');
  if (!/^[1-9]\d{0,8}$/.test(numero)) throw new Error('Número deve ser positivo, com até 9 dígitos.');
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(emissao)) throw new Error('Data de emissão deve usar DD/MM/AAAA.');
  const [dia, mes, ano] = emissao.split('/').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) throw new Error('Data de emissão inválida.');
  const base = `52${String(ano).slice(-2)}${String(mes).padStart(2, '0')}${digitos}55${serie.padStart(3, '0')}${numero.padStart(9, '0')}1${String(Number(numero) % 100000000).padStart(8, '0')}`;
  let soma = 0;
  for (let i = 42, peso = 2; i >= 0; i--, peso = peso === 9 ? 2 : peso + 1) soma += Number(base[i]) * peso;
  const resto = soma % 11;
  return base + (resto < 2 ? 0 : 11 - resto);
}

export function buildNotaFiscal(opcoes: NotaFiscalOpcoes, sequencia = numeroInicialNotaFiscal(opcoes)): NotaFiscalMontada {
  for (const campo of ['fornecedor', 'cnpjFornecedor', 'unidade', 'serie'] as const) {
    if (typeof opcoes[campo] !== 'string' || !opcoes[campo].trim()) throw new Error(`Informe ${campo} no JSON de criação.`);
  }
  if (!isNotaFiscalQAAuto(opcoes.fornecedor)) throw new Error('Fornecedor deve ter prefixo QAAUTO.');
  if (!opcoes.unidade?.trim()) throw new Error('Informe a unidade de apoio.');
  const numero = String(sequencia);
  const dataEmissao = opcoes.dataEmissao?.trim() || hojeNotaFiscal();
  const numeroContrato = `${opcoes.numeroContrato?.trim() || 'QAAUTO NF'} ${numero}`;
  if (!isNotaFiscalQAAuto(numeroContrato) || numeroContrato.length > 20) throw new Error('Nº Contrato deve começar com QAAUTO e ter até 20 caracteres incluindo a sequência.');
  const valor = opcoes.valor?.trim() || '0,00';
  if (valor !== '0,00') throw new Error('Este cenário sem itens aceita somente valor 0,00, calculado pelo SGE.');
  return {...opcoes, numero, dataEmissao, dataCadastro: hojeNotaFiscal(), numeroContrato, valor, chaveAcesso: gerarChaveAcesso(opcoes.cnpjFornecedor, opcoes.serie, numero, dataEmissao)};
}

export function protegerExclusaoNotaFiscal(nota: NotaFiscalMontada): void {
  if (nota.chaveAcesso === '52261189379821000194559000000000011000000018' || (nota.numero === '1' && nota.serie === '900' && nota.fornecedor === 'QAAUTO Fornecedor Pessoa Jurídica 1')) throw new Error('Exclusão recusada: nota preexistente protegida (1/900).');
  if (!isNotaFiscalQAAuto(nota.fornecedor) || !/^QAAUTO [0-9A-F]{12}$/.test(nota.numeroContrato)) throw new Error('Exclusão exige fornecedor QAAUTO e identificador único da execução em Nº Contrato.');
  if (gerarChaveAcesso(nota.cnpjFornecedor, nota.serie, nota.numero, nota.dataEmissao) !== nota.chaveAcesso) throw new Error('Identificação da nota incoerente com a chave de acesso.');
}
