import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../../src/helpers';
import { excluirTurma, excluirTurmasEmLote } from '../../../../src/actions';

/**
 * Validação da Action Reutilizável: excluirTurma() e exclusão em lote.
 *
 * Exclui as turmas do tenant configurado no .env conforme 'dados_exclusao_turma.json':
 *  - "excluirTodasQAAUTO": true  -> remove em lote todas as turmas cuja descrição começa com o termo (padrão "QAAUTO").
 *  - "excluirTodasQAAUTO": false -> remove a turma específica indicada em "descricao" ou "id".
 */
test.describe('Validação da Action Reutilizável: excluirTurma()', () => {

  test('Executar exclusão configurada via arquivo dados_exclusao_turma.json', async ({ page }) => {
    test.setTimeout(300000); // 5 minutos para suportar lote extenso de turmas

    // 1. Autenticação no SGE via UI
    await loginSge(page);

    // 2. Leitura do arquivo dados_exclusao_turma.json
    const caminhoJson = path.resolve(__dirname, 'dados_exclusao_turma.json');
    let configExclusao = {
      excluirTodasQAAUTO: true,
      termoGeral: 'QAAUTO',
      descricao: '',
      id: '',
    };

    if (fs.existsSync(caminhoJson)) {
      try {
        const conteudo = fs.readFileSync(caminhoJson, 'utf-8');
        configExclusao = { ...configExclusao, ...JSON.parse(conteudo) };
      } catch {
        console.warn('⚠️ Não foi possível ler dados_exclusao_turma.json, aplicando padrão de limpeza QAAUTO.');
      }
    }

    // 3. Execução condicional conforme o JSON
    if (configExclusao.excluirTodasQAAUTO) {
      const termo = configExclusao.termoGeral || 'QAAUTO';
      console.log(`\n🧹 Iniciando limpeza em lote de todas as turmas com termo "${termo}"...`);

      const resultado = await excluirTurmasEmLote(page, termo);

      expect(resultado).toBeDefined();
      console.log(`\n======================================================`);
      console.log(`✅ LIMPEZA DE TURMAS CONCLUÍDA COM SUCESSO:`);
      console.log(`🗑️ Total de turmas excluídas: ${resultado.totalExcluidas}`);
      if (resultado.falhas && resultado.falhas.length > 0) {
        console.log(`⚠️ Turmas mantidas (com impedimento): ${resultado.falhas.length}`);
        resultado.falhas.forEach((f, idx) => {
          console.log(`   ${idx + 1}. "${f.descricao}": ${f.motivo}`);
        });
      }
      console.log('======================================================\n');
    } else {
      const descricaoOuId = configExclusao.descricao || configExclusao.id;
      if (!descricaoOuId) {
        throw new Error('⚠️ Configure "descricao" ou "id" em dados_exclusao_turma.json, ou ative "excluirTodasQAAUTO": true.');
      }

      console.log(`\n▶️ Excluindo turma específica configurada no JSON: "${descricaoOuId}"...`);
      const turmaExcluida = await excluirTurma(page, {
        descricao: configExclusao.descricao || undefined,
        id: configExclusao.id || undefined,
      });

      expect(turmaExcluida).toBeDefined();
      console.log(`✅ Turma "${turmaExcluida.descricao}" excluída com sucesso!`);
    }
  });

});
