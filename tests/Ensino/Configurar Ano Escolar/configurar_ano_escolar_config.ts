import fs from 'node:fs';
import path from 'node:path';
import {
  buildConfiguracaoAnoEscolar,
  isCalendarioQAAuto,
  type ConfiguracaoAnoEscolarAlvo,
  type ConfiguracaoAnoEscolarDados,
} from '../../../src/factories/configurar-ano-escolar.factory';

function ler(nome: string): Record<string, unknown> {
  const dados: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!dados || typeof dados !== 'object' || Array.isArray(dados))
    throw new Error(`${nome} deve conter um objeto.`);
  return dados as Record<string, unknown>;
}

export function configConfiguracaoAnoEscolar(): ConfiguracaoAnoEscolarDados {
  // A factory valida os tipos (texto) e aplica os padrões dos campos opcionais.
  return buildConfiguracaoAnoEscolar(
    ler('dados_configurar_ano_escolar.json') as unknown as ConfiguracaoAnoEscolarDados,
  );
}

export function configExclusaoConfiguracaoAnoEscolar(): ConfiguracaoAnoEscolarAlvo {
  const d = ler('dados_exclusao_configurar_ano_escolar.json');
  const alvo = {
    calendarioEscolar: String(d.calendarioEscolar ?? '').trim(),
    composicaoEnsino: String(d.composicaoEnsino ?? '').trim(),
    anoEscolar: String(d.anoEscolar ?? '').trim(),
  };
  if (!alvo.composicaoEnsino || !alvo.anoEscolar || !isCalendarioQAAuto(alvo.calendarioEscolar))
    throw new Error('Informe calendário QAAUTO, composição e ano escolar para exclusão.');
  return alvo;
}
