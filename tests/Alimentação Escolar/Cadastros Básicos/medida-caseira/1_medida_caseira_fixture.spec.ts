import { testMedidaCaseira as test, expectMedidaCaseira as expect } from '../../../../src/fixtures';

/**
 * Validação da Fixture com Lifecycle Gerenciado: medidaCaseira
 * 
 * A fixture executa automaticamente:
 * - SETUP: Login → buildMedidaCaseira() → criarMedidaCaseira()
 * - TESTE: Recebe { medidaCaseira } pronta para uso
 * - TEARDOWN (finally): excluirMedidaCaseira() — independente de sucesso/falha
 */
test.describe('Fixture com Lifecycle: Medida Caseira', () => {

  test('Deve criar, utilizar e excluir automaticamente uma medida caseira via fixture', async ({ medidaCaseira }) => {
    // A medida caseira já foi criada pelo setup da fixture
    console.log('\n======================================================');
    console.log('🔄 FIXTURE: Medida Caseira disponibilizada para o teste:');
    console.log(`🏷️  Descrição: ${medidaCaseira.descricao}`);
    console.log(`🚦 Situação:  ${medidaCaseira.situacao}`);
    console.log(`🌐 URL:       ${medidaCaseira.url}`);
    console.log('======================================================\n');

    // Asserções
    expect(medidaCaseira).toBeDefined();
    expect(medidaCaseira.descricao).toContain('QAAUTO');
    expect(medidaCaseira.situacao).toBe('Ativo');
    expect(medidaCaseira.url).toBeTruthy();

    // Ao final deste bloco, a fixture dispara o teardown automaticamente
    console.log('✅ Teste concluído. A fixture irá excluir a medida caseira automaticamente.');
  });

  test.describe('com opções customizadas', () => {
    test.use({ medidaCaseiraOptions: { descricao: 'QAAUTO Medida Caseira Customizada' } });

    test('Deve aceitar opções customizadas via fixture', async ({ medidaCaseira }) => {
      expect(medidaCaseira.descricao).toBe('QAAUTO Medida Caseira Customizada');
      expect(medidaCaseira.situacao).toBe('Ativo');
    });
  });

});
