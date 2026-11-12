// ============================================================
// EXERCÍCIO PRÁTICO: CRIE SEU PAGE OBJECT DO ZERO!
// ============================================================
// Objetivo: Criar a classe PesquisaAlunoPage seguindo os 3 blocos.
// 
// Bloco 1: Importar Page e Locator e declarar a classe e variáveis
// Bloco 2: Criar o constructor(page: Page) guardando os elementos
// Bloco 3: Criar o método async pesquisarPorNome(nome: string)
// ============================================================



// import { Page, Locator } from '@playwright/test';

// export class PesquisaAlunoPage {
//     page: Page;
//     inputNome: Locator;
//     btnPesquisar: Locator;

//     constructor(page: Page) {
//         this.page = page;
//         this.inputNome = page.getByRole('textbox', { name: 'Nome' });
//         this.btnPesquisar = page.getByRole('button', { name: 'Pesquisar' });
//     }

//     async pesquisarPorNome(nome: string) {
//         await this.inputNome.fill(nome);
//         await this.btnPesquisar.click();
//     }
// }