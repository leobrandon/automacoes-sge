import {expect, type Page} from '@playwright/test';
import {gerarCpfValido} from '../helpers/cpf.helper';
import {getByRoleSge} from '../helpers/sge-locators.helper';

export interface ConselheiroDados {
  nome: string;
  cpf?: string;
  nascimento: string;
  email: string;
  cep: string;
  logradouro: string;
  sexo: string;
  estado: string;
  cidade: string;
  bairro: string;
}

async function selecionar(page: Page, id: string, texto: string): Promise<void> {
  await page.locator(`#s2id_${id} .select2-choice`).click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcao = drop.locator('li.select2-result-selectable').filter({
    hasText: new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`),
  });
  await expect(opcao, `Opção de apoio ausente: ${id} = ${texto}`).toHaveCount(1);
  await opcao.click();
}

async function abrirConsulta(page: Page): Promise<void> {
  const destino = page.locator('nav a').filter({hasText: /^\s*Conselheiros\s*$/});
  if (!await destino.isVisible()) {
    const menu = page.locator('nav a').filter({hasText: /Conselho Tutelar/});
    await expect(menu).toBeVisible();
    await menu.click();
  }
  await expect(destino).toBeVisible();
  await destino.click();
  await expect(page.locator('#main #btnAdicionar')).toBeVisible();
}

export async function criarConselheiro(page: Page, dados: ConselheiroDados): Promise<{nome: string; cpf: string}> {
  if (!/^QAAUTO\s/i.test(dados.nome)) throw new Error('O nome deve começar com QAAUTO.');
  const cpf = dados.cpf || gerarCpfValido();
  console.log(`Conselheiro em criação: ${dados.nome} | CPF: ${cpf}`);
  await abrirConsulta(page);
  await page.locator('#main #btnAdicionar').click();
  await page.locator('#CPF').fill(cpf);
  await page.locator('#btnProcurarPessoa').click();
  const confirmacao = page.locator('.swal2-popup:visible').filter({hasText: 'Nenhum possível cadastro encontrado'});
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', {name: 'Sim', exact: true}).click();
  const formulario = page.locator('#form_conselheiro');
  await expect(formulario).toBeVisible();
  await formulario.locator('#PessoaNome').fill(dados.nome);
  await formulario.locator('#PessoaDataNascimento').fill(dados.nascimento);
  await formulario.locator('#PessoaDataNascimento').press('Tab');
  await formulario.locator('#PessoaEmail').fill(dados.email);
  await formulario.locator('#PessoaCep').fill(dados.cep);
  await formulario.locator('#PessoaCep').press('Tab');
  await formulario.locator('#PessoaLogradouro').fill(dados.logradouro);
  await selecionar(page, 'PessoaSexo', dados.sexo);
  await selecionar(page, 'PessoaEstado', dados.estado);
  await expect(formulario.locator('#PessoaCidade2Id option').filter({hasText: new RegExp(`^${dados.cidade}$`)})).toHaveCount(1);
  await selecionar(page, 'PessoaCidade2Id', dados.cidade);
  const bairroExato = new RegExp(`^\\s*${dados.bairro.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
  await expect(formulario.locator('#PessoaBairroId option').filter({hasText: bairroExato})).toHaveCount(1);
  await selecionar(page, 'PessoaBairroId', dados.bairro);
  await formulario.locator('#btnSalvar').click();
  const sucesso = page.locator('.swal2-popup:visible').filter({hasText: 'Conselheiro Tutelar cadastrado com sucesso.'});
  await expect(sucesso).toBeVisible({timeout: 30000});
  await sucesso.getByRole('button', {name: 'Ok', exact: true}).click();
  await abrirConsulta(page);
  await page.locator('#main #searchTerm').fill(cpf);
  await page.locator('#main #btnSubmitSearch').click();
  const linha = page.locator('#main table tbody tr').filter({hasText: cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')});
  await expect(linha).toHaveCount(1);
  await expect(getByRoleSge(linha, 'cell', {name: dados.nome.toUpperCase(), exact: true})).toBeVisible();
  return {nome: dados.nome, cpf};
}
