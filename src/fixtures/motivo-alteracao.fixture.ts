import { test as base, expect } from '@playwright/test';
import { loginSge } from '../helpers/navigation/common.navigation';
import { BuildMotivoAlteracaoOptions } from '../factories/motivo-alteracao.factory';
import { criarMotivoAlteracao, MotivoAlteracaoCriado } from '../actions/criar-motivo-alteracao.action';
import { excluirMotivoAlteracao } from '../actions/excluir-motivo-alteracao.action';

export interface MotivoAlteracaoFixtureOptions { motivoAlteracaoOptions: BuildMotivoAlteracaoOptions; }
export interface MotivoAlteracaoFixtureContext { motivoAlteracao: MotivoAlteracaoCriado; }

export const testMotivoAlteracao = base.extend<MotivoAlteracaoFixtureOptions & MotivoAlteracaoFixtureContext>({
  motivoAlteracaoOptions: [{}, { option: true }],
  motivoAlteracao: async ({ page, motivoAlteracaoOptions }, use) => {
    await loginSge(page);
    const criado = await criarMotivoAlteracao(page, motivoAlteracaoOptions);
    try { await use(criado); }
    finally { await excluirMotivoAlteracao(page, criado.descricao); }
  },
});
export const expectMotivoAlteracao = expect;
