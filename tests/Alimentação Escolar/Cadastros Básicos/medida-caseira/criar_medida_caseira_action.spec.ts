import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../../src/helpers';
import { criarMedidaCaseira } from '../../../../src/actions';
import { buildMedidaCaseira } from '../../../../src/factories';

/**
 * Validação da Action Reutilizável: criarMedidaCaseira()
 * Executa o fluxo E2E de cadastro de Medida Caseira 100% via interface gráfica no SGE.
 *
 * Suporta configuração sem código via arquivo 'dados_medida_caseira.json'.
 */
test.describe('Validação da Action Reutilizável: criarMedidaCaseira()', () => {

  test('Deve criar uma medida caseira com sucesso via interface preenchendo os campos obrigatórios', async ({ page }) => {
    // 1. Autenticação via UI utilizando credenciais do ambiente
    await loginSge(page);

    // 2. Leitura dos dados customizados do arquivo 'dados_medida_caseira.json'
    const caminhoJson = path.resolve(__dirname, 'dados_medida_caseira.json');
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
        console.warn('⚠️ Não foi possível ler dados_medida_caseira.json, gerando dados automáticos da Factory.');
      }
    }

    // Ajusta o timeout proporcionalmente à quantidade
    test.setTimeout(Math.max(60000, quantidade * 45000));

    for (let i = 1; i <= quantidade; i++) {
      if (quantidade > 1) {
        console.log(`\n======================================================`);
        console.log(`🚀 Cadastrando Medida Caseira [${i} de ${quantidade}]...`);
      }

      // 3. Preparação da massa: mescla dados do JSON com geração automática da Factory
      const dadosMedida = buildMedidaCaseira(dadosCustomizados);

      // 4. Execução da Action de criação
      const medidaCriada = await criarMedidaCaseira(page, dadosMedida);

      // 5. Asserções de conformidade
      expect(medidaCriada).toBeDefined();
      expect(medidaCriada.descricao).toBe(dadosMedida.descricao);
      expect(medidaCriada.url).toBeTruthy();

      // 6. Exibição formatada dos dados gerados para conferência manual no sistema
      console.log('\n======================================================');
      console.log('✅ MEDIDA CASEIRA CADASTRADA COM SUCESSO:');
      console.log(`🏷️  Descrição: ${medidaCriada.descricao}`);
      console.log(`🚦 Situação:  ${medidaCriada.situacao}`);
      console.log(`🌐 URL Final: ${medidaCriada.url}`);
      console.log('======================================================\n');
    }
  });

});
