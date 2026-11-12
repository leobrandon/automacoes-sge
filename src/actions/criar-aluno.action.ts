import { Page, expect } from '@playwright/test';
import { select2, datepicker, waitForSgeLoaders, navegarParaAdicionarAluno, gerarCpfValido } from '../helpers';

/**
 * "Recebe escolarização em outro espaço" é obrigatório, mas o select fica oculto (e pode ficar vazio) em
 * alguns fluxos, o que impede `selectOption`. Define o valor no próprio elemento quando estiver vazio.
 */
async function garantirRecebeEscolarizacao(page: Page, rotulo: string): Promise<void> {
  const select = page.locator('#RecebeEscolarizacaoEmOutroEspaco');
  if (await select.count() === 0) return;
  await waitForSgeLoaders(page);
  // O SGE recarrega este campo após Série/Turma; com ele visível, a seleção precisa passar pela UI para valer na validação.
  if (await select.isVisible()) {
    await select.selectOption({ label: rotulo });
    await select.dispatchEvent('change');
    return;
  }
  const definido = await select.evaluate((el, texto) => {
    const alvo = Array.from((el as HTMLSelectElement).options).find((o) => o.text.trim() === texto);
    if (!alvo) return false;
    (el as HTMLSelectElement).value = alvo.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, rotulo);
  if (!definido) {
    throw new Error(`[criarAluno] Opção "${rotulo}" não existe em "Recebe Escolarização em Outro Espaço".`);
  }
}

/**
 * Aguarda o carregamento assíncrono das opções de um campo em cascata. O Select2 não fica "disabled"
 * enquanto a lista carrega, então abrir o dropdown cedo demais retorna 0 opções.
 */
async function exigirOpcoesCarregadas(page: Page, idSelect: string, rotulo: string): Promise<void> {
  await expect.poll(
    () => page.locator(`#${idSelect} option`).evaluateAll((opcoes) => opcoes.filter((o) => (o as HTMLOptionElement).value !== '').length),
    { message: `Nenhuma opção carregada em "${rotulo}". Verifique se o cadastro de apoio existe no tenant e se os campos anteriores foram preenchidos.`, timeout: 20000 },
  ).toBeGreaterThan(0);
  await waitForSgeLoaders(page);
}

/**
 * Interface de dados de entrada para criação de um aluno no SGE Ponto iD.
 * Contém os dados estritamente necessários para satisfazer os campos obrigatórios da UI e da rede.
 */
export interface AlunoData {
  /** Nome civil completo do estudante (obrigatório *) */
  nome: string;

  /** Data de nascimento formatada no padrão DD/MM/AAAA (obrigatório *) */
  dataNascimento: string;

  /** Nome ou padrão da Escola/Unidade educacional vinculada (obrigatório *) */
  escola: string | RegExp;

  /** Ano escolar / série de ingresso curricular (obrigatório *) */
  serie: string | RegExp;

  /** Turno escolar de estudo (obrigatório *) */
  turno: string | RegExp;

  /** Turma na qual o estudante será alocado (opcional) */
  turma?: string | RegExp;

  /** Matrícula escolar (opcional, gerada automaticamente se omitida) */
  matricula?: string;

  /** CPF do estudante (opcional, gerado automaticamente válido se omitido) */
  cpf?: string;

  /** Data de cadastro (opcional, padrão: data atual DD/MM/AAAA) */
  dataCadastro?: string;

  /** Finalidade da matrícula (opcional, padrão: 'Escolarizacao') */
  finalidadeMatricula?: 'Escolarizacao' | 'Alternativa';

  /** Indica se utiliza transporte escolar público (opcional, padrão: false) */
  utilizaTransporteEscolar?: boolean;

  /** Indica se a família é beneficiária do Bolsa Família (opcional, padrão: false) */
  beneficiarioBolsaFamilia?: boolean;

  /** Tipo de nacionalidade (opcional, padrão: 'Brasileira') */
  nacionalidade?: 'Brasileira' | 'Estrangeira';

  /** Sexo biológico do estudante (opcional, padrão: '0' - Masculino) */
  sexo?: 'Masculino' | 'Feminino' | 'Não informado' | '0' | '1' | '2';

  /** Cor / Raça segundo classificação IBGE (opcional, padrão: 'Parda') */
  corRaca?: 'Branca' | 'Preta' | 'Parda' | 'Amarela' | 'Indigena' | 'NaoDeclarada';

  /** UF de naturalidade brasileira (opcional, padrão: 'GO') */
  naturalidadeUf?: string;

  /** Cidade de naturalidade brasileira (opcional, padrão: 'Goiânia') */
  naturalidadeCidade?: string | RegExp;

  /** CEP de residência (opcional, padrão: '74000-000') */
  enderecoCep?: string;

  /** UF de residência do endereço (opcional, padrão: 'GO') */
  enderecoUf?: string;

  /** Cidade de residência do endereço (opcional, padrão: 'Goiânia') */
  enderecoCidade?: string | RegExp;

  /** Zona residencial (opcional, padrão: 'Urbana') */
  zonaResidencial?: 'Urbana' | 'Rural';

  /** Nome civil do responsável legal (opcional, padrão: gerado com base no nome do aluno) */
  responsavelNome?: string;

  /** CPF do responsável legal (opcional, gerado automaticamente válido se omitido) */
  responsavelCpf?: string;

  /** Celular de contato do responsável (opcional, padrão: '(62) 98765-4321') */
  responsavelCelular?: string;

  /** Data de nascimento do responsável (opcional, padrão: '10/05/1985') */
  responsavelDataNascimento?: string;

  /** Sexo do responsável legal (opcional, padrão: 'Feminino') */
  responsavelSexo?: 'Feminino' | 'Masculino';

  /** Grau de parentesco do responsável (opcional, padrão: 'Mãe') */
  responsavelParentesco?: string;

  /** Opção do campo 'Recebe escolarização em outro espaço' (opcional, padrão: 'Não recebe escolarização fora da escola') */
  recebeEscolarizacaoOutroEspaco?: string;

  /** Data de entrada do aluno na turma no modal de alocação (opcional, padrão: data atual DD/MM/AAAA) */
  dataEntradaTurma?: string;
}

/**
 * Interface do retorno produzido após a criação bem-sucedida do aluno baseada exclusivamente em dados observáveis na UI.
 */
export interface AlunoCriado {
  /** Identificador numérico do aluno quando observável na interface (DOM ou URL pós-cadastro) */
  id?: string;

  /** Nome civil cadastrado */
  nome: string;

  /** CPF cadastrado */
  cpf?: string;

  /** Matrícula escolar cadastrada */
  matricula?: string;

  /** Turma na qual o aluno foi alocado */
  turma?: string;

  /** URL observada na interface após a confirmação do cadastro (informação de contexto) */
  url: string;
}

/**
 * Retorna a data atual formatada no padrão DD/MM/AAAA.
 */
function obterDataHojeFormatada(): string {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Action de negócio reutilizável: Criação de Aluno no SGE Ponto iD via interface gráfica (UI-only).
 * 
 * Preenche exclusivamente o conjunto de campos obrigatórios da tela e da parametrização da rede,
 * respeitando a ordem funcional de dependências e bloqueios em cascata do sistema.
 *
 * @param page Instância do Playwright Page (autenticada no SGE).
 * @param data Dados do estudante a ser cadastrado.
 * @returns Informações do aluno recém-criado (ID, nome, CPF, matrícula e URL).
 */
export async function criarAluno(page: Page, data: AlunoData): Promise<AlunoCriado> {
  // 1. Garantir que estamos na tela de Adicionar Aluno (#form-aluno) limpa e pronta para preenchimento
  await navegarParaAdicionarAluno(page);

  // --------------------------------------------------------------------------
  // 2. Preenchimento da Seção Superior Fixa (Cabeçalho / Matrícula)
  // --------------------------------------------------------------------------

  // 2.1 Matrícula Escola (*) - Se o campo estiver em readonly (geração automática habilitada via parametrização do sistema), ignorar. Caso contrário, preencher obrigatoriamente.
  const inputMatricula = page.locator('#MatriculaEscola');
  const isMatriculaReadonly = (await inputMatricula.getAttribute('readonly').catch(() => null)) !== null;
  const isMatriculaEditable = await inputMatricula.isEditable().catch(() => false);
  let matriculaFinal = data.matricula || '';

  if (isMatriculaEditable && !isMatriculaReadonly) {
    matriculaFinal = matriculaFinal || `MAT${Date.now().toString().slice(-8)}`;
    await inputMatricula.fill(matriculaFinal);
  } else {
    // Campo em readonly: a matrícula é gerada de forma automática pelo SGE
    const valorAtual = await inputMatricula.inputValue().catch(() => '');
    matriculaFinal = valorAtual || 'GERADA_AUTOMATICAMENTE';
  }

  // 2.2 Data de Cadastro (*)
  const inputDataCadastro = page.locator('#DataCadastro');
  const valorDataCadastroAtual = await inputDataCadastro.inputValue().catch(() => '');
  if (!data.dataCadastro && valorDataCadastroAtual) {
    // SGE já preencheu a data de cadastro automaticamente com a data corrente
  } else {
    const dataCadastroFinal = data.dataCadastro || valorDataCadastroAtual || obterDataHojeFormatada();
    await datepicker.fill(page, '#DataCadastro', dataCadastroFinal);
  }

  // 2.3 Utiliza Transporte Escolar (*)
  await page.locator('#UtilizaTransporteEscolar').selectOption(data.utilizaTransporteEscolar ? 'true' : 'false');

  // 2.4 Beneficiário Bolsa Família (*)
  await page.locator('#BeneficiarioBolsaFamilia').selectOption(data.beneficiarioBolsaFamilia ? 'true' : 'false');

  // 2.5 Finalidade da Matrícula (*)
  const selectFinalidade = page.locator('#MatriculaFinalidadeDaMatricula');
  if (data.finalidadeMatricula) {
    await selectFinalidade.selectOption(data.finalidadeMatricula);
  }

  // 2.6 Escola / Unidade vinculada (*) - Dispara cascata AJAX de Séries e Turnos
  await select2.select(page, '#s2id_EscolaId', data.escola);
  await waitForSgeLoaders(page);

  // Aguardar liberação do Select2 de Série de Entrada
  await page.locator('#s2id_SerieEntradaId:not(.select2-container-disabled)').waitFor({
    state: 'visible',
    timeout: 15000,
  });

  // 2.7 Nome Completo (*)
  const inputNome = page.locator('#PessoaNome');
  await inputNome.fill(data.nome);
  await inputNome.press('Tab');

  // Dispensar modal de verificação de homônimos (#dialog_verificaaluno), se exibido
  const dialogVerifica = page.locator('.ui-dialog:has(#dialog_verificaaluno):visible, #dialog_verificaaluno:visible');
  if (await dialogVerifica.isVisible({ timeout: 1500 }).catch(() => false)) {
    const btnFecharDialog = page
      .locator(
        '.ui-dialog:has(#dialog_verificaaluno) button.ui-dialog-titlebar-close, .ui-dialog:has(#dialog_verificaaluno) button:has-text("Fechar"), .ui-dialog:has(#dialog_verificaaluno) button:has-text("Novo"), .ui-dialog:has(#dialog_verificaaluno) button:has-text("Prosseguir")'
      )
      .first();
    if (await btnFecharDialog.isVisible().catch(() => false)) {
      await btnFecharDialog.click();
      await dialogVerifica.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  // 2.8 Ano Escolar de Entrada (*) - Dispara cascata AJAX de Turnos
  // Se a Escola foi escolhida antes de o formulário terminar de iniciar, a cascata não dispara: reemite o change uma vez.
  const contarAnos = () => page.locator('#SerieEntradaId option').evaluateAll(
    (opcoes) => opcoes.filter((o) => (o as HTMLOptionElement).value !== '').length,
  );
  const anosCarregaram = await expect.poll(contarAnos, { timeout: 6000 }).toBeGreaterThan(0).then(() => true, () => false);
  if (!anosCarregaram) {
    await page.evaluate(() => (window as unknown as { $: (seletor: string) => { trigger: (evento: string) => void } }).$('#EscolaId').trigger('change'));
    await waitForSgeLoaders(page);
  }
  await exigirOpcoesCarregadas(page, 'SerieEntradaId', 'Ano Escolar de Entrada');
  await select2.select(page, '#s2id_SerieEntradaId', data.serie);
  await waitForSgeLoaders(page);

  // Aguardar liberação do Select2 de Turno de Entrada
  await page.locator('#s2id_TurnoEntrada:not(.select2-container-disabled)').waitFor({
    state: 'visible',
    timeout: 15000,
  });

  // 2.9 Turno de Entrada (*)
  await exigirOpcoesCarregadas(page, 'TurnoEntrada', 'Turno de Entrada');
  await select2.select(page, '#s2id_TurnoEntrada', data.turno);
  await waitForSgeLoaders(page);

  // 2.10 Turma (Opcional) - Se informada, aguarda liberação e seleciona no Select2
  if (data.turma) {
    await page.locator('#s2id_TurmaId:not(.select2-container-disabled)').waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await exigirOpcoesCarregadas(page, 'TurmaId', 'Turma');
    await select2.select(page, '#s2id_TurmaId', data.turma);
    await waitForSgeLoaders(page);
  }

  // 2.11 Recebe escolarização em outro espaço (*)
  const opcaoEscolarizacao = data.recebeEscolarizacaoOutroEspaco || 'Não recebe escolarização fora da escola';
  const selectOutroEspaco = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: /Não recebe escolarização fora da escola/i }) })
    .or(page.locator('select#RecebeEscolarizacaoEmOutroEspaco, select#RecebeEscolarizacaoOutroEspaco, select[name*="Escolarizacao" i]'))
    .first();

  if (await selectOutroEspaco.isVisible({ timeout: 5000 }).catch(() => false)) {
    try {
      await selectOutroEspaco.selectOption({ label: opcaoEscolarizacao });
    } catch {
      const optionMatching = selectOutroEspaco.locator('option').filter({ hasText: opcaoEscolarizacao }).first();
      const val = await optionMatching.getAttribute('value');
      if (val !== null) {
        await selectOutroEspaco.selectOption(val);
      }
    }
    await selectOutroEspaco.dispatchEvent('change').catch(() => {});
    await waitForSgeLoaders(page);
  }

  await garantirRecebeEscolarizacao(page, opcaoEscolarizacao);

  // --------------------------------------------------------------------------
  // 3. Preenchimento da Aba 1: Pessoais (#tabPessoais)
  // --------------------------------------------------------------------------
  const tabPessoaisLink = page.locator('a[href="#tabPessoais"]');
  if (await tabPessoaisLink.isVisible().catch(() => false)) {
    await tabPessoaisLink.click();
    await waitForSgeLoaders(page);
  }

  // 3.1 Tipo de Nacionalidade (*) - Dispara evento JS que define o país e habilita UF/Cidade
  const selectNac = page.locator('#PessoaNacionalidade');
  const nacVal = data.nacionalidade === 'Estrangeira' ? '2' : '0';
  await selectNac.selectOption(nacVal);
  await selectNac.evaluate((el: HTMLSelectElement) => {
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await waitForSgeLoaders(page);

  // Se Brasileira, preencher naturalidade
  if (nacVal === '0') {
    // Aguardar liberação do Select2 de UF de Naturalidade
    await page.locator('#s2id_PessoaNaturalidadeUf:not(.select2-container-disabled)').waitFor({
      state: 'visible',
      timeout: 15000,
    });

    // 3.4 Naturalidade UF (*) - Dispara AJAX de Cidades
    const ufNat = data.naturalidadeUf || 'GO';
    await select2.select(page, '#s2id_PessoaNaturalidadeUf', ufNat, { exactMatch: false });
    await waitForSgeLoaders(page);

    // Aguardar liberação do Select2 de Município de Naturalidade
    await page.locator('#s2id_PessoaNaturalidadeId:not(.select2-container-disabled)').waitFor({
      state: 'visible',
      timeout: 15000,
    });

    // 3.5 Município de Naturalidade (*)
    const cidadeNat = data.naturalidadeCidade || /Goiânia|Aparecida|Anápolis/i;
    await exigirOpcoesCarregadas(page, 'PessoaNaturalidadeId', 'Município de Naturalidade');
    await select2.select(page, '#s2id_PessoaNaturalidadeId', cidadeNat);
  }

  // 3.6 Data de Nascimento (*)
  await datepicker.fill(page, '#PessoaDataNascimento', data.dataNascimento);

  // 3.7 Sexo Biológico (*)
  let sexoValue = '0';
  if (data.sexo === 'Feminino' || data.sexo === '1') {
    sexoValue = '1';
  } else if (data.sexo === 'Não informado' || data.sexo === '2') {
    sexoValue = '2';
  }
  await page.locator('#PessoaSexo').selectOption(sexoValue);

  // 3.8 Cor / Raça (*)
  const corRacaValue = data.corRaca || 'Parda';
  await page.locator('#CorRaca').selectOption(corRacaValue).catch(async () => {
    await page.locator('#CorRaca').selectOption({ label: corRacaValue });
  });

  // 3.9 Quilombola Remanescente (*)
  await page.locator('#QuilombolaRemanescente').selectOption('Nao');

  // --------------------------------------------------------------------------
  // 4. Preenchimento da Aba 2: Documentos (#tabDocumentos)
  // --------------------------------------------------------------------------
  const tabDocumentosLink = page.locator('a[href="#tabDocumentos"]');
  await tabDocumentosLink.waitFor({ state: 'visible', timeout: 10000 });
  await tabDocumentosLink.click();
  await waitForSgeLoaders(page);

  // 4.1 CPF do Aluno (*) - Obrigatório por parametrização na rede
  const cpfFinal = data.cpf || gerarCpfValido();
  const inputCpf = page.locator('#PessoaCPF');
  await inputCpf.fill(cpfFinal);
  await inputCpf.press('Tab');

  // --------------------------------------------------------------------------
  // 5. Preenchimento da Aba 3: Endereço (#tabEndereco)
  // --------------------------------------------------------------------------
  const tabEnderecoLink = page.locator('a[href="#tabEndereco"]');
  await tabEnderecoLink.waitFor({ state: 'visible', timeout: 10000 });
  await tabEnderecoLink.click();
  await waitForSgeLoaders(page);

  // 5.1 CEP de Residência (*)
  const cepFinal = data.enderecoCep || '74000-000';
  const inputCep = page.locator('#Pessoa_PessoaEndereco_Cep');
  await inputCep.fill(cepFinal);
  await inputCep.press('Tab');

  // 5.2 UF de Residência (*) - Dispara AJAX de Cidades de Endereço
  const ufEnd = data.enderecoUf || 'GO';
  await select2.select(page, '#s2id_Pessoa_PessoaEndereco_Uf', ufEnd, { exactMatch: false });
  await waitForSgeLoaders(page);

  // Aguardar liberação do Select2 de Município de Residência
  await page.locator('#s2id_Pessoa_PessoaEndereco_CidadeId:not(.select2-container-disabled)').waitFor({
    state: 'visible',
    timeout: 15000,
  });

  // 5.3 Cidade / Município de Residência (*)
  const cidadeEnd = data.enderecoCidade || /Goiânia|Aparecida|Anápolis/i;
  await exigirOpcoesCarregadas(page, 'Pessoa_PessoaEndereco_CidadeId', 'Cidade de Residência');
  await select2.select(page, '#s2id_Pessoa_PessoaEndereco_CidadeId', cidadeEnd);

  // 5.4 Zona Residencial (*)
  const zonaValue = data.zonaResidencial === 'Rural' ? '2' : '1';
  await page.locator('#Pessoa_PessoaEndereco_Zona').selectOption(zonaValue);

  // 5.5 Localização Diferenciada (*)
  await page.locator('#Pessoa_PessoaEndereco_LocalizacaoDiferenciada').selectOption('0');

  // --------------------------------------------------------------------------
  // 6. Preenchimento da Aba 5: Filiação / Responsáveis (#tabFiliacaoResponsaveis)
  // --------------------------------------------------------------------------
  const tabResponsaveisLink = page.locator('a[href="#tabFiliacaoResponsaveis"]');
  await tabResponsaveisLink.waitFor({ state: 'visible', timeout: 10000 });
  await tabResponsaveisLink.click();
  await waitForSgeLoaders(page);

  // 6.1 Nome do Responsável (*)
  const responsavelNomeFinal = data.responsavelNome || `RESPONSAVEL ${data.nome.replace(/^ALUNO\s+/i, '')}`;
  await page.locator('#ResponsavelPessoaNome').fill(responsavelNomeFinal);

  // 6.2 CPF do Responsável (preenchido com valor válido para integridade)
  const respCpfFinal = data.responsavelCpf || gerarCpfValido();
  const inputRespCpf = page.locator('#ResponsavelPessoaCPF');
  await inputRespCpf.fill(respCpfFinal);
  await inputRespCpf.press('Tab');

  // 6.3 Celular do Responsável (*) - Obrigatório por validação de contato
  const respCelularFinal = data.responsavelCelular || '(62) 98765-4321';
  const inputRespCelular = page.locator('#ResponsavelPessoaCelular');
  await inputRespCelular.fill(respCelularFinal);
  await inputRespCelular.press('Tab');

  // 6.4 Data de Nascimento do Responsável
  const respDataNasc = data.responsavelDataNascimento || '10/05/1985';
  await datepicker.fill(page, '#ResponsavelPessoaDataNascimento', respDataNasc);

  // 6.5 Sexo do Responsável (*)
  const respSexo = data.responsavelSexo || 'Feminino';
  await select2.select(page, '#s2id_ResponsavelPessoaSexo', respSexo);

  // 6.6 Nível de Parentesco (*) - Consistente com o sexo
  const respParentesco = data.responsavelParentesco || (respSexo === 'Feminino' ? 'Mãe' : 'Pai');
  await select2.select(page, '#s2id_ResponsavelNivelParentesco', respParentesco);

  // 6.7 Indicadores Obrigatórios de Responsabilidade (*)
  await select2.select(page, '#s2id_ResponsavelLegal', 'Sim');
  await select2.select(page, '#s2id_PodeBuscarAluno', 'Sim');
  await select2.select(page, '#s2id_PodeContatarEmergencia', 'Sim');

  // --------------------------------------------------------------------------
  // 7. Submissão e Persistência do Cadastro
  // --------------------------------------------------------------------------
  // O campo pode ser limpo pelo SGE ao longo do preenchimento (Série/Turma); revalida imediatamente antes de salvar.
  await garantirRecebeEscolarizacao(page, opcaoEscolarizacao);

  const btnSubmit = page.locator('#btnSubmit');
  await btnSubmit.waitFor({ state: 'visible', timeout: 10000 });
  await btnSubmit.click();

  // 7.1 Verificação de Modal de Duplicidade Inesperado
  const dialogDuplicidade = page.locator('#dialog_verificaaluno');
  if (await dialogDuplicidade.isVisible({ timeout: 1000 }).catch(() => false)) {
    throw new Error(
      `[criarAluno] Alerta de duplicidade inesperado: o estudante "${data.nome}" já possui cadastro similar no sistema.`
    );
  }

  // 7.2 Tratamento de Modal Intermediário: "Informe a data de entrada do aluno na turma"
  const modalDataEntrada = page
    .locator('.jconfirm:visible, .jconfirm-box:visible, [role="dialog"]:visible, dialog:visible, .modal:visible')
    .filter({ hasText: /Informe a data de entrada|data de entrada/i })
    .first();

  // Se uma turma foi vinculada, o sistema abre este modal solicitando a data de entrada do aluno na turma
  if (data.turma) {
    await modalDataEntrada.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  if (await modalDataEntrada.isVisible().catch(() => false)) {
    const inputDataEntrada = modalDataEntrada.locator('#dataAlocacao, input.datepicker, input[type="text"]').first();
    await inputDataEntrada.waitFor({ state: 'visible', timeout: 5000 });

    const dataAlocacaoValor = data.dataEntradaTurma || obterDataHojeFormatada();
    await inputDataEntrada.fill(dataAlocacaoValor);
    await inputDataEntrada.press('Tab');

    const btnOkEntrada = modalDataEntrada
      .locator('.jconfirm-buttons button.btn-primary, button:has-text("Ok"), input[type="button"][value="Ok"]')
      .first();

    await btnOkEntrada.waitFor({ state: 'visible', timeout: 5000 });
    await btnOkEntrada.click();

    // Aguardar fechamento do modal jconfirm e estabilização de loaders
    await page.locator('.jconfirm').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await waitForSgeLoaders(page);
  }

  // 7.3 Validação do Modal de Retorno Final (SweetAlert2)
  const modalSweetAlert = page.locator('.swal2-popup:visible').first();
  const btnConfirmOk = modalSweetAlert.locator('button.swal2-confirm').first();

  try {
    // Aguardar o modal e o botão de confirmação ficarem visíveis
    await btnConfirmOk.waitFor({ state: 'visible', timeout: 25000 });

    // 7.2.1 Tratamento explícito de modal de erro ou atenção
    const isErrorModal = (await modalSweetAlert.locator('.swal2-error:visible, .swal2-warning:visible').count()) > 0;
    const modalTitulo = (await modalSweetAlert.locator('#swal2-title, .swal2-title').textContent().catch(() => '')) || '';
    const modalTexto = (await modalSweetAlert.locator('#swal2-content, .swal2-content, .swal2-html-container, #swal2-html-container').first().textContent().catch(() => '')) || '';

    if (
      isErrorModal ||
      modalTitulo.toLowerCase().includes('erro') ||
      modalTitulo.toLowerCase().includes('atenção') ||
      modalTitulo.toLowerCase().includes('verifique')
    ) {
      const detalhe = modalTexto ? `${modalTitulo} - ${modalTexto}` : modalTitulo;
      // As mensagens de validação ficam nas abas do formulário (inclusive as ocultas); lista-as para indicar o campo.
      const validacoes = await page.evaluate(() => {
        const padrao = /obrigat|inv[aá]lid|j[aá] (existe|cadastrad)|formato|deve ser|n[aã]o pode/i;
        const mensagens = Array.from(document.querySelectorAll('#main *'))
          .filter((el) => el.children.length === 0)
          .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
          .filter((texto) => texto.length > 0 && texto.length < 200 && padrao.test(texto));
        const camposInvalidos = Array.from(document.querySelectorAll('#main [class*="error" i], #main [class*="invalid" i], #main [aria-invalid="true"]'))
          .map((el) => (el.id || el.getAttribute('name') || el.className).toString().slice(0, 60))
          .filter((valor) => valor.length > 0);
        return Array.from(new Set([...mensagens, ...camposInvalidos.map((campo) => `[campo inválido: ${campo}]`)]));
      }).catch(() => [] as string[]);
      const complemento = validacoes.length > 0 ? ` Campos com validação: ${validacoes.join(' | ')}` : '';
      throw new Error(`[criarAluno] Falha no cadastro (alerta exibido na UI): ${detalhe.trim()}.${complemento}`);
    }

    // 7.2.2 Confirmação dos critérios de sucesso na UI
    const isSuccessIconVisible = (await modalSweetAlert.locator('.swal2-success:visible').count()) > 0;
    const hasSuccessTitle = modalTitulo.toLowerCase().includes('sucesso');
    const hasSuccessMessage = modalTexto.toLowerCase().includes('salvo') || modalTexto.toLowerCase().includes('sucesso');

    if (!isSuccessIconVisible && !hasSuccessTitle && !hasSuccessMessage) {
      throw new Error(
        `[criarAluno] O modal exibido não representa o sucesso esperado do cadastro: "${modalTitulo} - ${modalTexto}".`
      );
    }

    // 7.2.3 Clicar no botão "Ok"
    await btnConfirmOk.click();

    // 7.2.4 Aguardar o desaparecimento completo do container SweetAlert2
    await page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 10000 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('[criarAluno]')) {
      throw error;
    }

    // Verificar se há mensagens de erro de validação do formulário visíveis
    const alertaErro = page.locator(
      '.swal2-popup:has(.swal2-error), .alert-danger:visible, .has-error label.error:visible'
    ).first();

    if (await alertaErro.isVisible({ timeout: 1000 }).catch(() => false)) {
      const msg = await alertaErro.textContent();
      throw new Error(`[criarAluno] Falha no cadastro (alerta exibido na UI): ${msg?.trim()}`);
    }

    throw new Error(
      `[criarAluno] O botão de salvar foi acionado, mas o modal de confirmação do estudante "${data.nome}" não respondeu dentro do tempo limite.`
    );
  }

  // 7.3 Aguardar estabilização do DOM e ausência de loaders pós-fechamento do modal
  await waitForSgeLoaders(page, 15000);

  // 7.4 Obtenção de identificador observável na interface (se disponível no DOM)
  let alunoId: string | undefined;
  const inputId = page.locator('input#Id, input[name="Id"], #AlunoId').first();
  if ((await inputId.count()) > 0) {
    const val = await inputId.inputValue().catch(() => '');
    if (val && val !== '0') {
      alunoId = val;
    }
  }

  // Se a matrícula foi gerada automaticamente pelo sistema, tentar capturar o valor final gerado no DOM
  if (matriculaFinal === 'GERADA_AUTOMATICAMENTE' || !matriculaFinal) {
    const inputMatriculaPosSalvamento = page.locator('#MatriculaEscola');
    const valorPosSalvamento = await inputMatriculaPosSalvamento.inputValue().catch(() => '');
    if (valorPosSalvamento) {
      matriculaFinal = valorPosSalvamento;
    }
  }
  return {
    id: alunoId,
    nome: data.nome,
    cpf: cpfFinal,
    matricula: matriculaFinal,
    turma: data.turma ? (typeof data.turma === 'string' ? data.turma : data.turma.source) : undefined,
    url: page.url(),
  };
}
