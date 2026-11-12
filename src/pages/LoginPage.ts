import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object que encapsula todas as interações e elementos da tela de Login do SGE.
 */
export class LoginPage {
    readonly page: Page;
    readonly inputUsuario: Locator;
    readonly inputSenha: Locator;
    readonly btnEntrar: Locator;

    constructor(page: Page) {
        this.page = page;
        // Seletores baseados nos padrões de acessibilidade recomendados pelo Playwright
        this.inputUsuario = page.getByRole('textbox', { name: 'Seu login' });
        this.inputSenha = page.getByRole('textbox', { name: 'Senha' });
        this.btnEntrar = page.getByRole('button', { name: 'Entrar' });
    }

    /**
     * Navega para a página de login utilizando o baseURL configurado no playwright.config.ts.
     * Não precisa repetir a URL completa ('https://homologa-sge.pontoid.com.br').
     */
    async acessar(): Promise<void> {
        await this.page.goto('/acesso/entrar');
        await expect(this.inputUsuario).toBeVisible({ timeout: 15000 });
    }

    /**
     * Realiza o login completo com usuário e senha.
     * Se os parâmetros não forem passados, utiliza SGE_USUARIO e SGE_SENHA do arquivo .env.
     */
    async logar(usuario: string | undefined = process.env.SGE_USUARIO, senha: string | undefined = process.env.SGE_SENHA): Promise<void> {
        if (!usuario || !senha) {
            throw new Error('Credenciais ausentes: defina SGE_USUARIO e SGE_SENHA no .env (ou passe os parâmetros).');
        }
        // credenciais validadas acima
        // Se ainda não estiver na tela de login, acessa
        if (!this.page.url().includes('/acesso/entrar')) {
            await this.acessar();
        }

        await this.inputUsuario.fill(usuario);
        await this.inputSenha.fill(senha);
        await this.btnEntrar.click();

        // Validação: Garante que a URL mudou (login aceito e redirecionado)
        await expect(this.page).not.toHaveURL(/\/acesso\/entrar/i, { timeout: 20000 });
    }
}

