import {type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {buildNotaFiscal, numeroInicialNotaFiscal, type NotaFiscalMontada, type NotaFiscalOpcoes} from '../factories/nota-fiscal.factory';
import {abrirInclusaoNotaFiscal, abrirNotaFiscal, conferirFormularioNotaFiscal, conferirLinhaNotaFiscal, pesquisarNotaFiscal, preencherDataNotaFiscal, proximoNumeroLivreNotaFiscal, salvarNotaFiscal, selecionarSelect2NotaFiscal, voltarConsultaNotaFiscal} from '../helpers/navigation/nota-fiscal.navigation';

export async function criarNotaFiscal(page: Page, opcoes: NotaFiscalOpcoes, sequencia = 1, aoCriar?: (nota: NotaFiscalMontada) => void): Promise<NotaFiscalMontada> {
  // Valida configuração antes de tocar no formulário.
  buildNotaFiscal(opcoes, numeroInicialNotaFiscal(opcoes));
  const numero = await proximoNumeroLivreNotaFiscal(page, opcoes, numeroInicialNotaFiscal(opcoes) + sequencia - 1);
  const nota = buildNotaFiscal(opcoes, numero);
  // Identifica esta gravação mesmo quando número e chave forem reutilizados.
  nota.numeroContrato = `QAAUTO ${randomBytes(6).toString('hex').toUpperCase()}`;
  await abrirInclusaoNotaFiscal(page);
  await selecionarSelect2NotaFiscal(page, 'DestinatarioId', nota.unidade, '/NotaFiscal/VerificaDestinatario');
  await selecionarSelect2NotaFiscal(page, 'FornecedorId', nota.fornecedor, '/NotaFiscal/ObtenhaContratosDoFornecedor');
  await preencherDataNotaFiscal(page, 'DataEmissao', nota.dataEmissao);
  for (const [id, valor] of Object.entries({ChaveDeAcesso: nota.chaveAcesso, Numero: nota.numero, Serie: nota.serie, NumeroDoContrato: nota.numeroContrato})) await page.locator(`#main #${id}`).fill(valor);
  console.log('Nota Fiscal a gravar:', JSON.stringify(nota));
  aoCriar?.(nota);
  await salvarNotaFiscal(page, () => {});
  await conferirFormularioNotaFiscal(page, nota);
  await voltarConsultaNotaFiscal(page);
  // A consulta e uma nova abertura provam persistência, além do feedback de gravação.
  await abrirNotaFiscal(page, nota);
  await voltarConsultaNotaFiscal(page);
  await pesquisarNotaFiscal(page, nota.fornecedor, nota.chaveAcesso);
  await conferirLinhaNotaFiscal(page, nota);
  console.log('Nota Fiscal criada:', JSON.stringify(nota));
  return nota;
}
