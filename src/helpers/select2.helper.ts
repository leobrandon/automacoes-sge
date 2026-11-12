import { Page, Locator, expect } from '@playwright/test';

/**
 * Opções de configuração para seleção no Select2.
 */
export interface Select2Options {
  /**
   * Tempo limite máximo para a operação em milissegundos.
   * @default 10000
   */
  timeout?: number;

  /**
   * Se true, busca correspondência exata de texto (trimmed).
   * Se false, busca correspondência parcial (case-insensitive).
   * @default false
   */
  exactMatch?: boolean;

  /**
   * Texto customizado para preencher no campo de pesquisa antes de selecionar.
   * Se omitido e o campo de busca estiver visível, utiliza o próprio optionText (quando for string).
   */
  searchText?: string;

  /**
   * Indica se o componente é um Select2 múltiplo (tags/choices).
   * @default false
   */
  isMultiple?: boolean;
}

/**
 * Resolve o seletor do container do Select2.
 * Se for passado o ID do elemento nativo (ex.: `#EscolaId`), converte para `#s2id_EscolaId`
 * se o container existir, ou mantém o seletor original.
 */
function resolveContainerSelector(selector: string): string {
  if (selector.startsWith('#') && !selector.startsWith('#s2id_')) {
    return `#s2id_${selector.slice(1)}`;
  }
  return selector;
}

/**
 * Helper de alto nível para interação confiável e determinística com componentes Select2.
 */
export class Select2Helper {
  /**
   * Seleciona uma opção em um componente Select2 (single ou multi-select).
   *
   * @param page Instância do Playwright Page.
   * @param containerSelector Seletor CSS do container Select2 (ex.: `#s2id_EscolaId` ou `#EscolaId`).
   * @param optionText Texto da opção ou expressão regular a ser selecionada.
   * @param options Opções adicionais de timeout, busca e correspondência.
   */
  static async select(
    page: Page,
    containerSelector: string,
    optionText: string | RegExp,
    options: Select2Options = {}
  ): Promise<void> {
    const timeout = options.timeout ?? 10000;
    const exactMatch = options.exactMatch ?? false;
    const resolvedSelector = resolveContainerSelector(containerSelector);

    // 1. Localizar o container do Select2
    let container = page.locator(resolvedSelector).first();
    const containerExists = await container.count();
    if (containerExists === 0) {
      container = page.locator(containerSelector).first();
    }

    try {
      await container.waitFor({ state: 'visible', timeout });
    } catch {
      throw new Error(
        `[Select2Helper] Container do Select2 não está visível no DOM: "${containerSelector}" (resolvido: "${resolvedSelector}").`
      );
    }

    // Verificar se o container está desabilitado
    const isDisabled = await container.evaluate((el) =>
      el.classList.contains('select2-container-disabled') || el.hasAttribute('disabled')
    );
    if (isDisabled) {
      throw new Error(
        `[Select2Helper] O container Select2 "${containerSelector}" está desabilitado (disabled).`
      );
    }

    // 2. Abrir o Select2 clicando no elemento interativo (âncora .select2-choice ou .select2-choices)
    const trigger = container.locator('a.select2-choice, ul.select2-choices, .select2-choice, .select2-choices').first();
    const triggerExists = (await trigger.count()) > 0;
    const clickTarget = triggerExists ? trigger : container;

    // Fechar qualquer diálogo jQuery UI (ex.: #dialog_verificaaluno) se estiver interceptando a tela
    const dialogVisible = page.locator('.ui-dialog:visible');
    if ((await dialogVisible.count()) > 0) {
      const btnFechar = dialogVisible
        .locator(
          '.ui-dialog-titlebar-close, button:has-text("Fechar"), button:has-text("Novo"), button:has-text("Prosseguir"), a.ui-dialog-titlebar-close'
        )
        .first();
      if (await btnFechar.isVisible().catch(() => false)) {
        await btnFechar.click().catch(() => {});
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }
      await dialogVisible.first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }

    // Se o dropdown já não estiver aberto para este container, clicar no trigger
    const isAlreadyOpen = await container.evaluate((el) => el.classList.contains('select2-dropdown-open'));
    if (!isAlreadyOpen) {
      try {
        await clickTarget.click({ timeout: 5000 });
      } catch (err) {
        // Se um diálogo abriu durante a tentativa de clique, fechar e tentar novamente
        const dialogAberto = page.locator('.ui-dialog:visible');
        if ((await dialogAberto.count()) > 0) {
          const btnFechar = dialogAberto
            .locator(
              '.ui-dialog-titlebar-close, button:has-text("Fechar"), button:has-text("Novo"), button:has-text("Prosseguir"), a.ui-dialog-titlebar-close'
            )
            .first();
          if (await btnFechar.isVisible().catch(() => false)) {
            await btnFechar.click().catch(() => {});
          } else {
            await page.keyboard.press('Escape').catch(() => {});
          }
          await dialogAberto.first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
          await clickTarget.click({ timeout: 5000 });
        } else {
          throw err;
        }
      }
    }

    // 3. Aguardar o dropdown ativo abrir no DOM (#select2-drop:visible)
    const dropdown = page.locator('#select2-drop:visible, .select2-drop-active:visible, .select2-drop:visible').first();

    try {
      await dropdown.waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      // Se não abriu, força clique no trigger e aguarda novamente
      await clickTarget.click({ timeout: 3000 });
      await dropdown.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
        throw new Error(
          `[Select2Helper] O dropdown do Select2 "${containerSelector}" não abriu após o clique.`
        );
      });
    }

    // 4. Preencher pesquisa se houver input de busca visível
    const searchInput = dropdown.locator('input.select2-input:visible').first();
    const hasSearchInput = (await searchInput.count()) > 0 && (await searchInput.isVisible().catch(() => false));

    const textToSearch =
      options.searchText !== undefined
        ? options.searchText
        : typeof optionText === 'string'
        ? optionText
        : undefined;

    if (hasSearchInput && textToSearch) {
      await searchInput.fill(textToSearch);
      // Aguardar que o indicador de busca desapareça, se presente
      const searchingIndicator = dropdown.locator('.select2-searching');
      if (await searchingIndicator.isVisible().catch(() => false)) {
        await searchingIndicator.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
      }
    }

    // 5. Localizar a opção correta nos resultados da lista
    const selectableItems = dropdown.locator(
      'ul.select2-results li.select2-result-selectable, ul.select2-results li:not(.select2-disabled):not(.select2-searching):not(.select2-no-results)'
    );

    let targetOption: Locator;

    if (typeof optionText === 'string') {
      if (exactMatch) {
        const trimmed = optionText.trim();
        targetOption = selectableItems.filter({
          hasText: new RegExp(`^\\s*${escapeRegex(trimmed)}\\s*$`, 'i')
        }).first();
      } else {
        targetOption = selectableItems.filter({ hasText: optionText }).first();
      }
    } else {
      targetOption = selectableItems.filter({ hasText: optionText }).first();
    }

    // 6. Validar existência da opção e selecionar
    const optionFound = await targetOption.isVisible({ timeout: 4000 }).catch(() => false);

    if (!optionFound) {
      // Coletar opções disponíveis para mensagem de erro explicativa
      const availableOptions: string[] = [];
      const count = await selectableItems.count();
      for (let i = 0; i < Math.min(count, 10); i++) {
        const text = await selectableItems.nth(i).textContent();
        if (text) availableOptions.push(text.trim());
      }

      // Fechar o dropdown com Escape para manter a interface limpa
      await page.keyboard.press('Escape').catch(() => {});

      const expectedLabel = typeof optionText === 'string' ? `"${optionText}"` : optionText.toString();
      throw new Error(
        `[Select2Helper] Opção ${expectedLabel} não encontrada no Select2 "${containerSelector}". ` +
        `Opções disponíveis encontradas (${count}): [${availableOptions.join(' | ')}]`
      );
    }

    // Executar clique na opção
    await targetOption.click({ timeout: 5000 });

    // 7. Aguardar fechamento do dropdown (para single select)
    if (!options.isMultiple) {
      await dropdown.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    // 8. Validar que a seleção foi refletida no container (com suporte case-insensitive para strings e RegExp direto)
    const expectedMatcher =
      typeof optionText === 'string'
        ? new RegExp(escapeRegex(optionText), 'i')
        : optionText;

    if (!options.isMultiple) {
      const chosenLabel = container.locator('.select2-chosen').first();
      if ((await chosenLabel.count()) > 0) {
        await expect(chosenLabel).toContainText(expectedMatcher, { timeout: 4000 }).catch(async () => {
          const currentText = await chosenLabel.textContent();
          throw new Error(
            `[Select2Helper] A opção "${optionText}" foi clicada, mas o container "${containerSelector}" exibe "${currentText?.trim()}".`
          );
        });
      }
    } else {
      // Para multi-select, validar existência do choice adicionado
      const addedChoice = container.locator('.select2-search-choice').filter({ hasText: expectedMatcher }).first();
      await expect(addedChoice).toBeVisible({ timeout: 4000 }).catch(() => {
        throw new Error(
          `[Select2Helper] Tag multi-select "${optionText}" não foi refletida no container "${containerSelector}".`
        );
      });
    }
  }

  /**
   * Obtém o texto atualmente selecionado no Select2 (Single Select).
   *
   * @param page Instância do Playwright Page.
   * @param containerSelector Seletor CSS do container Select2.
   * @returns O texto visível selecionado.
   */
  static async getSelectedText(page: Page, containerSelector: string): Promise<string> {
    const resolvedSelector = resolveContainerSelector(containerSelector);
    let container = page.locator(resolvedSelector).first();
    if ((await container.count()) === 0) {
      container = page.locator(containerSelector).first();
    }

    const chosen = container.locator('.select2-chosen').first();
    if ((await chosen.count()) > 0) {
      return (await chosen.textContent())?.trim() ?? '';
    }
    return (await container.textContent())?.trim() ?? '';
  }
}

/**
 * Escapa caracteres especiais para uso em RegExp.
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Export padrão funcional compatível com chamadas diretas.
 */
export const select2 = {
  select: Select2Helper.select,
  getSelectedText: Select2Helper.getSelectedText,
};
