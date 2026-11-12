import { Page } from '@playwright/test';
import { waitForSgeLoaders, navegarParaAdicionarMedidaCaseira } from '../helpers';
import { buildMedidaCaseira, MedidaCaseiraData } from '../factories/medida-caseira.factory';

export { MedidaCaseiraData };

/**
 * Resultado retornado após a criação bem-sucedida de uma Medida Caseira.
 */
export interface MedidaCaseiraCriada {
  /** Descrição cadastrada */
  descricao: string;
  /** Situação em que o registro foi gravado */
  situacao: string;
  /** URL final da página após o salvamento */
  url: string;
}

/**
 * Action de alto nível para cadastrar uma nova Medida Caseira no SGE
 * 100% via interface gráfica.
 *
 * Fluxo validado no manual_completo_alimentacao_escolar.md (seção 11):
 * 1. Navega até Alimentação Escolar > Cadastros Básicos > Medida Caseira
 * 2. Clica no botão de inclusão (pode ser apresentado apenas pelo ícone '+')
 * 3. Preenche descrição
 * 4. Define situação (quando o campo estiver visível)
 * 5. Salva e confirma via SweetAlert
 *
 * @param page Instância do Playwright Page (autenticada no SGE).
 * @param dados Opcional: dados customizados. Se omitido, utiliza buildMedidaCaseira().
 * @returns Objeto MedidaCaseiraCriada com descricao, situacao e url.
 */
export async function criarMedidaCaseira(
  page: Page,
  dados: Partial<MedidaCaseiraData> = {}
): Promise<MedidaCaseiraCriada> {
  // 1. Gera massa completa mesclando dados customizados com padrões da Factory
  const data = buildMedidaCaseira(dados);

  // 2. Navegação estrita via UI até o formulário de Adicionar
  await navegarParaAdicionarMedidaCaseira(page);
  await waitForSgeLoaders(page);

  // 3. Preencher Descrição (obrigatório, até 100 caracteres)
  const inputDescricao = page.locator('#Descricao, input[name="Descricao"]').first();
  await inputDescricao.waitFor({ state: 'visible', timeout: 10000 });
  await inputDescricao.fill(data.descricao);

  // 4. Situação (select ou checkbox, quando disponível na tela)
  const selectSituacao = page.locator('#Situacao, select[name="Situacao"]').first();
  const isSituacaoVisivel = await selectSituacao.isVisible().catch(() => false);
  if (isSituacaoVisivel) {
    const tagName = await selectSituacao.evaluate((el) => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await selectSituacao.selectOption({ label: data.situacao });
    }
  }

  // Checkbox "Ativo" alternativo (alguns CRUDs simples usam checkbox em vez de select)
  const checkboxAtivo = page.locator('#Ativo, input[name="Ativo"][type="checkbox"]').first();
  const isCheckboxVisivel = await checkboxAtivo.isVisible().catch(() => false);
  if (isCheckboxVisivel) {
    const isChecked = await checkboxAtivo.isChecked();
    if (data.situacao === 'Ativo' && !isChecked) {
      await checkboxAtivo.check();
    } else if (data.situacao === 'Inativo' && isChecked) {
      await checkboxAtivo.uncheck();
    }
  }

  // 5. Submissão: Clicar no botão Adicionar / Salvar dentro do modal ou na página
  const modalForm = page.locator('.modal:visible, [role="dialog"]:visible').first();
  const temModal = await modalForm.isVisible().catch(() => false);

  const btnSalvar = (temModal ? modalForm : page)
    .locator('button:has-text("Adicionar"), button:has-text("Salvar"), #btnSalvar, #btn_salvar, #btnAdicionar, input[type="submit"]')
    .first();
  await btnSalvar.waitFor({ state: 'visible', timeout: 10000 });
  await btnSalvar.click();

  // 6. Tratar modal SweetAlert de retorno (Sucesso ou Erro)
  const modalRetorno = page.locator('.swal2-container:visible, .swal2-popup:visible').first();
  try {
    const swalApareceu = await modalRetorno.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);

    if (swalApareceu) {

    // Verificar se é erro
    const isAlertaErro = (
      await modalRetorno.locator('.swal2-error:visible, .swal2-warning:visible').count()
    ) > 0;

    const titulo = (
      await modalRetorno.locator('#swal2-title, .swal2-title').textContent().catch(() => '')
    ) || '';

    if (isAlertaErro || titulo.toLowerCase().includes('erro') || titulo.toLowerCase().includes('atenção')) {
      const msgErro = await modalRetorno
        .locator('.swal2-content, .swal2-html-container')
        .first()
        .innerText()
        .catch(() => 'Erro desconhecido');

      // Clicar no Ok do erro para liberar a interface
      const btnOkErro = modalRetorno.locator('.swal2-confirm').first();
      if (await btnOkErro.isVisible().catch(() => false)) {
        await btnOkErro.click();
      }
      throw new Error(`[criarMedidaCaseira] Falha ao salvar medida caseira no SGE: ${msgErro}`);
    }

      // Confirmação de Sucesso — Clicar em "Ok"
      const btnOk = modalRetorno.locator('.swal2-confirm:has-text("Ok"), button:has-text("Ok")').first();
      await btnOk.waitFor({ state: 'visible', timeout: 10000 });
      await btnOk.click();
      await modalRetorno.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('[criarMedidaCaseira]')) {
      throw err;
    }
    // Se não houve modal (redirecionamento direto), seguir adiante
  }

  // Se havia modal de cadastro aberto, aguardar o fechamento
  if (temModal) {
    await modalForm.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  await page.waitForTimeout(500);
  await waitForSgeLoaders(page);

  return {
    descricao: data.descricao,
    situacao: data.situacao,
    url: page.url(),
  };
}
