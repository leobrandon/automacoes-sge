import { expect, type Page } from '@playwright/test';
import { buildModulacaoMagisterio, type AtribuicaoMagisterio } from '../factories/modulacao-magisterio.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { confirmarMagisterio, localizarAtribuicao, navegarParaAdicionarModulacaoMagisterio, pesquisarMagisterio, voltarConsultaMagisterio } from '../helpers/navigation/modulacao-magisterio.navigation';
async function selecionar(page: Page, id: string, valor: string, pesquisa?: string): Promise<void> {
    await page.locator(`#s2id_${id} .select2-choice`).click();
    const drop = page.locator('#select2-drop:visible');
    await expect(drop).toBeVisible();
    if (pesquisa)
        await drop.locator('input').fill(pesquisa);
    const opcoes = drop.locator('li.select2-result-selectable');
    await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
    const textos = (await opcoes.allInnerTexts()).map(x => x.trim());
    const exata = pesquisa ? opcoes.filter({ hasText: valor }) : opcoes.filter({ hasText: new RegExp(`^\\s*${valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) });
    if (await exata.count() !== 1)
        throw new Error(`${id}: opção "${valor}" ausente ou ambígua. Opções: ${textos.join(' | ') || 'nenhuma'}. Verifique os dados de apoio.`);
    await exata.click();
}
export async function criarModulacaoMagisterio(page: Page, dados: AtribuicaoMagisterio): Promise<AtribuicaoMagisterio> {
    const d = buildModulacaoMagisterio(dados);
    // Não sobrescreve nem remove uma atribuição preexistente.
    await pesquisarMagisterio(page, d.colaborador);
    const existente = page.locator('#grid tbody > tr').filter({ has: getByRoleSge(page, 'cell', { name: d.colaborador, exact: true }) });
    if (await existente.count()) {
        const anterior = await localizarAtribuicao(page, d);
        if (await anterior.count())
            throw new Error(`Já existe modulação para ${d.colaborador}, ${d.turma} e ${d.componente}; preserve o registro existente.`);
    }
    await navegarParaAdicionarModulacaoMagisterio(page);
    const m = page.locator('#main');
    await selecionar(page, 'AnoLetivoId', d.ano);
    await selecionar(page, 'TipoDeModulacao', 'Componente Curricular');
    await selecionar(page, 'GradeEscolarDisciplinaId', d.componente);
    await selecionar(page, 'TurmaEscolaId', d.escola);
    await selecionar(page, 'ContratoDeTrabalhoCargoId', d.cargo);
    const colaborador = m.getByRole('link', { name: /Selecione o cargo e informe o nome ou cpf/i, includeHidden: true });
    await colaborador.click();
    const drop = page.locator('#select2-drop:visible');
    await expect(drop).toBeVisible();
    await drop.locator('input').fill(d.colaborador);
    const opts = drop.locator('li.select2-result-selectable');
    await expect(opts.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
    const op = opts.filter({ hasText: d.colaborador });
    if (await op.count() !== 1)
        throw new Error(`Colaborador ${d.colaborador} ausente ou ambíguo. Opções: ${(await opts.allInnerTexts()).join(' | ') || 'nenhuma'}.`);
    await Promise.all([
        page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase().endsWith('/getresumodecontratosdocolaborador') && r.ok()),
        op.click(),
    ]);
    await expect(m.locator('#ContratoDeTrabalhoId option').filter({ hasText: d.contrato }), `Contrato ${d.contrato} não carregou para ${d.colaborador}.`).toHaveCount(1);
    await selecionar(page, 'ContratoDeTrabalhoId', d.contrato);
    await selecionar(page, 'FuncaoId', d.funcao);
    await m.locator('#DataInicio').fill(d.dataInicio);
    await m.locator('#DataInicio').press('Tab');
    await expect(m.locator('#DataInicio')).toHaveValue(d.dataInicio);
    await m.locator('#Observacao').fill(d.observacao);
    await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase().endsWith('/getturmasmodulacao') && r.ok()), getByRoleSge(m, 'link', { name: /Listar Turmas/ }).click()]);
    const linha = m.locator('table tbody tr').filter({ has: getByRoleSge(page, 'cell', { name: d.turma, exact: true }) }).filter({ has: getByRoleSge(page, 'cell', { name: d.componente, exact: true }) });
    if (await linha.count() !== 1)
        throw new Error(`Turma ${d.turma} / componente ${d.componente} indisponível ou ambíguo na escola ${d.escola}.`);
    const disponivel = Number(await linha.getAttribute('data-qtddisponivel'));
    if (!Number.isFinite(disponivel) || disponivel < d.aulas)
        throw new Error(`Turma ${d.turma}: aulas disponíveis (${disponivel}) insuficientes para ${d.aulas}.`);
    await linha.locator('label.checkbox').click();
    const aulas = linha.locator('[contenteditable="true"]');
    await expect(aulas).toBeVisible();
    await aulas.fill(String(d.aulas));
    await getByRoleSge(m, 'link', { name: /Salvar/ }).click();
    await confirmarMagisterio(page, /Modulação realizada com sucesso!/);
    await voltarConsultaMagisterio(page);
    const persisted = await localizarAtribuicao(page, d);
    await expect(persisted).toHaveCount(1);
    return d;
}
