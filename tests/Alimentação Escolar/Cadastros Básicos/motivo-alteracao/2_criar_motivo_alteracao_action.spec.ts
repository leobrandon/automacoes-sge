import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../../src/helpers/navigation/common.navigation';
import { criarMotivoAlteracao } from '../../../../src/actions/criar-motivo-alteracao.action';
import { BuildMotivoAlteracaoOptions } from '../../../../src/factories/motivo-alteracao.factory';

/**
 * Validação da Action Reutilizável: criarMotivoAlteracao()
 * Executa o fluxo E2E de cadastro de Motivo de Alteração 100% via interface gráfica no SGE.
 * 
 * Mantém o registro criado persistido no ambiente para conferência manual.
 * Suporta configuração sem código via arquivo 'dados_motivo_alteracao.json'.
 */
test.describe('Validação da Action Reutilizável: criarMotivoAlteracao()', () => {

  test('Deve criar motivo de alteração com sucesso via interface preenchendo os campos obrigatórios', async ({ page }) => {
    // 1. Autenticação via UI utilizando credenciais do ambiente
    await loginSge(page);

    // 2. Leitura dos dados customizados do arquivo 'dados_motivo_alteracao.json'
    const caminhoJson = path.resolve(__dirname, 'dados_motivo_alteracao.json');
    let quantidade = 1;
    const options: BuildMotivoAlteracaoOptions = {};

    if (fs.existsSync(caminhoJson)) {
      try {
        const conteudo = fs.readFileSync(caminhoJson, 'utf-8');
        const config = JSON.parse(conteudo);
        if (config.quantidade && Number(config.quantidade) > 0) {
          quantidade = Number(config.quantidade);
        }
        if (config.descricao && typeof config.descricao === 'string' && config.descricao.trim()) {
          options.descricao = config.descricao.trim();
        }
        if (config.situacao && typeof config.situacao === 'string' && config.situacao.trim()) {
          options.situacao = config.situacao.trim() as 'Ativo' | 'Inativo';
        }
      } catch {
        console.warn('⚠️ Não foi possível ler dados_motivo_alteracao.json, utilizando padrões da Factory.');
      }
    }

    // Ajusta o timeout proporcionalmente à quantidade
    test.setTimeout(Math.max(60000, quantidade * 60000));

    const motivosCriados: Array<{ descricao: string; situacao: string; url: string }> = [];

    for (let i = 1; i <= quantidade; i++) {
      if (quantidade > 1) {
        console.log(`\n======================================================`);
        console.log(`🚀 Cadastrando Motivo de Alteração [${i} de ${quantidade}]...`);
      }

      // 3. Execução da Action de criação (mantido persistido no banco para conferência manual)
      const criado = await criarMotivoAlteracao(page, options);

      // 4. Asserções de conformidade
      expect(criado).toBeDefined();
      expect(criado.descricao).toMatch(/^QAAUTO\b/);
      expect(criado.situacao).toBe(options.situacao ?? 'Ativo');
      expect(criado.url).toBeTruthy();

      motivosCriados.push({
        descricao: criado.descricao,
        situacao: criado.situacao,
        url: criado.url,
      });

      // 5. Exibição formatada dos dados gerados no terminal para conferência
      console.log('\n======================================================');
      console.log('✅ MOTIVO DE ALTERAÇÃO CADASTRADO COM SUCESSO:');
      console.log(`🏷️  Descrição: ${criado.descricao}`);
      console.log(`🚦 Situação:  ${criado.situacao}`);
      console.log(`🌐 URL Final: ${criado.url}`);
      console.log('======================================================\n');
    }

    if (motivosCriados.length > 1) {
      console.log(`🎉 Total de motivos cadastrados com sucesso: ${motivosCriados.length}`);
    }
  });

});

