import { test, expect } from '../../../src/fixtures';

/**
 * Suíte de validação da Fixture de Ciclo de Vida: `aluno`.
 *
 * Demonstra a utilização concisa da fixture nos testes E2E, onde a preparação,
 * criação e limpeza dos dados do estudante ocorrem de forma 100% autônoma e transparente.
 */
test.describe('Validação da Fixture de Ciclo de Vida de Aluno', () => {

  test('Deve criar, validar e excluir um aluno automaticamente', async ({ aluno }) => {
    // 1. O estudante já foi criado e disponibilizado pela fixture
    expect(aluno).toBeDefined();
    expect(aluno.nome).toBeTruthy();
    expect(aluno.cpf).toBeTruthy();
    expect(aluno.matricula).toBeTruthy();
    expect(aluno.url).toContain('homologa-sge.pontoid.com.br');

    // 2. Validações explícitas dos dados retornados pelo cadastro
    expect(aluno.nome.trim().length).toBeGreaterThan(3);
    expect(aluno.cpf?.replace(/\D/g, '').length).toBe(11);
    expect(aluno.matricula).toMatch(/^MAT\d+/);

    console.log(`[Teste E2E] Aluno criado: Nome="${aluno.nome}", CPF="${aluno.cpf}", Matrícula="${aluno.matricula}"`);

    // 3. Ao finalizar este bloco, o teardown da fixture chamará excluirAluno() garantidamente.
  });

});
