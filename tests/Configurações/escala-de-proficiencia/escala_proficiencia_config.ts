import fs from 'node:fs';
import path from 'node:path';
import {
  buildEscalaProficiencia,
  type BuildEscalaProficienciaOptions,
} from '../../../src/factories/escala-proficiencia.factory';

function lerDados(): Record<string, unknown> {
  const arquivo = path.join(__dirname, 'dados_escala_proficiencia.json');
  const valor: unknown = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new Error('dados_escala_proficiencia.json deve conter um objeto.');
  }
  return valor as Record<string, unknown>;
}

export function configEscalaProficiencia(): BuildEscalaProficienciaOptions {
  const dados = lerDados();
  if (
    typeof dados.codigoInicial !== 'string' ||
    typeof dados.descricao !== 'string' ||
    typeof dados.composicaoEnsino !== 'string' ||
    typeof dados.ativo !== 'boolean' ||
    !Array.isArray(dados.parametros)
  ) {
    throw new Error('A configuração da Escala de Proficiência está incompleta.');
  }

  const opcoes = dados as unknown as BuildEscalaProficienciaOptions;
  buildEscalaProficiencia(opcoes, opcoes.codigoInicial);
  return opcoes;
}
