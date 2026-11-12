import fs from 'node:fs';
import path from 'node:path';
import type {AnoLetivoDados} from '../../../src/factories/ano-letivo.factory';

function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(`${nome} deve ser objeto.`);
  return x as Record<string, unknown>;
}

export function configAnoLetivo(): AnoLetivoDados {
  const x = ler('dados_ano_letivo.json');
  for (const k of ['ano', 'metaAproveitamento', 'metaMedia']) if (typeof x[k] !== 'string') throw new Error(`${k} deve ser texto.`);
  return {ano: x.ano as string, metaAproveitamento: x.metaAproveitamento as string, metaMedia: x.metaMedia as string};
}

export function configExclusaoAnoLetivo(): string {
  const x = ler('dados_exclusao_ano_letivo.json');
  if (typeof x.ano !== 'string' || !/^\d{4}$/.test(x.ano)) throw new Error('Informe em dados_exclusao_ano_letivo.json o ano criado pela execução anterior (4 dígitos).');
  return x.ano;
}
