export interface AtribuicaoMagisterio {
    ano: string;
    escola: string;
    componente: string;
    cargo: string;
    colaborador: string;
    contrato: string;
    funcao: string;
    dataInicio: string;
    turma: string;
    aulas: number;
    observacao: string;
}
export function buildModulacaoMagisterio(d: AtribuicaoMagisterio): AtribuicaoMagisterio {
    for (const k of ['ano', 'escola', 'componente', 'cargo', 'colaborador', 'contrato', 'funcao', 'dataInicio', 'turma', 'observacao'] as const) {
        if (typeof d[k] !== 'string' || !d[k].trim())
            throw new Error(`Informe ${k} nos dados de modulação.`);
    }
    if (!/QAAUTO/i.test(d.colaborador) || !/^QAAUTO\b/i.test(d.observacao))
        throw new Error('Informe colaborador QAAUTO e observação QAAUTO para identificar a execução.');
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(d.dataInicio))
        throw new Error('Data início deve estar em DD/MM/AAAA.');
    if (!Number.isSafeInteger(d.aulas) || d.aulas < 1)
        throw new Error('Aulas assumidas deve ser inteiro positivo.');
    return { ...d };
}
