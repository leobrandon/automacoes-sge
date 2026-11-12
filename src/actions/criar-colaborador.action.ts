import { Page, expect } from '@playwright/test';
import { select2, datepicker, waitForSgeLoaders, navegarParaAdicionarColaborador } from '../helpers';
import { buildColaborador, ColaboradorData } from '../factories';

export { ColaboradorData };

/**
 * Interface do resultado retornado após a criação bem-sucedida de um Colaborador.
 */
export interface ColaboradorCriado {
  /** ID numérico do colaborador extraído da URL ou da UI pós-salvamento */
  id?: string;
  /** Nome civil completo cadastrado */
  nome: string;
  /** CPF cadastrado */
  cpf: string;
  /** URL final da página após persistência */
  url: string;
}

/**
 * Action de alto nível para cadastrar um novo Colaborador / Servidor via interface gráfica do SGE.
 * 
 * Segue as boas práticas do Playwright priorizando localizadores semânticos (getByRole / getByLabel),
 * com fallbacks resilientes para formulários de sistemas legados.
 * 
 * @param page Instância do Playwright Page.
 * @param dados Opcional: dados customizados. Se omitido, utiliza buildColaborador() para autogerar massa válida.
 * @returns Dados do colaborador cadastrado com sucesso.
 */
export async function criarColaborador(
  page: Page,
  dados: Partial<ColaboradorData> = {}
): Promise<ColaboradorCriado> {
  // 1. Gera massa completa e válida mesclando com eventuais overrides passados
  const data: ColaboradorData = buildColaborador(dados);

  // 2. Navegação estrita via UI até a tela de adicionar colaborador
  await navegarParaAdicionarColaborador(page);

  // --------------------------------------------------------------------------
  // 3. Cabeçalho Fixo (Nome e CPF)
  // --------------------------------------------------------------------------
  const inputNome = page.getByRole('textbox', { name: /Nome \*/i }).or(page.locator('#PessoaNome')).first();
  await inputNome.waitFor({ state: 'visible', timeout: 10000 });
  await inputNome.fill(data.nome);

  const inputCpf = page.locator('#PessoaCPF').or(page.getByRole('textbox', { name: /CPF/i })).first();
  await inputCpf.fill(data.cpf);

  // --------------------------------------------------------------------------
  // 4. Aba "Dados Pessoais" (#tabDadosPessoais)
  // --------------------------------------------------------------------------
  const tabDadosPessoais = page.getByRole('link', { name: 'Dados Pessoais' })
    .or(page.locator('a[href="#tabDadosPessoais"]'))
    .first();

  if (await tabDadosPessoais.isVisible().catch(() => false)) {
    await tabDadosPessoais.click();
    await waitForSgeLoaders(page);
  }

  // 4.1 Data de Nascimento (*)
  await datepicker.fill(page, '#PessoaDataNascimento', data.dataNascimento);

  // 4.2 Sexo (*)
  const selectSexo = page.getByRole('combobox', { name: /Sexo/i }).or(page.locator('#PessoaSexo')).first();
  await selectSexo.selectOption({ label: data.sexo });

  // 4.3 Cor/Raça (*)
  const selectCorRaca = page.getByRole('combobox', { name: /Cor\/Raça/i }).or(page.locator('#CorRaca')).first();
  await selectCorRaca.selectOption({ label: data.corRaca });

  // 4.4 Nacionalidade (*)
  const selectNacionalidade = page.getByRole('combobox', { name: /Nacionalidade/i }).or(page.locator('#PessoaNacionalidade')).first();
  await selectNacionalidade.selectOption({ label: data.nacionalidade });

  // 4.5 UF e Município de Nascimento (Naturalidade) (*)
  await page.locator('#s2id_PessoaNaturalidadeUf').waitFor({ state: 'visible', timeout: 10000 });
  await select2.select(page, '#s2id_PessoaNaturalidadeUf', data.naturalidadeUf || 'GO', { exactMatch: false });
  await waitForSgeLoaders(page);

  await page.locator('#s2id_PessoaNaturalidadeId:not(.select2-container-disabled)').waitFor({ state: 'visible', timeout: 15000 });
  await select2.select(page, '#s2id_PessoaNaturalidadeId', data.naturalidadeCidade || 'Goiânia', { exactMatch: true });
  await waitForSgeLoaders(page);

  // 4.5 Filiação (Opcional)
  if (data.nomeMae) {
    const inputMae = page.getByRole('textbox', { name: /Nome da Mãe/i }).or(page.locator('#PessoaNomeMae, input[name="PessoaNomeMae"]')).first();
    if (await inputMae.isVisible().catch(() => false)) {
      await inputMae.fill(data.nomeMae);
    }
  }

  if (data.nomePai) {
    const inputPai = page.getByRole('textbox', { name: /Nome do Pai/i }).or(page.locator('#PessoaNomePai, input[name="PessoaNomePai"]')).first();
    if (await inputPai.isVisible().catch(() => false)) {
      await inputPai.fill(data.nomePai);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Aba "Endereço" (#tabEndereco)
  // --------------------------------------------------------------------------
  const tabEndereco = page.getByRole('link', { name: 'Endereço' })
    .or(page.locator('a[href="#tabEndereco"]'))
    .first();

  await tabEndereco.click();
  await page.locator('#PessoaPessoaEnderecoZona, #PessoaPessoaEnderecoCidadeId, #s2id_PessoaPessoaEnderecoCidadeId').first().waitFor({ state: 'visible', timeout: 10000 });
  await waitForSgeLoaders(page);

  // 5.1 CEP Residencial (*) - Preenche e aciona a busca de endereço
  const inputCep = page.locator('#PessoaPessoaEnderecoCep, #Pessoa_PessoaEndereco_Cep, input[name*="Cep"]').first();
  if (await inputCep.isVisible().catch(() => false)) {
    await inputCep.fill(data.enderecoCep || '74003-010');
    
    // Clica na lupa do campo CEP ou pressiona Tab
    const btnLupaCep = page.locator('#tabEndereco button:has(.fa-search), #tabEndereco a:has(.fa-search), #tabEndereco .fa-search').first();
    if (await btnLupaCep.isVisible().catch(() => false)) {
      await btnLupaCep.click();
    } else {
      await inputCep.press('Tab');
    }
    await waitForSgeLoaders(page);

    // Aguarda e confirma o modal SweetAlert que o SGE abre após a busca do CEP (seja sucesso ou "Endereço não encontrado")
    const btnOkCep = page
      .locator('.swal2-container:visible, .sweet-alert:visible, div[role="dialog"]:visible')
      .locator('button:has-text("Ok"), button:has-text("OK"), .swal2-confirm')
      .first();

    const cepModalVisivel = await btnOkCep.waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
    if (cepModalVisivel) {
      await btnOkCep.click();
      await page.locator('.swal2-container, .sweet-alert').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
      await waitForSgeLoaders(page);
    }
  }

  // 5.2 Estado / UF (*) - Campo nativo (garante preenchimento caso a busca de CEP não tenha preenchido)
  const selectEstado = page.locator('#PessoaPessoaEnderecoUf').first();
  const estadoAtual = await selectEstado.inputValue().catch(() => '');
  if (!estadoAtual) {
    await selectEstado.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await selectEstado.selectOption(data.enderecoUf || 'GO').catch(() => {});
    await selectEstado.evaluate((el: HTMLSelectElement) => {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }).catch(() => {});
    await waitForSgeLoaders(page);
  }

  // 5.3 Cidade de Residência (*) - Componente Select2 (garante preenchimento caso a busca de CEP não tenha preenchido)
  const cidadeAtual = await select2.getSelectedText(page, '#s2id_PessoaPessoaEnderecoCidadeId').catch(() => '');
  if (!cidadeAtual || !cidadeAtual.toUpperCase().includes('GOIÂNIA')) {
    await page.locator('#s2id_PessoaPessoaEnderecoCidadeId:not(.select2-container-disabled)').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await page.locator('#s2id_PessoaPessoaEnderecoCidadeId').isVisible().catch(() => false)) {
      await select2.select(page, '#s2id_PessoaPessoaEnderecoCidadeId', 'Goiânia', { exactMatch: true });
      await waitForSgeLoaders(page);
    }
  }

  // 5.4 Logradouro, Bairro e Número (Garante campos preenchidos mesmo se a busca externa de CEP falhar ou não localizar)
  const inputLogradouro = page.locator('#PessoaPessoaEnderecoLogradouro, #Pessoa_PessoaEndereco_Logradouro, input[name*="Logradouro" i]').first();
  if (await inputLogradouro.isVisible().catch(() => false)) {
    const val = await inputLogradouro.inputValue().catch(() => '');
    if (!val) {
      await inputLogradouro.fill(data.enderecoLogradouro || 'Avenida Central');
    }
  }

  const inputBairro = page.locator('#PessoaPessoaEnderecoBairroNome, #Pessoa_PessoaEndereco_BairroNome, input[name*="Bairro" i]').first();
  if (await inputBairro.isVisible().catch(() => false)) {
    const val = await inputBairro.inputValue().catch(() => '');
    if (!val) {
      await inputBairro.fill(data.enderecoBairro || 'Setor Central');
    }
  }

  const inputNumero = page.locator('#PessoaPessoaEnderecoNumero, #Pessoa_PessoaEndereco_Numero, input[name*="Numero" i]').first();
  if (await inputNumero.isVisible().catch(() => false)) {
    const val = await inputNumero.inputValue().catch(() => '');
    if (!val) {
      await inputNumero.fill(data.enderecoNumero || '100');
    }
  }

  // 5.5 Zona Residencial (*)
  const selectZona = page.getByRole('combobox', { name: /Zona/i }).or(page.locator('#PessoaPessoaEnderecoZona')).first();
  const zonaAtual = await selectZona.inputValue().catch(() => '');
  if (!zonaAtual) {
    await selectZona.selectOption({ label: data.zonaResidencial }).catch(() => selectZona.selectOption(data.zonaResidencial === 'Rural' ? '2' : '1'));
  }

  // 5.6 Localização Diferenciada (*)
  const selectLocalizacao = page.getByRole('combobox', { name: /Localização diferenciada/i }).or(page.locator('#PessoaPessoaEnderecoLocalizacaoDiferenciada')).first();
  const locAtual = await selectLocalizacao.inputValue().catch(() => '');
  if (!locAtual) {
    await selectLocalizacao.selectOption({ index: 1 }).catch(() => selectLocalizacao.selectOption('0'));
  }

  // --------------------------------------------------------------------------
  // 6. Aba "Contato" (#tabContato)
  // --------------------------------------------------------------------------
  // Assegura que nenhum backdrop do SweetAlert está bloqueando cliques
  await page.locator('.swal2-container, .sweet-alert').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

  const tabContato = page.getByRole('link', { name: 'Contato' })
    .or(page.locator('a[href="#tabContato"]'))
    .first();

  await tabContato.waitFor({ state: 'visible', timeout: 10000 });
  await tabContato.click();
  await page.locator('#PessoaEmail').first().waitFor({ state: 'visible', timeout: 10000 });
  await waitForSgeLoaders(page);

  // 6.1 E-mail (*)
  const inputEmail = page.locator('#PessoaEmail').first();
  await inputEmail.waitFor({ state: 'visible', timeout: 10000 });
  await inputEmail.fill(data.email);

  // --------------------------------------------------------------------------
  // 7. Submissão e Persistência (Botão Salvar)
  // --------------------------------------------------------------------------
  // Garante que nenhum aviso residual esteja sobreposto aos botões
  const btnAvisoResidual = page.locator('.swal2-container:visible button, .sweet-alert:visible button')
    .filter({ hasText: /Ok/i })
    .first();
  if (await btnAvisoResidual.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btnAvisoResidual.click();
    await page.locator('.swal2-container, .sweet-alert').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  const btnSalvar = page.locator('button:has-text("Salvar"), #btnSubmit, button[type="submit"]:has-text("Salvar")')
    .or(page.getByRole('button', { name: /Salvar/i }))
    .first();

  await btnSalvar.waitFor({ state: 'visible', timeout: 10000 });
  await btnSalvar.scrollIntoViewIfNeeded();
  await btnSalvar.click();

  // --------------------------------------------------------------------------
  // 8. Validação Resiliente do Retorno pós-submissão
  // O SGE inicialmente exibe um SweetAlert em loading com o texto "Aguarde...".
  // Aguardamos até que a operação assíncrona termine e o botão "Ok" (.swal2-confirm)
  // fique visível no popup (sinalizando conclusão com sucesso ou erro do servidor).
  // --------------------------------------------------------------------------
  const modalSweetAlert = page.locator('.swal2-popup:visible, .sweet-alert:visible').first();
  const btnConfirmOk = page
    .locator('.swal2-container:visible, .sweet-alert:visible')
    .locator('button.swal2-confirm, button:has-text("Ok"), button:has-text("OK")')
    .first();

  try {
    // Aguarda o botão de confirmação ficar visível (ignora a fase de carregamento "Aguarde..." onde o botão está ausente ou oculto)
    await btnConfirmOk.waitFor({ state: 'visible', timeout: 35000 });

    // Extrai o conteúdo do modal final
    const modalTitulo = (await modalSweetAlert.locator('#swal2-title, .swal2-title, h2').textContent().catch(() => '')) || '';
    const modalTexto = (await modalSweetAlert.locator('#swal2-content, .swal2-content, .swal2-html-container, p').textContent().catch(() => '')) || '';
    const textoCompleto = `${modalTitulo} ${modalTexto}`.trim();

    const isErrorModal = (await modalSweetAlert.locator('.swal2-error:visible, .swal2-warning:visible').count()) > 0;
    const isSuccess = textoCompleto.toLowerCase().includes('salvo') ||
                      textoCompleto.toLowerCase().includes('sucesso') ||
                      (await modalSweetAlert.locator('.swal2-success:visible').count()) > 0;

    if (isErrorModal || (!isSuccess && (textoCompleto.toLowerCase().includes('erro') || textoCompleto.toLowerCase().includes('atenção')))) {
      throw new Error(`[criarColaborador] O SGE retornou o seguinte alerta ao salvar: "${textoCompleto}"`);
    }

    if (!isSuccess) {
      throw new Error(`[criarColaborador] O modal exibido após salvar não confirmou o sucesso: "${textoCompleto}"`);
    }

    // Clica no "Ok" para fechar o modal de sucesso
    await btnConfirmOk.click();
    await page.locator('.swal2-container, .sweet-alert').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await waitForSgeLoaders(page);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('[criarColaborador]')) {
      throw error;
    }

    // Se o modal não abriu o botão de confirmação, verifica se há mensagens de validação inline no formulário
    const alertaValidacao = page.locator('.alert-danger:visible, .has-error label.error:visible, span.help-block-error:visible').first();
    if (await alertaValidacao.isVisible({ timeout: 2000 }).catch(() => false)) {
      const msgErro = await alertaValidacao.textContent();
      throw new Error(`[criarColaborador] Falha de validação no formulário: ${msgErro?.trim()}`);
    }

    // Verifica se houve redirecionamento direto sem modal
    const urlAtual = page.url();
    if (urlAtual.includes('/colaborador') && !urlAtual.includes('/adicionar')) {
      // Redirecionou com sucesso para a listagem ou visualização/edição!
    } else {
      throw new Error(
        `[criarColaborador] O botão de salvar foi acionado, mas o modal de confirmação do servidor "${data.nome}" não respondeu dentro do tempo limite. URL atual: ${urlAtual}`
      );
    }
  }

  // 9. Extração de URL e ID do colaborador
  const finalUrl = page.url();
  const idMatch = finalUrl.match(/(?:id=|\/colaborador\/(?:editar|visualizar)\/?)(\d+)/i);
  const id = idMatch ? idMatch[1] : undefined;

  return {
    id,
    nome: data.nome,
    cpf: data.cpf,
    url: finalUrl,
  };
}
