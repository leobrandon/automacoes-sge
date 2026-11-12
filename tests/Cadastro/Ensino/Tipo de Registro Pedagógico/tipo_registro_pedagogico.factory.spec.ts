import { expect, test } from '@playwright/test';

async function carregarFactory() {
  const caminho = '../../../../src/factories/tipo-registro-pedagogico.factory';
  return import(caminho).catch(() => undefined);
}

async function carregarConfiguracao() {
  const caminho = './tipo_registro_pedagogico_config';
  return import(caminho).catch(() => undefined);
}

test('factory disponibiliza builders para as quatro opções do cadastro', async () => {
  const factory = await carregarFactory();
  expect(factory, 'factory do registro pedagógico deve existir').toBeDefined();
  if (!factory) return;

  expect(typeof factory.buildAtividadesEspecificas).toBe('function');
  expect(typeof factory.buildConteudoAplicado).toBe('function');
  expect(typeof factory.buildParecerDescritivo).toBe('function');
  expect(typeof factory.buildPlanejamento).toBe('function');
});

test('builder de Atividades Específicas aplica turma, composição, ativo e sequência configurados', async () => {
  const factory = await carregarFactory();
  expect(factory, 'factory do registro pedagógico deve existir').toBeDefined();
  if (!factory) return;

  expect(factory.buildAtividadesEspecificas({
    descricao: 'QAAUTO Tipo de Registro Pedagógico Atividades Específicas',
    tipoTurma: 'Escolarização',
    ano: 2026,
    composicao: 'ANOS INICIAIS',
    ativo: true,
  }, 1)).toEqual({
    tipo: 'Atividades Específicas',
    descricao: 'QAAUTO Tipo de Registro Pedagógico Atividades Específicas 1',
    tipoTurma: 'Escolarização',
    ano: 2026,
    composicao: 'ANOS INICIAIS',
    ativo: true,
    agrupador: 'QAAUTO Agrupador de Atividades Específicas 1',
    item: {
      tipo: 'Texto Livre',
      titulo: 'QAAUTO Item de Atividades Específicas 1',
      obrigatorio: true,
      tamanhoMaximo: 1000,
    },
  });
});

test('Texto Livre valida o tamanho máximo e preserva o valor configurado no JSON', async () => {
  const factory = await carregarFactory();
  const config = await carregarConfiguracao();
  expect(factory).toBeDefined();
  expect(config).toBeDefined();
  const base = { tipoTurma: 'AEE' as const, ano: 2026 };
  for (const tamanhoMaximo of [1, 100000]) {
    const dados = config.validarConfiguracaoCriacao('Atividades Específicas', {
      ...base, descricao: 'QAAUTO Atividade', item: { tamanhoMaximo },
    });
    expect(factory.buildAtividadesEspecificas(dados).item.tamanhoMaximo).toBe(tamanhoMaximo);
  }
  for (const tamanhoMaximo of [0, -1, 100001, 1.5, '1000']) {
    expect(() => factory.buildAtividadesEspecificas({
      ...base, item: { tamanhoMaximo: tamanhoMaximo as number },
    })).toThrow(/item.tamanhoMaximo/);
    expect(() => config.validarConfiguracaoCriacao('Atividades Específicas', {
      ...base, descricao: 'QAAUTO Atividade', item: { tamanhoMaximo },
    })).toThrow(/item.tamanhoMaximo/);
  }
});

test('builder mantém a descrição semântica configurada e acrescenta a sequência solicitada', async () => {
  const factory = await carregarFactory();
  expect(factory, 'factory do registro pedagógico deve existir').toBeDefined();
  if (!factory) return;

  expect(factory.buildAtividadesEspecificas({
    descricao: 'QAAUTO Atividade alternativa',
    tipoTurma: 'AEE',
    ano: 2026,
  }, 7).descricao).toBe('QAAUTO Atividade alternativa 7');
});

test('builder de Conteúdo Aplicado mantém assinatura configurada e categoria correta', async () => {
  const factory = await carregarFactory();
  expect(factory, 'factory do registro pedagógico deve existir').toBeDefined();
  if (!factory) return;

  expect(factory.buildConteudoAplicado({
    descricao: 'QAAUTO Tipo de Registro Pedagógico Conteúdo Aplicado',
    tipoTurma: 'AEE',
    ano: 2026,
    tipoAssinatura: 'Padrão do Sistema',
  }, 1)).toEqual({
    tipo: 'Conteúdo Aplicado',
    descricao: 'QAAUTO Tipo de Registro Pedagógico Conteúdo Aplicado 1',
    tipoTurma: 'AEE',
    ano: 2026,
    ativo: true,
    tipoAssinatura: 'Padrão do Sistema',
  });
});

test('builder de Parecer Descritivo mantém finalidade, periodicidade e assinatura', async () => {
  const factory = await carregarFactory();
  expect(factory, 'factory do registro pedagógico deve existir').toBeDefined();
  if (!factory) return;

  expect(factory.buildParecerDescritivo({
    descricao: 'QAAUTO Tipo de Registro Pedagógico Parecer Descritivo',
    tipoTurma: 'Escolarização',
    ano: 2026,
    composicao: 'ANOS INICIAIS',
    finalidade: 'Não definida',
    periodicidade: 'Bimestral',
    tipoAssinatura: 'Padrão do Sistema',
  }, 1)).toEqual({
    tipo: 'Parecer Descritivo (Ficha de Acompanhamento)',
    descricao: 'QAAUTO Tipo de Registro Pedagógico Parecer Descritivo 1',
    tipoTurma: 'Escolarização',
    ano: 2026,
    composicao: 'ANOS INICIAIS',
    ativo: true,
    finalidade: 'Não definida',
    periodicidade: 'Bimestral',
    tipoAssinatura: 'Padrão do Sistema',
  });
});

test('builder de Planejamento preserva Tipo do Registro configurado', async () => {
  const factory = await carregarFactory();
  expect(factory, 'factory do registro pedagógico deve existir').toBeDefined();
  if (!factory) return;

  expect(factory.buildPlanejamento({
    descricao: 'QAAUTO Tipo de Registro Pedagógico Planejamento',
    tipoTurma: 'Escolarização',
    ano: 2026,
    composicao: 'ANOS INICIAIS',
    finalidade: 'Não definida',
    periodicidade: 'Bimestral',
    tipoRegistro: 'Único',
    tipoAssinatura: 'Padrão do Sistema',
  }, 1)).toEqual({
    tipo: 'Planejamento',
    descricao: 'QAAUTO Tipo de Registro Pedagógico Planejamento 1',
    tipoTurma: 'Escolarização',
    ano: 2026,
    composicao: 'ANOS INICIAIS',
    ativo: true,
    finalidade: 'Não definida',
    periodicidade: 'Bimestral',
    tipoRegistro: 'Único',
    tipoAssinatura: 'Padrão do Sistema',
  });
});

test('builders rejeitam sequência inválida, descrição sem QAAUTO e enum desconhecido', async () => {
  const factory = await carregarFactory();
  expect(factory, 'factory do registro pedagógico deve existir').toBeDefined();
  if (!factory) return;

  expect(() => factory.buildAtividadesEspecificas({}, 0)).toThrow(/sequência/i);
  expect(() => factory.buildAtividadesEspecificas({ descricao: 'Atividade sem prefixo' }, 1))
    .toThrow(/QAAUTO/i);
  expect(() => factory.buildPlanejamento({ tipoRegistro: 'Individual' }, 1))
    .toThrow(/tipo do registro/i);
  expect(() => factory.buildConteudoAplicado({ tipoAssinatura: 'Obrigatória' }, 1))
    .toThrow(/assinatura/i);
});

test('reconhece alvos QAAUTO e rejeita valores de descrição que excedem 100 caracteres', async () => {
  const factory = await carregarFactory();
  expect(factory, 'factory do registro pedagógico deve existir').toBeDefined();
  if (!factory) return;

  expect(factory.isTipoRegistroPedagogicoQAAuto('QAAUTO Registro Pedagógico 1')).toBe(true);
  expect(factory.isTipoRegistroPedagogicoQAAuto('Registro Pedagógico 1')).toBe(false);
  expect(() => factory.buildPlanejamento({ descricao: `QAAUTO ${'x'.repeat(100)}` }, 1))
    .toThrow(/100 caracteres/i);
});

test('configuração aceita sandbox e homologação e rejeita URL inválida', async () => {
  const config = await carregarConfiguracao();
  expect(config, 'leitor de configuração do registro pedagógico deve existir').toBeDefined();
  if (!config) return;

  expect(config.validarUrlSandbox('https://sandbox.pontoid.com.br')).toBe('https://sandbox.pontoid.com.br');
  expect(config.validarUrlSandbox('https://homologa-sge.pontoid.com.br')).toBe('https://homologa-sge.pontoid.com.br');
  expect(() => config.validarUrlSandbox('endereço inválido')).toThrow(/URL válida/i);
});

test('leitores carregam os oito JSONs das pastas dos quatro tipos com exclusão exata', async () => {
  const config = await carregarConfiguracao();
  expect(config, 'leitor de configuração do registro pedagógico deve existir').toBeDefined();
  if (!config) return;

  const tipos = [
    'Atividades Específicas',
    'Conteúdo Aplicado',
    'Parecer Descritivo (Ficha de Acompanhamento)',
    'Planejamento',
  ] as const;
  for (const tipo of tipos) {
    const criacao = config.lerConfiguracaoCriacao(tipo);
    const exclusao = config.lerConfiguracaoExclusao(tipo);
    expect(criacao.dados.descricao).toMatch(/^QAAUTO\b/);
    expect(exclusao.descricao).toBe(`${criacao.dados.descricao} 1`);
    expect(exclusao.tipo).toBe(tipo);
  }
});

test('validadores rejeitam descrição ou alvo de exclusão fora do escopo', async () => {
  const config = await carregarConfiguracao();
  expect(config, 'leitor de configuração do registro pedagógico deve existir').toBeDefined();
  if (!config) return;

  expect(() => config.validarConfiguracaoCriacao('Atividades Específicas', {
    descricao: 'Registro comum', tipoTurma: 'Escolarização', ano: 2026, composicao: 'ANOS INICIAIS', ativo: true,
  })).toThrow(/QAAUTO/i);
  expect(() => config.validarConfiguracaoExclusao('Planejamento', {
    excluirSomenteDescricoesConfiguradas: true,
    descricao: 'QAAUTO Outro Registro 1',
    tipo: 'Conteúdo Aplicado',
    tipoTurma: 'Escolarização',
    ano: 2026,
  })).toThrow(/tipo/i);
});

test('validador de exclusão exige composição em Atividades Específicas de Escolarização', async () => {
  const config = await carregarConfiguracao();
  expect(config, 'leitor de configuração do registro pedagógico deve existir').toBeDefined();
  if (!config) return;

  expect(() => config.validarConfiguracaoExclusao('Atividades Específicas', {
    excluirSomenteDescricoesConfiguradas: true,
    descricao: 'QAAUTO Atividade Escolarização 1',
    tipo: 'Atividades Específicas',
    tipoTurma: 'Escolarização',
    ano: 2026,
  })).toThrow(/composi/i);
});

test('validadores de criação exigem os campos obrigatórios de cada formulário', async () => {
  const config = await carregarConfiguracao();
  expect(config, 'leitor de configuração do registro pedagógico deve existir').toBeDefined();
  if (!config) return;

  expect(() => config.validarConfiguracaoCriacao('Atividades Específicas', {
    descricao: 'QAAUTO Atividade sem composição', tipoTurma: 'Escolarização', ano: 2026,
  })).toThrow(/composi/i);
  expect(() => config.validarConfiguracaoCriacao('Conteúdo Aplicado', {
    descricao: 'QAAUTO Conteúdo sem assinatura', tipoTurma: 'AEE', ano: 2026,
  })).toThrow(/tipoAssinatura/i);
  expect(() => config.validarConfiguracaoCriacao('Parecer Descritivo (Ficha de Acompanhamento)', {
    descricao: 'QAAUTO Parecer sem periodicidade', tipoTurma: 'Escolarização', ano: 2026,
    composicao: 'ANOS INICIAIS', finalidade: 'Não definida',
  })).toThrow(/periodicidade/i);
  expect(() => config.validarConfiguracaoCriacao('Planejamento', {
    descricao: 'QAAUTO Planejamento sem tipo de registro', tipoTurma: 'Escolarização', ano: 2026,
    composicao: 'ANOS INICIAIS', finalidade: 'Não definida', periodicidade: 'Bimestral',
    tipoAssinatura: 'Padrão do Sistema',
  })).toThrow(/tipo do registro/i);
});
