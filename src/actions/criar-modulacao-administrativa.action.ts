import {expect, type Page} from '@playwright/test';
import {buildModulacaoAdministrativa, type AlvoModulacaoAdministrativa, type ModulacaoAdministrativaDados} from '../factories/modulacao-administrativa.factory';
import {waitForSgeLoaders} from '../helpers/navigation/common.navigation';
import {consultaModulacaoAdministrativa, linhasModulacaoAdministrativa, voltarParaConsultaModulacaoAdministrativa} from '../helpers/navigation/modulacao-administrativa.navigation';

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function selecionar(page: Page, id: string, texto: string): Promise<void> {
  // Selects dependentes são preenchidos por requisição após a escolha do campo anterior.
  await expect(page.locator(`#${id} option:not([value=""])`), `${id}: nenhuma opção carregada. Verifique os dados de apoio do tenant.`).not.toHaveCount(0);
  await page.locator(`#s2id_${id} .select2-choice`).click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const textos = (await opcoes.allInnerTexts()).map(x => x.trim());
  const alvo = opcoes.filter({hasText: new RegExp(`^\\s*${escapar(texto)}(\\s+-\\s+\\d+)?\\s*$`)});
  if (await alvo.count() !== 1) {
    await page.keyboard.press('Escape');
    throw new Error(`${id}: opção "${texto}" ausente ou ambígua. Opções: ${textos.join(' | ') || 'nenhuma'}. Verifique os dados de apoio do tenant.`);
  }
  await alvo.click();
  await waitForSgeLoaders(page);
}

function falharPreCondicao(mensagem: string): never {
  const texto = `\n==================== PRÉ-CONDIÇÃO NÃO ATENDIDA ====================\n${mensagem}\n====================================================================\n`;
  console.error(texto);
  throw new Error(texto);
}

async function selecionarColaborador(page: Page, d: ModulacaoAdministrativaDados): Promise<void> {
  const nome = d.colaborador;
  await page.locator('#s2id_ContratoDeTrabalhoColaboradorId .select2-choice').click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  await drop.locator('input').fill(nome);
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const alvo = opcoes.filter({hasText: new RegExp(escapar(nome), 'i')});
  if (await alvo.count() !== 1) {
    const achados = (await opcoes.allInnerTexts()).join(' | ') || 'nenhum';
    await page.keyboard.press('Escape');
    falharPreCondicao([
      `Servidor "${nome}" não encontrado (ou ambíguo) para a modulação administrativa.`,
      `Opções encontradas na lista: ${achados}`,
      '',
      'O que fazer: cadastre o servidor de teste (Servidor > Cadastro) com:',
      `  - Nome: ${nome}`,
      `  - Contrato ativo, matrícula ${d.contrato}`,
      `  - Cargo: ${d.cargo}`,
      `  - Unidade: ${d.unidade}`,
      'Depois rode o teste novamente. Se já existe, confira se o contrato está ativo e no cargo acima.',
    ].join('\n'));
  }
  await alvo.click();
  await waitForSgeLoaders(page);
}

export async function criarModulacaoAdministrativa(page: Page, dados: ModulacaoAdministrativaDados, aoCriar?: (alvo: AlvoModulacaoAdministrativa) => void): Promise<AlvoModulacaoAdministrativa> {
  const d = buildModulacaoAdministrativa(dados);
  const alvo: AlvoModulacaoAdministrativa = {unidade: d.unidade, turno: d.turno, funcao: d.funcao, cargo: d.cargo, colaborador: d.colaborador, contrato: d.contrato, departamento: d.departamento};
  await consultaModulacaoAdministrativa(page);
  // Não sobrescreve nem remove uma modulação preexistente.
  await expect(await linhasModulacaoAdministrativa(page, alvo), `Já existe modulação de ${d.colaborador} para ${d.funcao}; preserve o registro existente.`).toHaveCount(0);

  const m = page.locator('#main');
  await m.locator('button').filter({hasText: 'Adicionar'}).first().click();
  await expect(m.locator('h4').filter({hasText: 'Adicionar Modulação Administrativo'})).toBeVisible();
  await expect(m.locator('#DiretrizEscolaId')).toBeAttached();
  await waitForSgeLoaders(page);
  await selecionar(page, 'DiretrizEscolaId', d.unidade);
  await selecionar(page, 'DiretrizTurno', d.turno);
  await selecionar(page, 'DiretrizFuncaoId', d.funcao);
  await selecionar(page, 'ContratoDeTrabalhoNivelDoCargoCargoId', d.cargo);
  await selecionarColaborador(page, d);
  // O texto da opção é "<matrícula> - <cargo> - <nível>"; localiza pela matrícula e seleciona o texto completo.
  const opcaoContrato = m.locator('#ContratoDeTrabalhoId option').filter({hasText: new RegExp(`^\\s*${escapar(d.contrato)}\\b`)});
  await expect(opcaoContrato, `Contrato ${d.contrato} não carregou para ${d.colaborador}.`).toHaveCount(1);
  await selecionar(page, 'ContratoDeTrabalhoId', (await opcaoContrato.textContent())!.trim());
  const [vagas] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase().endsWith('/listadevagasparamodular'), {timeout: 30000}),
    m.locator('#btnCarregarVagas').click(),
  ]);
  if (!vagas.ok()) throw new Error(`Carregamento de vagas: HTTP ${vagas.status()}.`);
  await waitForSgeLoaders(page);
  await selecionar(page, 'DepartamentoId', d.departamento);
  await m.locator('#DataInicio').fill(d.dataInicio);
  await m.locator('#DataInicio').press('Tab');
  await expect(m.locator('#DataInicio')).toHaveValue(d.dataInicio);
  await m.locator('#Observacao').fill(d.observacao);

  // Vaga/Diretriz: a tabela de vagas é a que tem a coluna "Disponibilidade atual (vagas)".
  const vaga = m.locator('tr[data-diretrizid]').filter({hasText: d.cargo}).filter({hasText: new RegExp(escapar(d.turno))});
  if (await vaga.count() !== 1) falharPreCondicao(`Diretriz de ${d.funcao} / ${d.cargo} / ${d.turno} indisponível ou ambígua na unidade ${d.unidade}.\nO que fazer: em Servidor > Diretriz Escolar > Administrativo, cadastre a diretriz com vaga disponível para esse cargo e turno.`);
  const disponiveis = Number(await vaga.getAttribute('data-vagas'));
  if (!Number.isFinite(disponiveis) || disponiveis < 1) falharPreCondicao(`Diretriz de ${d.funcao} / ${d.cargo} / ${d.turno} sem vaga disponível (${disponiveis}).\nO que fazer: em Servidor > Diretriz Escolar > Administrativo, aumente a quantidade de vagas.`);
  await vaga.locator('label.checkbox').click();
  // O aviso "Modulação realizada com sucesso." é um swal que fecha sozinho em instantes (não é estável
  // para assertion); a prova é a resposta do POST de gravação, depois a verificação na grade.
  const [gravacao] = await Promise.all([
    page.waitForResponse(x => {
      const rotaPost = new URL(x.url()).pathname.toLowerCase();
      return x.request().method() === 'POST' && rotaPost.startsWith('/modulacaocolaborador/') && !rotaPost.endsWith('/listadevagasparamodular');
    }, {timeout: 60000}),
    m.locator('#btnModular').click(),
  ]);
  if (!gravacao.ok()) throw new Error(`Gravação da modulação: HTTP ${gravacao.status()}.`);
  aoCriar?.(alvo);
  // O formulário é limpo após gravar com sucesso (a tabela de vagas volta ao texto inicial).
  await expect(m.getByText('Informe os dados necessários e clique em buscar para que as vagas sejam carregadas.')).toBeVisible();

  await voltarParaConsultaModulacaoAdministrativa(page);
  const linhas = await linhasModulacaoAdministrativa(page, alvo);
  await expect(linhas).toHaveCount(1);
  await expect(linhas).toBeVisible();
  await expect(linhas.locator('td').filter({hasText: /^\s*Normal\s*$/})).toHaveCount(1);
  return alvo;
}
