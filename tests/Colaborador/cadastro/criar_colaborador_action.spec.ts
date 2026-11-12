import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../src/helpers';
import { criarColaborador } from '../../../src/actions';
import { buildColaborador } from '../../../src/factories';

/**
 * Validação da Action Reutilizável: criarColaborador()
 * Executa o fluxo E2E de cadastro de um Colaborador / Servidor 100% via interface gráfica.
 * 
 * Suporta configuração sem código via arquivo 'dados_colaborador.json'.
 */
test.describe('Validação da Action Reutilizável: criarColaborador()', () => {

  test('Deve criar um colaborador com sucesso via interface preenchendo os campos obrigatórios', async ({ page }) => {
    // 1. Autenticação via UI utilizando credenciais de ambiente
    await loginSge(page);

    // 2. Leitura dos dados customizados do arquivo 'dados_colaborador.json'
    const caminhoJson = path.resolve(__dirname, 'dados_colaborador.json');
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
        console.warn('⚠️ Não foi possível ler dados_colaborador.json, gerando dados aleatórios.');
      }
    }

    // Ajusta o tempo limite proporcionalmente à quantidade de cadastros
    test.setTimeout(Math.max(120000, quantidade * 60000));

    for (let i = 1; i <= quantidade; i++) {
      if (quantidade > 1) {
        console.log(`\n======================================================`);
        console.log(`🚀 Cadastrando Colaborador [${i} de ${quantidade}]...`);
      }

      // 3. Preparação da massa: mescla os dados do JSON com a geração automática da Factory
      const dadosColaborador = buildColaborador(dadosCustomizados);

      // 4. Execução da Action de criação
      const colaboradorCriado = await criarColaborador(page, dadosColaborador);

      // 5. Asserções de conformidade
      expect(colaboradorCriado).toBeDefined();
      expect(colaboradorCriado.nome).toBe(dadosColaborador.nome);
      expect(colaboradorCriado.cpf).toBe(dadosColaborador.cpf);
      expect(colaboradorCriado.url).toBeTruthy();

      // 6. Exibição clara dos dados gerados para conferência manual no sistema
      console.log('✅ COLABORADOR CADASTRADO NO SGE COM SUCESSO:');
      console.log(`👤 Nome:            ${dadosColaborador.nome}`);
      console.log(`🆔 CPF:             ${dadosColaborador.cpf}`);
      console.log(`📅 Data Nascimento: ${dadosColaborador.dataNascimento}`);
      console.log(`⚧️  Sexo:            ${dadosColaborador.sexo}`);
      console.log(`📍 Cidade/UF:       ${dadosColaborador.enderecoCidade} - ${dadosColaborador.enderecoUf}`);
      console.log(`📧 E-mail:          ${dadosColaborador.email}`);
      if (colaboradorCriado.id) {
        console.log(`🔑 ID no Sistema:   ${colaboradorCriado.id}`);
      }
      console.log('======================================================\n');
    }
  });

});
