import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../src/helpers';
import { criarAluno } from '../../../src/actions';
import { buildAluno } from '../../../src/factories';

/**
 * Validação da Action Reutilizável: criarAluno()
 * Executa o fluxo E2E de cadastro de Aluno 100% via interface gráfica no SGE.
 * 
 * Suporta configuração sem código via arquivo 'dados_aluno.json'.
 */
test.describe('Validação da Action Reutilizável: criarAluno()', () => {

  test('Deve criar um aluno com sucesso via interface preenchendo os campos obrigatórios', async ({ page }) => {
    // 1. Autenticação via UI utilizando credenciais de ambiente
    await loginSge(page);

    // 2. Leitura dos dados customizados do arquivo 'dados_aluno.json'
    const caminhoJson = path.resolve(__dirname, 'dados_aluno.json');
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
        console.warn('⚠️ Não foi possível ler dados_aluno.json, utilizando padrões da Factory.');
      }
    }

    // Ajusta o tempo limite proporcionalmente à quantidade de cadastros
    test.setTimeout(Math.max(120000, quantidade * 60000));

    for (let i = 1; i <= quantidade; i++) {
      if (quantidade > 1) {
        console.log(`\n======================================================`);
        console.log(`🚀 Cadastrando Aluno [${i} de ${quantidade}]...`);
      }

      // 3. Preparação da massa: mescla os dados do JSON com a geração automática da Factory
      const dadosAluno = buildAluno({
        escola: dadosCustomizados.escola || /ESCOLA MUNICIPAL/i,
        serie: dadosCustomizados.serie || /1º Ano|2º Ano|3º Ano|Ano/i,
        turno: dadosCustomizados.turno || /Matutino|Vespertino|Integral/i,
        ...dadosCustomizados,
      });

      // 4. Execução da Action de criação
      const alunoCriado = await criarAluno(page, dadosAluno);

      // 5. Asserções de conformidade
      expect(alunoCriado).toBeDefined();
      expect(alunoCriado.nome).toBe(dadosAluno.nome);
      expect(alunoCriado.cpf).toBeTruthy();
      expect(alunoCriado.matricula).toBeTruthy();
      expect(alunoCriado.url).toBeTruthy();

      // 6. Exibição clara dos dados gerados para conferência manual no sistema
      console.log('\n======================================================');
      console.log('✅ ALUNO CADASTRADO NO SGE COM SUCESSO:');
      console.log(`👤 Nome:          ${dadosAluno.nome}`);
      console.log(`🆔 CPF:           ${alunoCriado.cpf}`);
      console.log(`📝 Matrícula:     ${alunoCriado.matricula}`);
      console.log(`🏫 Escola:        ${dadosAluno.escola}`);
      console.log(`📚 Série/Ano:     ${dadosAluno.serie}`);
      console.log(`⏰ Turno:         ${dadosAluno.turno}`);
      if (alunoCriado.turma) {
        console.log(`👥 Turma Alocada: ${alunoCriado.turma}`);
      }
      if (alunoCriado.id) {
        console.log(`🔑 ID no Sistema: ${alunoCriado.id}`);
      }
      console.log(`🌐 URL Final:     ${alunoCriado.url}`);
      console.log('======================================================\n');
    }
  });

});
