import fs from 'node:fs';
import path from 'node:path';
import { buildModulacaoMagisterio, type AtribuicaoMagisterio } from '../../../../src/factories/modulacao-magisterio.factory';
function ler(nome: string): unknown { return JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8')); }
export function configModulacoes(): AtribuicaoMagisterio[] {
    const x = ler('dados_modulacao_magisterio.json') as {
        quantidade?: number | string;
        atribuicoes?: AtribuicaoMagisterio[];
    };
    const n = x.quantidade === '' || x.quantidade === undefined ? 1 : x.quantidade;
    if (!Number.isSafeInteger(n) || Number(n) < 1 || !Array.isArray(x.atribuicoes) || x.atribuicoes.length !== n)
        throw new Error('Informe quantidade e uma atribuição por item no JSON.');
    const itens = x.atribuicoes.map(buildModulacaoMagisterio);
    if (new Set(itens.map(d => `${d.turma}\u0000${d.componente}`)).size !== itens.length)
        throw new Error('Cada atribuição deve ter turma/componente distintos.');
    return itens;
}
export function configExclusaoModulacao(): AtribuicaoMagisterio { return buildModulacaoMagisterio(ler('dados_exclusao_modulacao_magisterio.json') as AtribuicaoMagisterio); }
