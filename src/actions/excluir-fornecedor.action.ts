import { expect, type Page } from '@playwright/test';
import { isFornecedorQAAuto } from '../factories/fornecedor.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { confirmarExclusaoFornecedor } from './fornecedor-comum';
import {
  linhaFornecedor,
  pesquisarFornecedor,
  type TipoFornecedor,
} from '../helpers/navigation/fornecedor.navigation';

export interface FornecedorParaExcluir {
  tipo: TipoFornecedor;
  /** Nome (Pessoa Física) ou Razão Social (Pessoa Jurídica) exibido na grade. */
  nome: string;
  /** CPF/CNPJ com máscara, como exibido pelo SGE. */
  documentoFormatado: string;
}

export interface FornecedorExcluido {
  nome: string;
  url: string;
}

/** Exclui pela interface somente o Fornecedor QAAUTO que está aberto em edição. */
export async function excluirFornecedor(page: Page, fornecedor: FornecedorParaExcluir): Promise<FornecedorExcluido> {
  const nome = fornecedor.nome.trim();
  if (!isFornecedorQAAuto(nome)) {
    throw new Error('A exclusão automatizada exige o nome exato de um Fornecedor QAAUTO.');
  }

  const formulario = page.locator('#main');
  await expect(getByRoleSge(formulario, 'heading', { name: new RegExp(`Editar Fornecedor ${fornecedor.tipo}`, 'i') }))
    .toBeVisible();

  await confirmarExclusaoFornecedor(page);

  await expect(getByRoleSge(formulario, 'heading', { name: /^\W*Fornecedor\W*$/i }))
    .toBeVisible({ timeout: 20000 });
  await pesquisarFornecedor(page, nome);
  await expect(linhaFornecedor(page, nome, fornecedor.documentoFormatado)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Fornecedor ${fornecedor.tipo} excluído e ausência conferida: ${nome}`);
  return { nome, url: page.url() };
}
