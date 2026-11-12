import { expect, type Page } from '@playwright/test';
import {
  validarProjetoPedagogico,
  type ProjetoPedagogicoDados,
} from '../factories/projeto-acao-pedagogica.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { select2 } from '../helpers/select2.helper';
import {
  linhaProjeto,
  pesquisarProjeto,
} from '../helpers/navigation/projeto-acao-pedagogica.navigation';
export async function criarProjetoPedagogico(
  page: Page,
  dados: ProjetoPedagogicoDados,
): Promise<string> {
  const d = validarProjetoPedagogico(dados),
    m = page.locator('#main');
  await pesquisarProjeto(page, d);
  await expect(linhaProjeto(page, d)).toHaveCount(0);
  const adicionar = m.locator('button').filter({ has: page.locator('i.fa-plus') });
  await expect(adicionar).toHaveCount(1);
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await expect(m.locator('#Periodicidade')).toBeAttached();
  await select2.select(page, '#Periodicidade', d.periodo, { exactMatch: true });
  await expect(m.locator('#AnoLetivoId option:checked')).toHaveText(d.anoLetivo);
  const salvar = getByRoleSge(m, 'button', { name: /Salvar/ });
  await expect(salvar).toBeVisible();
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /^\/projetoeacaopedagogica\/editar\/\d+$/i.test(new URL(r.url()).pathname) &&
        r.request().method() === 'GET',
      { timeout: 30000 },
    ),
    salvar.click(),
  ]);
  if (!resposta.ok())
    throw new Error(`Abertura do projeto criado retornou HTTP ${resposta.status()}.`);
  const id = new URL(resposta.url()).pathname.split('/').pop() || '';
  if (!/^\d+$/.test(id)) throw new Error('Identificador do projeto criado inválido.');
  const voltar = getByRoleSge(m, 'button', { name: /Voltar/ });
  await expect(voltar).toBeVisible();
  await voltar.click();
  await expect(m.locator('h4').filter({ hasText: 'Projetos e Ações Pedagógicas' })).toBeVisible();
  await pesquisarProjeto(page, d);
  const linha = linhaProjeto(page, d);
  await expect(linha).toHaveCount(1);
  await expect(linha.locator('input[name="url"]')).toHaveValue(
    new RegExp(`[?&]projetoEAcaoId=${id}(?:&|$)`),
  );
  return id;
}
