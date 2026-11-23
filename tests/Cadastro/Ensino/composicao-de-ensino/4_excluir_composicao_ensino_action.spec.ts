import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  excluirComposicaoEnsino,
  excluirComposicoesEnsinoEmLote,
} from '../../../../src/actions';
import {
  isComposicaoEnsinoQAAuto,
  startsWithQAAUTO,
} from '../../../../src/factories/composicao-ensino.factory';
import { loginSge } from '../../../../src/helpers';

// Modo: REGRESSÃO AUTOMATIZADA. Navegação visual, auto-waiting e sem delays artificiais.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

function lerTexto(config: Record<string, unknown>, campo: string): string {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return '';
  if (typeof valor !== 'string') throw new Error(`O campo "${campo}" deve ser texto.`);
  return valor.trim();
}

function lerConfiguracaoExclusao(): { excluirTodasQAAUTO: boolean; termoGeral: string; descricao: string } {
  const caminho = path.resolve(__dirname, 'dados_exclusao_composicao_ensino.json');
  const valor: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error('dados_exclusao_composicao_ensino.json deve conter um objeto JSON.');
  }

  const dados = valor as Record<string, unknown>;
  if (typeof dados.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false.');
  }

  const termoGeral = lerTexto(dados, 'termoGeral') || 'QAAUTO';
  const descricao = lerTexto(dados, 'descricao');
  if (dados.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!dados.excluirTodasQAAUTO && !startsWithQAAUTO(descricao)) {
    throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO.');
  }

  return { excluirTodasQAAUTO: dados.excluirTodasQAAUTO, termoGeral, descricao };
}

test.describe('Exclusão de Composição de Ensino', () => {
  test('exclui pela interface as composições indicadas no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusao();
    test.setTimeout(600000);
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirComposicoesEnsinoEmLote(page, configuracao.termoGeral);
      expect(resultado.composicoesExcluidas.every(isComposicaoEnsinoQAAuto)).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Composições de Ensino QAAUTO excluídas: ${resultado.totalExcluidas}`);
      return;
    }

    const resultado = await excluirComposicaoEnsino(page, configuracao.descricao);
    expect(resultado.descricao).toBe(configuracao.descricao);
    expect(new URL(resultado.url).origin).toBe(new URL(BASE_URL).origin);
    console.log(`✅ Composição de Ensino excluída: ${resultado.descricao}`);
  });
});
