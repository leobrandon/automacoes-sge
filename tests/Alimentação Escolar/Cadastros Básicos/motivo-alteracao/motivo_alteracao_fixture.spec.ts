// Modo: REGRESSÃO AUTOMATIZADA. Setup e teardown via UI.
import { testMotivoAlteracao as test, expectMotivoAlteracao as expect } from '../../../../src/fixtures/motivo-alteracao.fixture';
import { linhaMotivoAlteracao } from '../../../../src/helpers/navigation/motivo-alteracao.navigation';

test.describe('Fixture: Motivo de Alteração', () => {
  test.setTimeout(120000);
  test('disponibiliza registro ativo persistido e o remove no teardown', async ({ page, motivoAlteracao }) => {
    await expect(linhaMotivoAlteracao(page, motivoAlteracao.descricao)).toHaveCount(1);
    expect(motivoAlteracao.situacao).toBe('Ativo');
  });
});
test.describe('Fixture com situação customizada', () => {
  test.setTimeout(120000);
  test.use({ motivoAlteracaoOptions: { situacao: 'Inativo' } });
  test('persiste Inativo pela edição e remove no teardown', async ({ page, motivoAlteracao }) => {
    await expect(linhaMotivoAlteracao(page, motivoAlteracao.descricao).locator('[title="Inativo"]')).toBeVisible();
  });
});
