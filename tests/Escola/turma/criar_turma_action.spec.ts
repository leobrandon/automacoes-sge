import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../src/helpers';
import { criarTurmaEscolarizacao } from '../../../src/actions';
import { buildTurma } from '../../../src/factories';

/**
 * Validação da Action Reutilizável: criarTurmaEscolarizacao()
 * Executa o fluxo E2E de cadastro de Turma (Escolarização) 100% via interface gráfica no SGE.
 * 
 * Suporta configuração sem código via arquivo 'dados_turma.json'.
 */
test.describe('Validação da Action Reutilizável: criarTurmaEscolarizacao()', () => {

  test('Deve criar uma turma de escolarização com sucesso via interface preenchendo os campos obrigatórios', async ({ page }) => {
    // 1. Autenticação via UI utilizando credenciais do ambiente
    await loginSge(page);

    // 2. Leitura dos dados customizados do arquivo 'dados_turma.json'
    const caminhoJson = path.resolve(__dirname, 'dados_turma.json');
    let quantidade = 1;
    let dadosCustomizados: Record<string, any> = {};

    if (fs.existsSync(caminhoJson)) {
      try {
        const conteudo = fs.readFileSync(caminhoJson, 'utf-8');
        const parsed = JSON.parse(conteudo);
        if (parsed.quantidade && Number(parsed.quantidade) > 0) {
          quantidade = Number(parsed.quantidade);
        }
        delete parsed.quantidade;

        // Filtra apenas campos preenchidos (ignora valores vazios "")
        dadosCustomizados = Object.fromEntries(
          Object.entries(parsed).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        );
      } catch {
        console.warn('⚠️ Não foi possível ler dados_turma.json, gerando dados automáticos da Factory.');
      }
    }

    // Ajusta o timeout proporcionalmente à quantidade de turmas
    test.setTimeout(Math.max(120000, quantidade * 60000));

    for (let i = 1; i <= quantidade; i++) {
      if (quantidade > 1) {
        console.log(`\n======================================================`);
        console.log(`🚀 Cadastrando Turma [${i} de ${quantidade}]...`);
      }

      // 3. Preparação da massa: mescla os dados do JSON com a geração automática da Factory
      const dadosTurma = buildTurma(dadosCustomizados);

      // 4. Execução da Action de criação
      const turmaCriada = await criarTurmaEscolarizacao(page, dadosTurma);

      // 5. Asserções de conformidade
      expect(turmaCriada).toBeDefined();
      expect(turmaCriada.descricao).toBe(dadosTurma.descricao);
      expect(turmaCriada.situacao).toBe(dadosTurma.situacaoDesejada);
      expect(turmaCriada.url).toBeTruthy();

      // 6. Exibição formatada dos dados gerados para conferência manual no sistema
      console.log('\n======================================================');
      console.log('✅ TURMA DE ESCOLARIZAÇÃO CADASTRADA COM SUCESSO:');
      console.log(`🏷️  Descrição:        ${dadosTurma.descricao}`);
      console.log(`📅 Ano Letivo:       ${dadosTurma.anoLetivo}`);
      console.log(`🗓️  Calendário:       ${dadosTurma.calendarioEscolar || 'Automático'}`);
      console.log(`📚 Composição:       ${dadosTurma.composicaoEnsino || 'Automática'}`);
      console.log(`⏰ Turno:            ${dadosTurma.turno}`);
      console.log(`🎓 Mediação:         ${dadosTurma.mediacaoDidaticoPedagogica}`);
      console.log(`🚦 Situação Salva:   ${turmaCriada.situacao}`);
      if (turmaCriada.id) {
        console.log(`🔑 ID da Turma:      ${turmaCriada.id}`);
      }
      console.log(`🌐 URL Final:        ${turmaCriada.url}`);
      console.log('======================================================\n');
    }
  });

});
