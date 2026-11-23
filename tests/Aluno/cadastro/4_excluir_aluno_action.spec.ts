import { test, expect } from '@playwright/test';
import { loginSge } from '../../../src/helpers';
import { criarAluno, excluirAluno } from '../../../src/actions';
import { buildAluno } from '../../../src/factories';

/**
 * Teste de validação controlado para a Action reutilizável `excluirAluno()`.
 *
 * NOTA: Este teste executa o ciclo completo de vida ponta a ponta (E2E):
 * 1. `buildAluno()` -> Geração de massa de dados única e realista;
 * 2. `criarAluno()` -> Criação do estudante no SGE via UI;
 * 3. `excluirAluno()` -> Remoção segura e estrita do estudante recém-criado via UI;
 * 4. Validação objetiva de conformidade da exclusão na UI do sistema.
 */
test.describe('Validação da Action Reutilizável: excluirAluno()', () => {

  test('Deve criar um aluno e em seguida excluí-lo com sucesso via interface gráfica', async ({ page }) => {
    // 1. Autenticação no SGE via UI utilizando credenciais de ambiente
    await loginSge(page);

    // 2. Preparação de massa de dados única e realista via Factory
    const dadosAluno = buildAluno({
      escola: /ESCOLA MUNICIPAL/i,
      serie: /1º Ano|2º Ano|3º Ano|Ano/i,
      turno: /Matutino|Vespertino|Integral/i,
    });

    const nomeAluno = dadosAluno.nome;

    // 3. Criação do Aluno via Action reutilizável criarAluno()
    const alunoCriado = await criarAluno(page, dadosAluno);

    expect(alunoCriado).toBeDefined();
    expect(alunoCriado.nome).toBe(nomeAluno);

    // 4. Execução da Action reutilizável excluirAluno() passando o aluno recém-criado
    const alunoExcluido = await excluirAluno(page, alunoCriado);

    // 5. Validação objetiva do retorno da Action baseado nas evidências confirmadas pela UI
    expect(alunoExcluido).toBeDefined();
    expect(alunoExcluido.nome).toBe(nomeAluno);
    expect(alunoExcluido.url).toContain('homologa-sge.pontoid.com.br');
  });

});
