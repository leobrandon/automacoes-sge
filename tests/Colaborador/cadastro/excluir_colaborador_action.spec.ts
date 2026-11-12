import fs from 'fs';
import path from 'path';
import { test, expect } from '@playwright/test';
import { loginSge } from '../../../src/helpers';
import { criarColaborador, excluirColaborador, excluirColaboradoresEmLote } from '../../../src/actions';
import { buildColaborador } from '../../../src/factories';

interface ConfiguracaoExclusaoColaborador {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  nome: string;
  cpf: string;
}

function lerConfiguracaoExclusao(): ConfiguracaoExclusaoColaborador {
  const caminhoJson = path.resolve(__dirname, 'dados_exclusao_colaborador.json');
  const conteudo: unknown = JSON.parse(fs.readFileSync(caminhoJson, 'utf-8'));
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error('dados_exclusao_colaborador.json deve conter um objeto JSON.');
  }

  const dados = conteudo as Record<string, unknown>;
  if (typeof dados.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false no JSON.');
  }
  if (dados.termoGeral !== undefined && typeof dados.termoGeral !== 'string') {
    throw new Error('O campo "termoGeral" deve ser texto.');
  }
  if (dados.nome !== undefined && typeof dados.nome !== 'string') {
    throw new Error('O campo "nome" deve ser texto.');
  }
  if (dados.cpf !== undefined && typeof dados.cpf !== 'string') {
    throw new Error('O campo "cpf" deve ser texto.');
  }

  const termoGeral = (dados.termoGeral as string | undefined)?.trim() || 'QAAUTO';
  const nome = (dados.nome as string | undefined)?.trim() || '';
  const cpf = (dados.cpf as string | undefined)?.trim() || '';
  if (dados.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!dados.excluirTodasQAAUTO && !nome && !cpf) {
    throw new Error('Informe "nome" ou "cpf" para excluir um Colaborador específico.');
  }

  return { excluirTodasQAAUTO: dados.excluirTodasQAAUTO, termoGeral, nome, cpf };
}

/**
 * Validação da Action Reutilizável: excluirColaborador() e exclusão em lote.
 *
 * Suporta dois cenários principais:
 * 1. Ciclo de Vida E2E: Criação seguida de exclusão imediata (base sempre limpa).
 * 2. Exclusão Dinâmica via JSON ('dados_exclusao_colaborador.json'):
 *    - Se "excluirTodasQAAUTO": true -> Remove em lote todos os servidores QAAUTO indicados no JSON.
 *    - Se "excluirTodasQAAUTO": false -> Remove o colaborador específico indicado no JSON.
 */
test.describe('Validação da Action Reutilizável: excluirColaborador()', () => {

  test('Deve criar um colaborador e em seguida excluí-lo com sucesso via interface gráfica', async ({ page }) => {
    // 1. Autenticação no SGE via UI
    await loginSge(page);

    // 2. Preparação de massa com CEP aleatório válido de Goiânia e CPF válido
    const dadosColaborador = buildColaborador();
    const nomeColaborador = dadosColaborador.nome;

    console.log(`\n▶️ [1/2] Criando colaborador de teste: ${nomeColaborador} (CPF: ${dadosColaborador.cpf}, CEP: ${dadosColaborador.enderecoCep})...`);

    // 3. Criação do colaborador via Action UI
    const colaboradorCriado = await criarColaborador(page, dadosColaborador);

    expect(colaboradorCriado).toBeDefined();
    expect(colaboradorCriado.nome).toBe(nomeColaborador);

    console.log(`✅ Colaborador criado com sucesso! Iniciando exclusão imediata para limpeza da base...`);

    // 4. Exclusão do colaborador recém-criado via Action UI
    const colaboradorExcluido = await excluirColaborador(page, colaboradorCriado);

    // 5. Validações de conformidade
    expect(colaboradorExcluido).toBeDefined();
    expect(colaboradorExcluido.nome).toContain('QAAUTO');

    console.log('\n======================================================');
    console.log('🗑️ COLABORADOR EXCLUÍDO DO SGE COM SUCESSO:');
    console.log(`👤 Nome: ${colaboradorExcluido.nome}`);
    console.log(`🆔 CPF:  ${colaboradorExcluido.cpf}`);
    if (colaboradorExcluido.id) {
      console.log(`🔑 ID:   ${colaboradorExcluido.id}`);
    }
    console.log('======================================================\n');
  });

  test('Executar exclusão configurada via arquivo dados_exclusao_colaborador.json', async ({ page }) => {
    const configExclusao = lerConfiguracaoExclusao();
    // 1. Autenticação no SGE via UI
    await loginSge(page);

    // 2. Execução condicional conforme o JSON validado
    if (configExclusao.excluirTodasQAAUTO) {
      const termo = configExclusao.termoGeral || 'QAAUTO';
      console.log(`\n🧹 Iniciando limpeza em lote de todos os servidores com termo "${termo}"...`);

      const resultado = await excluirColaboradoresEmLote(page, { termo });

      expect(resultado).toBeDefined();
      console.log(`✅ Limpeza concluída: ${resultado.totalExcluidos} servidor(es) excluído(s).`);
    } else {
      const nomeOuCpf = configExclusao.nome || configExclusao.cpf;
      if (!nomeOuCpf) {
        throw new Error('⚠️ Configure "nome" ou "cpf" em dados_exclusao_colaborador.json, ou ative "excluirTodasQAAUTO": true.');
      }

      console.log(`\n▶️ Excluindo colaborador específico configurado no JSON: "${nomeOuCpf}"...`);
      const colaboradorExcluido = await excluirColaborador(page, {
        nome: configExclusao.nome || undefined,
        cpf: configExclusao.cpf || undefined,
      });

      expect(colaboradorExcluido).toBeDefined();
      console.log(`✅ Colaborador "${colaboradorExcluido.nome}" excluído com sucesso!`);
    }
  });

});
