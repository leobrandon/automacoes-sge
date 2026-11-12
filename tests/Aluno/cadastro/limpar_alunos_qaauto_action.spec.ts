import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { excluirAluno, excluirAlunosEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';

interface ConfiguracaoExclusaoAluno {
  excluirTodasQAAUTO: boolean;
  termoGeral?: string;
  nome?: string;
  matricula?: string;
}

function lerConfiguracao(): ConfiguracaoExclusaoAluno {
  const caminho = path.resolve(__dirname, 'dados_exclusao_aluno.json');
  const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf-8')) as unknown;
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error('dados_exclusao_aluno.json deve conter um objeto JSON.');
  }
  const configuracao = conteudo as ConfiguracaoExclusaoAluno;
  if (typeof configuracao.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_aluno.json.');
  }
  return configuracao;
}

test.describe('Exclusão de Aluno', () => {
  test('exclui os alunos QAAUTO (lote) ou o aluno definido no JSON pela interface do SGE', async ({ page }) => {
    test.setTimeout(30 * 60 * 1000);
    const configuracao = lerConfiguracao();

    await loginSge(page);

    if (configuracao.excluirTodasQAAUTO) {
      const termo = configuracao.termoGeral?.trim() || 'QA';
      const resultado = await excluirAlunosEmLote(page, termo);

      console.log(`\n✅ Alunos excluídos: ${resultado.totalExcluidos}`);
      resultado.alunosExcluidos.forEach((nome, indice) => console.log(`   ${indice + 1}. ${nome}`));
      resultado.falhas.forEach((falha) => console.log(`⚠️ Mantido: "${falha.nome}": ${falha.motivo}`));

      expect(resultado.falhas, 'Alunos QAAUTO que não puderam ser excluídos').toEqual([]);
      return;
    }

    const nome = configuracao.nome?.trim();
    const matricula = configuracao.matricula?.trim();
    if (!nome && !matricula) {
      throw new Error('Defina "nome" ou "matricula" em dados_exclusao_aluno.json, ou use "excluirTodasQAAUTO": true.');
    }
    const excluido = await excluirAluno(page, { nome: nome ?? '', matricula: matricula || undefined });
    console.log(`✅ Aluno excluído: ${excluido.nome} (matrícula ${excluido.matricula ?? 'N/A'})`);
  });
});
