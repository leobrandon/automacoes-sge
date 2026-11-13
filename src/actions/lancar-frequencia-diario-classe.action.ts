import { expect, type Page } from '@playwright/test';
import { abrirDiarioDeClasse, celulaFrequencia, gerarDiarioClasse } from '../helpers/navigation/diario-classe.navigation';

export interface LancamentoFrequenciaDados {
  /** Descrição da turma existente, com alunos cursando. */
  turma: string;
  /** Alunos (como exibidos na grade) que alternam presença e falta. */
  alunos: string[];
  /** Quantos dias antes de hoje começa o diário. Padrão: 30. */
  diasAtras?: number;
  /** Quantos dias letivos, a partir do início do diário, recebem lançamento. Padrão: 3. */
  quantidadeDias?: number;
}

export interface FrequenciaLancada {
  data: string;
  aluno: string;
  presente: boolean;
}

const formatar = (d: Date): string => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const paraDate = (br: string): Date => { const [d, m, a] = br.split('/').map(Number); return new Date(a, m - 1, d); };

/** Texto da célula: "P1" (presença) ou "F1" (falta), com espaços ao redor. */
const textoCelula = (presente: boolean): RegExp => (presente ? /^\s*P\d*\s*$/ : /^\s*F\d*\s*$/);

/** Presença do aluno `indiceAluno` no dia `indiceDia`: o primeiro começa com falta e a cada dia/aluno inverte. */
export function presencaPrevista(indiceDia: number, indiceAluno: number): boolean {
  return (indiceDia + indiceAluno) % 2 === 1;
}

/**
 * Gera o Diário de Classe de `diasAtras` dias até hoje e lança presença/falta, alternando entre os alunos,
 * nos primeiros `quantidadeDias` dias letivos. Confirma na grade (inclusive após gerar de novo).
 */
export async function lancarFrequenciaDiarioClasse(page: Page, dados: LancamentoFrequenciaDados): Promise<FrequenciaLancada[]> {
  const turma = dados.turma?.trim();
  if (!turma) throw new Error('Informe a turma nos dados da frequência.');
  if (!Array.isArray(dados.alunos) || !dados.alunos.length || dados.alunos.some((a) => typeof a !== 'string' || !a.trim()) || new Set(dados.alunos).size !== dados.alunos.length) {
    throw new Error('Informe alunos como lista não vazia, sem repetidos, nos dados da frequência.');
  }
  const diasAtras = dados.diasAtras || 30;
  const quantidadeDias = dados.quantidadeDias || 3;
  for (const [nome, valor] of [['diasAtras', diasAtras], ['quantidadeDias', quantidadeDias]] as const) {
    if (!Number.isInteger(valor) || valor < 1) throw new Error(`${nome} deve ser um inteiro maior que zero.`);
  }

  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diasAtras);
  const dataInicial = formatar(inicio);
  const dataFinal = formatar(hoje);

  await abrirDiarioDeClasse(page, turma);
  const letivos = await gerarDiarioClasse(page, dataInicial, dataFinal);
  const dias = letivos.filter((d) => paraDate(d) <= hoje).slice(0, quantidadeDias);
  if (dias.length < quantidadeDias) {
    throw new Error(`Só há ${dias.length} dia(s) letivo(s) entre ${dataInicial} e ${dataFinal}; ${quantidadeDias} solicitado(s). Datas: ${letivos.join(', ') || 'nenhuma'}.`);
  }
  for (const aluno of dados.alunos) {
    await expect(celulaFrequencia(page, aluno, dias[0]), `Aluno "${aluno}" não está na grade da turma ${turma}.`).toHaveCount(1);
  }

  const lancadas: FrequenciaLancada[] = [];
  for (const [i, data] of dias.entries()) {
    for (const [j, aluno] of dados.alunos.entries()) {
      const presente = presencaPrevista(i, j);
      lancadas.push({ data, aluno, presente });
      const celula = celulaFrequencia(page, aluno, data);
      const esperado = textoCelula(presente);
      if (esperado.test(await celula.innerText())) continue;

      await celula.click();
      const modal = page.locator('.modal:visible').filter({ hasText: `Ajuste de Frequência - ${data}` });
      await expect(modal).toBeVisible();
      await expect(modal.locator('#ajusteFrequenciaDescricaoAluno')).toHaveValue(aluno);
      const marcado = modal.locator('#frequencia');
      if ((await marcado.isChecked()) !== presente) await modal.locator('.toggle').first().click();
      await expect(marcado).toBeChecked({ checked: presente });
      await modal.locator('#btnSalvarFrequencia').click();
      await expect(page.getByText('Ajuste realizado com sucesso.')).toBeVisible();
      await expect(modal).toBeHidden();
      await expect(celula).toHaveText(esperado);
    }
  }

  // Persistência: gera de novo e confere cada célula.
  await gerarDiarioClasse(page, dataInicial, dataFinal);
  for (const l of lancadas) {
    await expect(celulaFrequencia(page, l.aluno, l.data), `${l.aluno} em ${l.data}`).toHaveText(textoCelula(l.presente));
  }
  return lancadas;
}
