import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../../src/helpers';
import { criarTurmaEscolarizacao, excluirTurma, excluirTurmasEmLote } from '../../../../src/actions';
import { buildTurma } from '../../../../src/factories';

/**
 * Validação da Action Reutilizável: excluirTurma() e exclusão em lote.
 *
 * Suporta dois cenários principais:
 * 1. Ciclo de Vida E2E: Criação de Turma seguida de exclusão imediata (base limpa).
 * 2. Exclusão Dinâmica via JSON ('dados_exclusao_turma.json'):
 *    - Se "excluirTodasQAAUTO": true -> Remove em lote todas as turmas residuais de teste com "QAAUTO".
 *    - Se "excluirTodasQAAUTO": false -> Remove a turma específica indicada no JSON.
 */
test.describe('Validação da Action Reutilizável: excluirTurma()', () => {

  test('Deve criar uma turma e em seguida excluí-la com sucesso via interface gráfica', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Autenticação no SGE via UI
    await loginSge(page);

    // 2. Preparação de dados de turma para ciclo de vida
    const dadosTurma = buildTurma({
      situacaoDesejada: 'Ativo',
    });

    console.log(`\n▶️ [1/2] Criando turma de teste: "${dadosTurma.descricao}"...`);

    // 3. Criação da turma via Action UI
    const turmaCriada = await criarTurmaEscolarizacao(page, dadosTurma);

    expect(turmaCriada).toBeDefined();
    expect(turmaCriada.descricao).toBe(dadosTurma.descricao);

    console.log(`✅ Turma criada com sucesso (ID: ${turmaCriada.id})! Iniciando exclusão imediata para limpeza da base...`);

    // 4. Exclusão da turma recém-criada via Action UI
    const turmaExcluida = await excluirTurma(page, turmaCriada);

    // 5. Validações de conformidade
    expect(turmaExcluida).toBeDefined();
    expect(turmaExcluida.descricao).toContain('QAAUTO');

    console.log('\n======================================================');
    console.log('🗑️ TURMA EXCLUÍDA DO SGE COM SUCESSO:');
    console.log(`🏷️  Descrição: ${turmaExcluida.descricao}`);
    if (turmaExcluida.id) {
      console.log(`🔑 ID:        ${turmaExcluida.id}`);
    }
    console.log('======================================================\n');
  });

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
