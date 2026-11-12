import type { Page, Request } from '@playwright/test';

/**
 * Opções de autenticação no SGE.
 */
export interface AuthOptions {
  usuario?: string;
  senha?: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * Aguarda o desaparecimento de loaders, overlays e spinners do SGE.
 */
export async function waitForSgeLoaders(page: Page, timeout: number = 10000): Promise<void> {
  const loaders = page.locator('.overlay, #loading, [class*="loader"], [class*="spinner"], .select2-searching');
  const count = await loaders.count();
  if (count > 0) {
    try {
      await loaders.first().waitFor({ state: 'hidden', timeout });
    } catch {
      // Loader não bloqueante ou já finalizado
    }
  }
}

/**
 * Realiza autenticação no SGE Ponto iD via formulário oficial de login.
 */
export async function loginSge(page: Page, options: AuthOptions = {}): Promise<void> {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';
  const usuario = options.usuario || process.env.SGE_USUARIO;
  const senha = options.senha || process.env.SGE_SENHA;
  const timeout = options.timeout ?? 20000;

  if (!usuario || !senha) {
    const missing: string[] = [];
    if (!usuario) missing.push('SGE_USUARIO (ou options.usuario)');
    if (!senha) missing.push('SGE_SENHA (ou options.senha)');
    throw new Error(
      `[loginSge] Credenciais de autenticação não configuradas. Forneça as variáveis de ambiente ou opções: ${missing.join(', ')}.`
    );
  }

  const loginUrl = `${baseUrl.replace(/\/$/, '')}/Acesso/Entrar?ReturnUrl=%2f`;
  // O SGE pode manter recursos externos carregando após o DOM estar pronto;
  // os locators abaixo aguardam os campos do formulário antes de interagir.
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

  const inputLogin = page.getByRole('textbox', { name: 'Seu login' }).or(page.locator('#usuario, input[name="login"], #Login')).first();
  const inputSenha = page.getByRole('textbox', { name: 'Senha' }).or(page.locator('#senha, input[name="senha"], #Senha')).first();
  const btnEntrar = page.getByRole('button', { name: 'Entrar' }).or(page.locator('button[type="submit"]:has-text("Entrar")')).first();

  await inputLogin.waitFor({ state: 'visible', timeout: 10000 });
  await inputLogin.fill(usuario);
  await inputSenha.fill(senha);

  const origemSge = new URL(baseUrl).origin;
  const requisicoesPost = new Map<Request, { rota: string; status?: number; erro?: string }>();
  const pendentes = new Set<Request>();
  const rotaSge = (request: Request): string | undefined => {
    const url = new URL(request.url());
    return url.origin === origemSge ? url.pathname : undefined;
  };
  const aoSolicitar = (request: Request): void => {
    const rota = rotaSge(request);
    if (rota && request.method() === 'POST') {
      requisicoesPost.set(request, { rota });
      pendentes.add(request);
    }
  };
  const aoResponder = (response: Awaited<ReturnType<Page['waitForResponse']>>): void => {
    const registro = requisicoesPost.get(response.request());
    if (registro) registro.status = response.status();
  };
  const aoConcluir = (request: Request): void => {
    pendentes.delete(request);
  };
  const aoFalhar = (request: Request): void => {
    const registro = requisicoesPost.get(request);
    if (registro) registro.erro = request.failure()?.errorText ?? 'falha sem detalhe';
    aoConcluir(request);
  };

  page.on('request', aoSolicitar);
  page.on('response', aoResponder);
  page.on('requestfinished', aoConcluir);
  page.on('requestfailed', aoFalhar);
  try {
    await btnEntrar.click();
    await page.waitForURL((url) => !url.pathname.toLowerCase().includes('/acesso/entrar'), { timeout });
  } catch (erro) {
    const dialog = page.getByRole('dialog').first();
    const feedback = await dialog.isVisible().catch(() => false)
      ? (await dialog.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200)
      : 'nenhum';
    const requisicoes = [...requisicoesPost.values()].map(({ rota, status, erro: erroRede }) =>
      `${rota} (${status === undefined ? 'sem resposta' : `HTTP ${status}`}${erroRede ? `; ${erroRede}` : ''})`
    );
    const diagnostico = [
      `URL atual: ${new URL(page.url()).pathname}`,
      `feedback visível: ${feedback}`,
      `POSTs do SGE: ${requisicoes.length ? requisicoes.join(', ') : 'nenhum observado'}`,
      `POSTs pendentes: ${[...pendentes].map((request) => rotaSge(request)).join(', ') || 'nenhum'}`,
    ].join(' | ');
    throw new Error(`[loginSge] O SGE não concluiu a autenticação em ${timeout} ms. ${diagnostico}`, { cause: erro });
  } finally {
    page.off('request', aoSolicitar);
    page.off('response', aoResponder);
    page.off('requestfinished', aoConcluir);
    page.off('requestfailed', aoFalhar);
  }

  await waitForSgeLoaders(page);
}
