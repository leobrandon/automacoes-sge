import { fakeData } from '../helpers/generators/fake-data';

export const TIPOS_COMPONENTE = [
  'Componente Curricular',
  'Campo de Experiência (Eixo)',
  'Módulo/Unidade Curricular',
] as const;

export const COMPONENTES_EDUCACENSO = [
  'Arte (Educação Artística, Teatro, Dança, Música, Artes Plásticas e outras)',
  'Educação Física',
  'Libras',
  'Língua indígena',
  'Língua Portuguesa como Segunda Língua',
  'Língua/Literatura estrangeira - Espanhol',
  'Língua/Literatura estrangeira - Francês',
  'Língua/Literatura estrangeira - Inglês',
  'Língua/Literatura estrangeira - outra',
  'Língua/Literatura Portuguesa',
  'Ciências',
  'Física',
  'Química',
  'Filosofia',
  'Geografia',
  'História',
  'Sociologia',
] as const;

export type TipoComponente = typeof TIPOS_COMPONENTE[number];
export type ComponenteEducacenso = typeof COMPONENTES_EDUCACENSO[number];

export interface ComponenteData {
  nome: string;
  abreviacao: string;
  codigo: string;
  tipo: TipoComponente;
  componenteCurricularEducacenso: ComponenteEducacenso;
}

export type BuildComponenteOptions = Partial<ComponenteData>;

function sufixar(valor: string, sequencia: number): string {
  return `${valor.trim()}${sequencia}`;
}

function validarOpcao<T extends string>(
  valor: string | undefined,
  opcoes: readonly T[],
  campo: string,
  padrao: T,
): T {
  if (!valor?.trim()) return padrao;
  if (!opcoes.includes(valor as T)) {
    throw new Error(`Valor "${valor}" inválido para "${campo}". Opções: ${opcoes.join(', ')}.`);
  }
  return valor as T;
}

/** Gera um componente curricular QAAUTO com os campos obrigatórios da tela. */
export function buildComponente(options: BuildComponenteOptions = {}, sequencia = 1): ComponenteData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Componente deve ser um inteiro positivo.');
  }

  const nomeBase = options.nome?.trim()
    || 'QAAUTO - Componente de Arte e Cultura';
  if (!/^QAAUTO\b/i.test(nomeBase)) {
    throw new Error('O nome do Componente deve começar com "QAAUTO".');
  }

  const nome = `${nomeBase} ${sequencia}`;
  const abreviacao = options.abreviacao?.trim()
    ? sufixar(options.abreviacao, sequencia)
    : `QA${fakeData.faker.string.alphanumeric(6).toUpperCase()}`;
  const codigo = options.codigo?.trim()
    ? sufixar(options.codigo, sequencia)
    : fakeData.faker.string.numeric(8);
  const tipo = validarOpcao(options.tipo, TIPOS_COMPONENTE, 'tipo', 'Componente Curricular');
  const componenteCurricularEducacenso = validarOpcao(
    options.componenteCurricularEducacenso,
    COMPONENTES_EDUCACENSO,
    'componenteCurricularEducacenso',
    COMPONENTES_EDUCACENSO[0],
  );

  if (nome.length > 128) throw new Error('O Nome do Componente deve ter até 128 caracteres.');
  if (abreviacao.length > 10) throw new Error('A Abreviação do Componente deve ter até 10 caracteres.');
  if (codigo.length > 10) throw new Error('O Código do Componente deve ter até 10 caracteres.');

  return { nome, abreviacao, codigo, tipo, componenteCurricularEducacenso };
}

/** A automação só aceita registros cujo nome comece com o marcador QAAUTO. */
export function isComponenteQAAuto(nome: string): boolean {
  return /^QAAUTO\b/i.test(nome.trim());
}
