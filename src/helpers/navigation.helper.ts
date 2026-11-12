/**
 * Ponte de retrocompatibilidade para o módulo de navegação modular.
 * As implementações agora residem em 'src/helpers/navigation/':
 * - common.navigation.ts (login, loaders)
 * - aluno.navigation.ts (fluxos de navegação de Aluno)
 * - colaborador.navigation.ts (fluxos de navegação de Colaborador)
 * - turma.navigation.ts (fluxos de navegação de Turma)
 */
export * from './navigation';
