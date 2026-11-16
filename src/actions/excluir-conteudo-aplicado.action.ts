import { expect, type Page } from '@playwright/test';
import { select2 } from '../helpers';
import { entrarNaUnidadeEscolar } from '../helpers/navigation/conselho-escolar.navigation';
import { navegarParaConteudoAplicado } from '../helpers/navigation/conteudo-aplicado.navigation';
import type { ConteudoAplicadoLancamentoDados } from './lancar-conteudo-aplicado.action';

export interface ConfiguracaoLoteConteudo {
  escola: string;
  turma: string;
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  id: string;
  data: string;
}

export function validarLoteConteudo(valor: ConfiguracaoLoteConteudo): void {
  if (!valor || typeof valor.escola !== 'string' || !valor.escola.trim() || typeof valor.turma !== 'string' || !valor.turma.trim() || typeof valor.excluirTodasQAAUTO !== 'boolean' || typeof valor.termoGeral !== 'string' || typeof valor.id !== 'string' || typeof valor.data !== 'string') throw new Error('Informe escola, turma, excluirTodasQAAUTO, termoGeral, id e data no JSON.');
  if (valor.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(valor.termoGeral.trim())) throw new Error('termoGeral deve começar por QAAUTO para exclusão em lote.');
  if (!valor.excluirTodasQAAUTO && (!/^linha-conteudo_\d+$/.test(valor.id.trim()) || !/^\d{2}\/\d{2}\/\d{4}$/.test(valor.data.trim()))) throw new Error('Para exclusão individual informe id e data exatos no JSON.');
}

/** Exclui registros cujo texto de um campo de conteúdo começa por um prefixo habilitado. */
export async function excluirConteudosPorPrefixo(page: Page, config: ConfiguracaoLoteConteudo): Promise<string[]> {
  validarLoteConteudo(config);
  if (!config.excluirTodasQAAUTO) throw new Error('A exclusão em lote exige excluirTodasQAAUTO: true.');
  const prefixos = [config.termoGeral.trim()];
  await entrarNaUnidadeEscolar(page, config.escola);
  if (!await page.locator('#formConteudoAplicado').isVisible()) await navegarParaConteudoAplicado(page);
  await select2.select(page, '#s2id_SelecaoDeTurma', config.turma, { exactMatch: true });
  await page.locator('#tabConteudos a[href="#s1"]').click();
  const wrapper = page.locator('#tabelaConteudoAplicado_wrapper');
  const busca = wrapper.locator('input[type="search"]');
  const quantidade = wrapper.locator('select[name="tabelaConteudoAplicado_length"]');
  await quantidade.selectOption('100');
  const removidos: string[] = [];
  for (const prefixo of prefixos) {
    await busca.fill(prefixo);
    for (;;) {
      const linhas = page.locator('#tabelaConteudoAplicado tbody tr[id^="linha-conteudo_"]');
      let encontrada = false;
      for (const linha of await linhas.all()) {
        const campos = await linha.locator('span.aumentatd').evaluate((span) => {
          return Array.from(span.querySelectorAll('b')).filter((b) => b.parentElement === span)
            .map((b) => (b.nextSibling?.textContent ?? '').trim());
        });
        if (!campos.length) throw new Error('Não foi possível ler os campos do conteúdo na listagem.');
        const normalizados = campos.map((campo) => campo.toLocaleUpperCase('pt-BR'));
        if (!normalizados.some((campo) => campo.startsWith(prefixo.toLocaleUpperCase('pt-BR')))) continue;
        const id = await linha.getAttribute('id');
        if (!id || !/^linha-conteudo_\d+$/.test(id) || removidos.includes(id)) throw new Error('Identificador inválido ou repetido na listagem.');
        await linha.getByTitle('Excluir', { exact: true }).click();
        const confirmacao = page.locator('.swal2-popup:visible').filter({ hasText: 'Essa ação é irreversível, deseja realmente excluir esse conteúdo aplicado?' });
        await expect(confirmacao).toBeVisible();
        await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
        const sucesso = page.locator('.swal2-popup:visible').filter({ hasText: 'Conteúdo Aplicado excluído com sucesso.' });
        await expect(sucesso).toBeVisible({ timeout: 30000 });
        await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
        await expect(sucesso).toBeHidden();
        await page.locator('#tabConteudos a[href="#s1"]').click();
        await busca.fill(prefixo);
        await expect(page.locator(`#tabelaConteudoAplicado [id="${id}"]`)).toHaveCount(0);
        removidos.push(id);
        console.log(`[QAAUTO] Excluído ${id} | prefixo ${prefixo}`);
        encontrada = true;
        break;
      }
      if (encontrada) continue;
      const info = (await wrapper.locator('#tabelaConteudoAplicado_info').innerText()).replace(/\s+/g, ' ');
      const partes = info.match(/Mostrando de\s+(\d+)\s+até\s+(\d+)\s+de\s+(\d+)\s+registros/i);
      if (!partes) {
        if (await wrapper.locator('.dataTables_empty').isVisible()) break;
        throw new Error(`Paginação não reconhecida: ${info}`);
      }
      const fim = Number(partes[2]), total = Number(partes[3]);
      if (fim >= total) break;
      const proxima = wrapper.locator('#tabelaConteudoAplicado_next');
      await expect(proxima).not.toHaveClass(/disabled/);
      await proxima.locator('a').click();
      await expect.poll(async () => (await wrapper.locator('#tabelaConteudoAplicado_info').innerText()).replace(/\s+/g, ' ')).not.toBe(info);
    }
  }
  return removidos;
}

/** Exclui somente a linha identificada e cujos dados de teste correspondem ao esperado. */
export async function excluirConteudoAplicadoLancamento(
  page: Page,
  alvo: ConteudoAplicadoLancamentoDados & { id: string; data: string },
): Promise<void> {
  if (!/^linha-conteudo_\d+$/.test(alvo.id) || !/^QAAUTO\b/i.test(alvo.habilidades.trim()) || !/^QAAUTO\b/i.test(alvo.objetosConhecimento.trim())) {
    throw new Error('Exclusão exige identificador de linha válido e textos QAAUTO.');
  }
  await entrarNaUnidadeEscolar(page, alvo.escola);
  if (!await page.locator('#formConteudoAplicado').isVisible()) await navegarParaConteudoAplicado(page);
  await select2.select(page, '#s2id_SelecaoDeTurma', alvo.turma, { exactMatch: true });
  await page.locator('#tabConteudos a[href="#s1"]').click();
  await page.locator('#tabelaConteudoAplicado_wrapper input[type="search"]').fill(alvo.habilidades);
  const linha = page.locator(`#tabelaConteudoAplicado [id="${alvo.id}"]`);
  await expect(linha, `Registro ${alvo.id} não encontrado na turma configurada.`).toHaveCount(1);
  await expect(linha).toContainText(alvo.data);
  await expect(linha).toContainText(alvo.componenteCurricular);
  await expect(linha).toContainText(alvo.habilidades);
  await expect(linha).toContainText(alvo.objetosConhecimento);
  const excluir = linha.getByTitle('Excluir', { exact: true });
  await expect(excluir).toBeVisible();
  await excluir.click();
  const confirmacao = page.locator('.swal2-popup:visible').filter({ hasText: 'Essa ação é irreversível, deseja realmente excluir esse conteúdo aplicado?' });
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
  const sucesso = page.locator('.swal2-popup:visible').filter({ hasText: 'Conteúdo Aplicado excluído com sucesso.' });
  await expect(sucesso).toBeVisible({ timeout: 30000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden();
  await expect(linha).toHaveCount(0, { timeout: 30000 });
  // Uma nova consulta garante que a ausência não é apenas atualização local da tabela.
  await select2.select(page, '#s2id_SelecaoDeTurma', alvo.turma, { exactMatch: true });
  await page.locator('#tabConteudos a[href="#s1"]').click();
  await page.locator('#tabelaConteudoAplicado_wrapper input[type="search"]').fill(alvo.habilidades);
  await expect(page.locator(`#tabelaConteudoAplicado [id="${alvo.id}"]`)).toHaveCount(0);
}
