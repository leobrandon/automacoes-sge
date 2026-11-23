import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../../src/helpers/navigation/common.navigation';
import { excluirMotivoAlteracao, excluirMotivosAlteracaoEmLote } from '../../../../src/actions/excluir-motivo-alteracao.action';

/**
 * Validação da Action Reutilizável: excluirMotivoAlteracao() e exclusão em lote.
 *
 * Suporta dois cenários principais via arquivo 'dados_exclusao_motivo_alteracao.json':
 * 1. Limpeza em lote de automações anteriores:
 *    - Se "excluirTodasQAAUTO": true -> Remove em lote todos os motivos residuais com prefixo "QAAUTO" gerados pela automação de criação.
 * 2. Exclusão específica:
 *    - Se "excluirTodasQAAUTO": false -> Remove o motivo específico informado no campo "descricao".
 */
test.describe('Validação da Action Reutilizável: excluirMotivoAlteracao()', () => {

  test('Executar exclusão configurada via arquivo dados_exclusao_motivo_alteracao.json', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos para suportar lote
    await loginSge(page);

    // 1. Leitura do arquivo de configuração de exclusão
    const caminhoJson = path.resolve(__dirname, 'dados_exclusao_motivo_alteracao.json');
    let configExclusao = {
      excluirTodasQAAUTO: true,
      termoGeral: 'QAAUTO',
      descricao: '',
    };

    if (fs.existsSync(caminhoJson)) {
      try {
        const conteudo = fs.readFileSync(caminhoJson, 'utf-8');
        configExclusao = { ...configExclusao, ...JSON.parse(conteudo) };
      } catch {
        console.warn('⚠️ Não foi possível ler dados_exclusao_motivo_alteracao.json, aplicando padrão QAAUTO.');
      }
    }

    // 2. Execução conforme configuração
    if (configExclusao.excluirTodasQAAUTO) {
      const termo = configExclusao.termoGeral || 'QAAUTO';
      console.log('\n======================================================');
      console.log(`🧹 Iniciando limpeza em lote de motivos criados pela automação ("${termo}")...`);
      console.log('======================================================');

      const resultado = await excluirMotivosAlteracaoEmLote(page, termo);

      expect(resultado).toBeDefined();
      console.log('\n======================================================');
      console.log('✅ LIMPEZA DE MOTIVOS CONCLUÍDA COM SUCESSO:');
      console.log(`🗑️ Total de motivos excluídos: ${resultado.totalExcluidos}`);
      if (resultado.motivosExcluidos.length > 0) {
        resultado.motivosExcluidos.forEach((m, idx) => {
          console.log(`   ${idx + 1}. Excluído: "${m}"`);
        });
      }
      if (resultado.falhas.length > 0) {
        console.log(`⚠️ Motivos mantidos (com impedimento): ${resultado.falhas.length}`);
        resultado.falhas.forEach((f, idx) => {
          console.log(`   - "${f.descricao}": ${f.motivo}`);
        });
      }
      console.log('======================================================\n');
    } else {
      const descricaoAlvo = configExclusao.descricao?.trim();
      if (!descricaoAlvo) {
        throw new Error('⚠️ Configure o campo "descricao" em dados_exclusao_motivo_alteracao.json ou marque "excluirTodasQAAUTO": true.');
      }

      console.log('\n======================================================');
      console.log(`▶️ Excluindo motivo de alteração específico: "${descricaoAlvo}"...`);
      console.log('======================================================');

      const excluido = await excluirMotivoAlteracao(page, descricaoAlvo);

      expect(excluido).toBeDefined();
      expect(excluido.descricao).toBe(descricaoAlvo);

      console.log('\n======================================================');
      console.log('✅ MOTIVO DE ALTERAÇÃO EXCLUÍDO COM SUCESSO:');
      console.log(`🏷️  Descrição: ${excluido.descricao}`);
      console.log(`🌐 URL Final: ${excluido.url}`);
      console.log('======================================================\n');
    }
  });

});

