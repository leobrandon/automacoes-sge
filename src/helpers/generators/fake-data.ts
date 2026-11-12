import { fakerPT_BR as faker } from '@faker-js/faker';

/**
 * Utilitário centralizador para geração de dados fictícios e realistas em memória (offline).
 * Utiliza @faker-js/faker configurado para a localização pt_BR.
 */
export const fakeData = {
  /**
   * Instância base do Faker pt_BR para operações customizadas ou extensões futuras.
   */
  faker,

  /**
   * Define uma semente (seed) fixa para geração determinística e reprodução de cenários de teste.
   * @param seed Número inteiro para inicializar o gerador pseudo-aleatório.
   */
  setSeed(seed: number): void {
    faker.seed(seed);
  },

  /**
   * Gera um nome civil completo brasileiro realista (sem títulos honoríficos).
   * @param sexo Opcional: define a geração para nome 'Masculino' ou 'Feminino'.
   */
  gerarNome(sexo?: 'Masculino' | 'Feminino' | 'male' | 'female'): string {
    const s = (sexo === 'Feminino' || sexo === 'female') ? 'female' : (sexo === 'Masculino' || sexo === 'male') ? 'male' : undefined;
    return `${faker.person.firstName(s)} ${faker.person.lastName(s)}`;
  },

  /**
   * Gera um nome completo feminino brasileiro.
   */
  gerarNomeFeminino(): string {
    return `${faker.person.firstName('female')} ${faker.person.lastName('female')}`;
  },

  /**
   * Gera um nome completo masculino brasileiro.
   */
  gerarNomeMasculino(): string {
    return `${faker.person.firstName('male')} ${faker.person.lastName('male')}`;
  },

  /**
   * Gera uma data de nascimento no formato DD/MM/AAAA para uma faixa etária escolar padrão.
   *
   * @param idadeMin Idade mínima em anos (padrão: 6 anos)
   * @param idadeMax Idade máxima em anos (padrão: 17 anos)
   */
  gerarDataNascimento(idadeMin: number = 6, idadeMax: number = 17): string {
    const min = Math.min(idadeMin, idadeMax);
    const max = Math.max(idadeMin, idadeMax);
    const data = faker.date.birthdate({ min, max, mode: 'age' });
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  },

  /**
   * Gera uma data de nascimento no formato DD/MM/AAAA para um responsável adulto (ex: 30 a 55 anos).
   */
  gerarDataNascimentoResponsavel(idadeMin: number = 30, idadeMax: number = 55): string {
    return this.gerarDataNascimento(idadeMin, idadeMax);
  },

  /**
   * Gera um número de telefone celular brasileiro com DDD formatado: (XX) 9XXXX-XXXX.
   * @param ddd Código DDD opcional (padrão: '62' para Goiás)
   */
  gerarCelular(ddd: string = '62'): string {
    const primeirosDigitos = faker.string.numeric(4);
    const ultimosDigitos = faker.string.numeric(4);
    return `(${ddd}) 9${primeirosDigitos}-${ultimosDigitos}`;
  },

  /**
   * Gera um e-mail fictício realista para o domínio educacional.
   * @param nome Nome opcional para compor o prefixo do e-mail.
   */
  gerarEmail(nome?: string): string {
    if (nome) {
      const semAcento = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const partes = semAcento.replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/);
      const primeiro = partes[0] || 'colaborador';
      const ultimo = partes.length > 1 ? partes[partes.length - 1] : 'qa';
      const sufixo = faker.string.numeric(3);
      return `${primeiro}.${ultimo}${sufixo}@gmail.com`;
    }
    return faker.internet.email({ provider: 'gmail.com' });
  },

  /**
   * Lista de CEPs válidos e reais de Goiânia/GO distribuídos em diversos setores.
   * Utilizados nos testes do SGE para garantir compatibilidade com a validação online de CEP (Correios)
   * e a regra de consistência de município do tenant (Goiânia - GO).
   */
  cepsValidosGoiania: [
    '74003-010', // Setor Central (Praça Doutor Pedro Ludovico Teixeira)
    '74110-100', // Setor Oeste (Rua 9)
    '74230-030', // Setor Bueno (Avenida T 4)
    '74210-010', // Jardim América / Bueno (Avenida T 2)
    '74160-010', // Setor Marista (Avenida 85)
    '74080-010', // Setor Sul (Rua 85)
    '74605-010', // Setor Leste Universitário (Avenida Universitária)
    '74820-010', // Setor Pedro Ludovico (Avenida Botafogo)
    '74430-130', // Setor Rodoviário (Avenida Castelo Branco)
    '74055-110', // Setor Central (Rua 75)
    '74665-810', // Jardim Goiás (Trecho 13)
    '74223-060', // Setor Bueno (Avenida T 10)
  ],

  /**
   * Retorna aleatoriamente um CEP real e válido do município do tenant (Goiânia/GO).
   */
  gerarCepGoiania(): string {
    return faker.helpers.arrayElement(this.cepsValidosGoiania);
  },

  /**
   * Gera um CEP formatado brasileiro (padrão: '#####-###').
   * @param formatado Se true, inclui o hífen (padrão: true).
   */
  gerarCep(formatado: boolean = true): string {
    const cep = faker.location.zipCode('#####-###');
    return formatado ? cep : cep.replace(/\D/g, '');
  },

  /**
   * Gera um endereço residencial completo em Goiás/Goiânia como padrão.
   */
  gerarEndereco() {
    return {
      logradouro: faker.location.street(),
      numero: faker.location.buildingNumber(),
      bairro: 'Centro',
      cidade: 'Goiânia',
      uf: 'GO',
      cep: this.gerarCepGoiania(),
    };
  },
};
