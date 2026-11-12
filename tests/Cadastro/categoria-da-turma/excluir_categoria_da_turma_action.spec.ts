import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  excluirCategoriaDaTurma,
  excluirCategoriasDaTurmaEmLote,
} from '../../../src/actions';
import { loginSge } from '../../../src/helpers';

interface ConfiguracaoExclusaoCategoriaDaTurma {
  excluirTodasQAAUTO: boolean;
  termoGeral?: string;
  descricao?: string;
}

function lerConfiguracaoExclusao(): ConfiguracaoExclusaoCategoriaDaTurma {
  const caminho = path.resolve(__dirname, 'dados_exclusao_categoria_da_turma.json');
  const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf-8')) as unknown;
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error('dados_exclusao_categoria_da_turma.json deve conter um objeto JSON.');
  }

  const configuracao = conteudo as Partial<ConfiguracaoExclusaoCategoriaDaTurma>;
  if (typeof configuracao.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false no JSON.');
  }

  const termoGeral = configuracao.termoGeral?.trim() || 'QAAUTO';
  const descricao = configuracao.descricao?.trim() || '';
  if (configuracao.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A limpeza em lote está limitada ao termo "QAAUTO".');
  }
  if (!configuracao.excluirTodasQAAUTO && !descricao) {
    throw new Error('Informe "descricao" para excluir uma Categoria da Turma específica.');
  }

  return { excluirTodasQAAUTO: configuracao.excluirTodasQAAUTO, termoGeral, descricao };
}

test.describe('Exclusão de Categoria da Turma', () => {
  test('exclui as categorias definidas no JSON pela interface do SGE', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusao();
    test.setTimeout(600000);
    await loginSge(page);

    if (configuracao.excluirTodasQAAUTO) {
      console.log('\n🧹 Excluindo as Categorias da Turma que contêm "QAAUTO"...');
      const resultado = await excluirCategoriasDaTurmaEmLote(page, configuracao.termoGeral ?? 'QAAUTO');

      expect(resultado.categoriasExcluidas.every((descricao) => /QAAUTO/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Categorias da Turma excluídas: ${resultado.totalExcluidas}`);
    } else {
      const descricao = configuracao.descricao!;
      console.log(`\n🧹 Excluindo a Categoria da Turma "${descricao}"...`);
      const resultado = await excluirCategoriaDaTurma(page, descricao);

      expect(resultado.descricao).toBe(descricao);
      expect(resultado.url).toContain('homologa-sge.pontoid.com.br');
      console.log(`✅ Categoria da Turma excluída: "${resultado.descricao}"`);
    }
  });
});
