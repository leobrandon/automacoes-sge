import { test } from '@playwright/test';
import { cancelarOcorrenciaSaudeColaborador, criarOcorrenciaSaudeColaborador } from '../../../src/actions';
import { loginSge } from '../../../src/helpers/navigation/common.navigation';
import { lerConfiguracaoOcorrenciaSaudeColaborador } from './ocorrencia_saude_colaborador_config';

test('cria uma ocorrência de saúde em rascunho e cancela somente o registro criado', async ({ page }) => {
  const dados = lerConfiguracaoOcorrenciaSaudeColaborador();
  test.setTimeout(120000);
  await loginSge(page, { baseUrl: process.env.BASE_URL });

  let idCriado: string | undefined;
  const falhas: unknown[] = [];
  try {
    await test.step('Cadastrar e conferir o rascunho', () => criarOcorrenciaSaudeColaborador(page, dados, (id) => {
      idCriado = id;
    }));
  } catch (erro) {
    falhas.push(erro);
  } finally {
    if (idCriado !== undefined) {
      const id = idCriado;
      try {
        await test.step(`Cancelar a ocorrência ${id}`, () => cancelarOcorrenciaSaudeColaborador(page, id, dados.motivoCancelamento));
      } catch (erro) {
        falhas.push(erro);
      }
    }
  }
  if (falhas.length) throw new AggregateError(falhas, 'Falha no ciclo de ocorrência de saúde do colaborador.');
});
