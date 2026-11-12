import { Page, Locator, expect } from '@playwright/test';

/**
 * Opções de configuração para preenchimento de campos de Data/Datepicker.
 */
export interface DatepickerOptions {
  /**
   * Tempo limite máximo para a operação em milissegundos.
   * @default 10000
   */
  timeout?: number;

  /**
   * Se true, dispara eventos adicionais de DOM ('input', 'change', 'blur') para garantir
   * a sincronização de plugins jQuery maskedinput / datepicker.
   * @default true
   */
  dispatchEvents?: boolean;
}

/**
 * Helper de alto nível para preenchimento consistente e validação de campos de Data / Datepicker.
 */
export class DatepickerHelper {
  private static readonly DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

  /**
   * Preenche um campo de data mascarado no formato DD/MM/AAAA e valida sua fixação.
   *
   * @param page Instância do Playwright Page.
   * @param selector Seletor CSS do input de data (ex.: `#DataCadastro` ou `#PessoaDataNascimento`).
   * @param date Data formatada no padrão estrito `DD/MM/AAAA`.
   * @param options Opções adicionais de timeout e despacho de eventos.
   */
  static async fill(
    page: Page,
    selector: string,
    date: string,
    options: DatepickerOptions = {}
  ): Promise<void> {
    const timeout = options.timeout ?? 10000;
    const dispatchEvents = options.dispatchEvents ?? true;

    // 1. Validação prévia de formato
    if (!DatepickerHelper.DATE_REGEX.test(date)) {
      throw new Error(
        `[DatepickerHelper] Formato de data inválido: "${date}". O formato obrigatório é "DD/MM/AAAA" (ex: "21/08/2026").`
      );
    }

    // 2. Localizar o input
    const input = page.locator(selector).first();
    try {
      await input.waitFor({ state: 'visible', timeout });
    } catch {
      throw new Error(
        `[DatepickerHelper] Campo de data "${selector}" não está visível no DOM.`
      );
    }

    // Verificar se o campo está desabilitado ou somente leitura
    const isEditable = await input.isEditable().catch(() => false);
    if (!isEditable) {
      const isDisabled = await input.isDisabled().catch(() => false);
      if (isDisabled) {
        throw new Error(
          `[DatepickerHelper] Campo de data "${selector}" está desabilitado (disabled: true).`
        );
      }

      // Se não é editável mas não está desabilitado, trata-se de um input readonly (muito comum em datepickers)
      await input.evaluate((el: HTMLInputElement, val: string) => {
        el.value = val;
        if ((window as any).$ && (window as any).$(el).data('datepicker')) {
          try {
            (window as any).$(el).datepicker('setDate', val);
          } catch {}
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }, date).catch(() => {});
    } else {
      // 3. Preenchimento do valor
      await input.click({ timeout: 3000 });
      await input.fill(date);

      // 4. Disparo de tecla Tab para processamento da máscara e blur
      await input.press('Tab');
    }

    // Fechar calendário flutuante do jQuery UI se tiver aberto
    const floatingCalendar = page.locator('#ui-datepicker-div');
    if (await floatingCalendar.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape').catch(() => {});
    }

    if (dispatchEvents && isEditable) {
      await input.evaluate((el: HTMLInputElement) => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }).catch(() => {});
    }

    // 5. Validação do valor final aplicado no campo
    try {
      await expect(input).toHaveValue(date, { timeout: 4000 });
    } catch {
      const actualValue = await input.inputValue().catch(() => '<erro_ao_ler>');
      throw new Error(
        `[DatepickerHelper] Falha ao fixar a data "${date}" no campo "${selector}". ` +
        `Valor atual retornado pelo campo: "${actualValue}". Verifique se a máscara do componente rejeitou os dígitos informados.`
      );
    }
  }

  /**
   * Obtém o valor atualmente preenchido no campo de data.
   *
   * @param page Instância do Playwright Page.
   * @param selector Seletor CSS do input de data.
   * @returns O valor atual da data formatada.
   */
  static async getValue(page: Page, selector: string): Promise<string> {
    const input = page.locator(selector).first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    return await input.inputValue();
  }
}

/**
 * Export padrão funcional compatível com chamadas diretas.
 */
export const datepicker = {
  fill: DatepickerHelper.fill,
  getValue: DatepickerHelper.getValue,
};
