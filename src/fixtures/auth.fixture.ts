import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type AuthFixtures = {
    /** Instância do Page Object da tela de login */
    loginPage: LoginPage;
    /** Página já autenticada com sucesso no SGE pronta para testar qualquer funcionalidade interna */
    paginaLogada: Page;
};

/**
 * Fixture estendida que automatiza o ciclo de vida do login e navegação inicial.
 * Elimina completamente a necessidade de repetir 'page.goto' e credenciais nos testes.
 */
export const test = base.extend<AuthFixtures>({
    // Fornece a classe LoginPage pronta caso o teste queira testar cenários de login
    loginPage: async ({ page }, use) => {
        const login = new LoginPage(page);
        await use(login);
    },

    // Fornece o navegador já autenticado e pronto para os testes de regras de negócio
    paginaLogada: async ({ page }, use) => {
        const login = new LoginPage(page);
        await login.logar();
        await use(page);
    },
});

export { expect };

