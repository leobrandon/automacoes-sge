import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../src/helpers';
import { criarTurmaEscolarizacao, criarAluno } from '../../../src/actions';
import { buildTurma, buildAluno } from '../../../src/factories';

/**
 * Teste E2E Integrado: Criação de Turma + Criação de Aluno com Alocação Direta
 * 
 * Fluxo de Negócio:
 * 1. Autentica no SGE.
 * 2. Cria uma Turma de Escolarização ativa (lendo dados customizados de 'dados_turma.json' se preenchido).
 * 3. Obtém os parâmetros da turma criada (Escola, Série, Turno e Descrição da Turma).
 * 4. Cadastra novos Alunos vinculando-os diretamente na Turma recém-criada via campo '#s2id_TurmaId'.
 * 5. Valida o sucesso de ponta a ponta do ciclo educacional.
 */
test.describe('Fluxo Integrado: Criar Turma e Alocar Aluno', () => {

  test('Deve criar uma turma e posteriormente cadastrar um aluno alocado nessa turma', async ({ page }) => {
    // Leitura opcional de dados_turma.json para Unidade Educacional e outros campos customizados
    const caminhoJson = path.resolve(__dirname, 'dados_turma.json');
    let dadosCustomizadosTurma: Record<string, any> = {};
    let quantidadeAlunosConfig: number | undefined;

    if (fs.existsSync(caminhoJson)) {
      try {
        const conteudo = fs.readFileSync(caminhoJson, 'utf-8');
        const parsed = JSON.parse(conteudo);
        if (parsed.quantidadeAlunos !== undefined && parsed.quantidadeAlunos !== null && parsed.quantidadeAlunos !== '') {
          quantidadeAlunosConfig = Number(parsed.quantidadeAlunos);
        }
        delete parsed.quantidade;
        delete parsed.quantidadeAlunos;
        dadosCustomizadosTurma = Object.fromEntries(
          Object.entries(parsed).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        );
      } catch {
        console.warn('⚠️ Não foi possível ler dados_turma.json, utilizando padrões da Factory.');
      }
    }

    // Leitura opcional de dados_aluno.json para customizações ou fallback da quantidade
    const caminhoJsonAluno = path.resolve(__dirname, '../../Aluno/cadastro/dados_aluno.json');
    let dadosCustomizadosAluno: Record<string, any> = {};
    if (fs.existsSync(caminhoJsonAluno)) {
      try {
        const conteudoAluno = fs.readFileSync(caminhoJsonAluno, 'utf-8');
        const parsedAluno = JSON.parse(conteudoAluno);
        if (quantidadeAlunosConfig === undefined && parsedAluno.quantidade !== undefined && parsedAluno.quantidade !== null && parsedAluno.quantidade !== '') {
          quantidadeAlunosConfig = Number(parsedAluno.quantidade);
        }
        delete parsedAluno.quantidade;
        dadosCustomizadosAluno = Object.fromEntries(
          Object.entries(parsedAluno).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        );
      } catch {
        console.warn('⚠️ Não foi possível ler dados_aluno.json, utilizando padrões da Factory.');
      }
    }

    const quantidadeAlunos = quantidadeAlunosConfig && quantidadeAlunosConfig > 0 ? quantidadeAlunosConfig : 5;
    test.setTimeout(Math.max(180000, 120000 + quantidadeAlunos * 120000)); // Timeout proporcional (120s base + 120s por aluno)

    // 1. Autenticação no SGE
    await loginSge(page);

    // --------------------------------------------------------------------------
    // ETAPA 1: Criação da Turma de Escolarização
    // --------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log('🚀 [Etapa 1/2] Criando nova Turma de Escolarização...');
    console.log('======================================================');

    const dadosTurma = buildTurma({
      situacaoDesejada: 'Ativo',
      ...dadosCustomizadosTurma,
    });

    const turmaCriada = await criarTurmaEscolarizacao(page, dadosTurma);

    expect(turmaCriada).toBeDefined();
    expect(turmaCriada.id).toBeTruthy();
    expect(turmaCriada.descricao).toBe(dadosTurma.descricao);

    console.log('✅ Turma criada com sucesso!');
    console.log(`🏷️  Nome da Turma: ${turmaCriada.descricao}`);
    console.log(`🔑 ID da Turma:   ${turmaCriada.id}`);
    console.log(`🏫 Escola:        ${turmaCriada.escola}`);
    console.log(`📚 Série/Ano:     ${turmaCriada.serie}`);
    console.log(`⏰ Turno:         ${turmaCriada.turno}`);

    // --------------------------------------------------------------------------
    // ETAPA 2: Cadastro dos Alunos e Alocação na Turma Criada
    // --------------------------------------------------------------------------
    const alunosCriados: Array<{ nome: string; cpf: string; matricula: string }> = [];

    for (let i = 1; i <= quantidadeAlunos; i++) {
      console.log('\n======================================================');
      console.log(`🚀 [Etapa 2/2] Cadastrando Aluno [${i} de ${quantidadeAlunos}] e alocando na turma "${turmaCriada.descricao}"...`);
      console.log('======================================================');

      const dadosAluno = buildAluno({
        ...dadosCustomizadosAluno,
        // O cadastro de aluno lista a escola sem o código INEP ("NOME - 12345" na turma, "NOME" no aluno).
        escola: turmaCriada.escola?.replace(/\s+-\s+\d+$/, '') || /ESCOLA/i,
        serie: turmaCriada.serie || /Ano/i,
        turno: turmaCriada.turno || 'Integral',
        turma: turmaCriada.descricao,
      });

      const alunoCriado = await criarAluno(page, dadosAluno);

      // Asserções do Aluno
      expect(alunoCriado).toBeDefined();
      expect(alunoCriado.nome).toBe(dadosAluno.nome);
      expect(alunoCriado.cpf).toBeTruthy();
      expect(alunoCriado.matricula).toBeTruthy();

      alunosCriados.push({
        nome: alunoCriado.nome,
        cpf: alunoCriado.cpf,
        matricula: alunoCriado.matricula,
      });
    }

    // --------------------------------------------------------------------------
    // RESUMO CONSOLIDADO DO FLUXO INTEGRADO
    // --------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log('🎉 FLUXO INTEGRADO CONCLUÍDO COM SUCESSO:');
    console.log(`👥 Turma Criada:     ${turmaCriada.descricao} (ID: ${turmaCriada.id})`);
    console.log(`🏫 Estabelecimento: ${turmaCriada.escola}`);
    console.log(`📚 Série/Agrup.:    ${turmaCriada.serie}`);
    console.log(`⏰ Turno:           ${turmaCriada.turno}`);
    console.log(`🎓 Total de Alunos: ${alunosCriados.length}`);
    alunosCriados.forEach((aluno, idx) => {
      console.log(`   ${idx + 1}. ${aluno.nome} | CPF: ${aluno.cpf} | Matrícula: ${aluno.matricula}`);
    });
    console.log('======================================================\n');
  });

});

