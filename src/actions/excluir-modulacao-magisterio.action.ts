import { expect, type Page } from '@playwright/test';
import { buildModulacaoMagisterio, type AtribuicaoMagisterio } from '../factories/modulacao-magisterio.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { confirmarMagisterio, localizarAtribuicao, pesquisarMagisterio, voltarConsultaMagisterio } from '../helpers/navigation/modulacao-magisterio.navigation';
export async function excluirModulacaoMagisterio(page: Page, alvo: AtribuicaoMagisterio): Promise<void> {
    const d = buildModulacaoMagisterio(alvo);
    let linha = await localizarAtribuicao(page, d);
    await expect(linha).toHaveCount(1);
    await linha.locator('a[onclick^="editarModulacaoProfessor("]').click();
    const m = page.locator('#main');
    await expect(m.locator('h4').filter({ hasText: 'Editar Modulação Magistério' })).toBeVisible();
    await expect(m.locator('#DataInicio')).toHaveValue(d.dataInicio);
    await expect(m.locator('#Observacao')).toHaveValue(d.observacao);
    await expect(m.locator('#ContratoDeTrabalhoColaboradorPessoaNome')).toHaveValue(d.colaborador);
    await expect(m.locator('#GradeEscolarDisciplinaNome')).toHaveValue(d.componente);
    await expect(m.locator('#TurmaEscolaNome')).toHaveValue(d.escola);
    await expect(m.locator('#TurmaDescricao')).toHaveValue(new RegExp(`^${d.turma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - `));
    await expect(m.locator('#ContratoDeTrabalhoCargoDescricao')).toHaveValue(new RegExp(`^${d.contrato.split(' ')[0]} - `));
    await voltarConsultaMagisterio(page);
    linha = await localizarAtribuicao(page, d);
    await expect(linha).toHaveCount(1);
    await linha.locator('a[onclick^="excluirModulacaoProfessor("]').click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Esta ação irá excluir a modulação selecionada' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
    await confirmarMagisterio(page, /Modulação excluída\./);
    await pesquisarMagisterio(page, d.colaborador);
    const professor = page.locator('#grid tbody > tr').filter({ has: getByRoleSge(page, 'cell', { name: d.colaborador, exact: true }) });
    if (await professor.count())
        await expect(await localizarAtribuicao(page, d)).toHaveCount(0);
}
