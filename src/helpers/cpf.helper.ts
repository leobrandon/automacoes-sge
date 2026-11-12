/**
 * Gera um número de CPF matematicamente válido com 11 dígitos.
 * Utiliza o algoritmo padrão de cálculo dos dois dígitos verificadores (módulo 11).
 *
 * @param formatado Se true, retorna no formato "000.000.000-00". Se false, retorna 11 dígitos numéricos.
 * @returns String contendo o CPF válido.
 */
export function gerarCpfValido(formatado: boolean = false): string {
  const digitos: number[] = [];
  for (let i = 0; i < 9; i++) {
    digitos.push(Math.floor(Math.random() * 10));
  }

  // 1º Dígito Verificador
  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += digitos[i] * (10 - i);
  }
  const resto1 = soma1 % 11;
  const dv1 = resto1 < 2 ? 0 : 11 - resto1;
  digitos.push(dv1);

  // 2º Dígito Verificador
  let soma2 = 0;
  for (let i = 0; i < 10; i++) {
    soma2 += digitos[i] * (11 - i);
  }
  const resto2 = soma2 % 11;
  const dv2 = resto2 < 2 ? 0 : 11 - resto2;
  digitos.push(dv2);

  const cpfStr = digitos.join('');
  if (formatado) {
    return cpfStr.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpfStr;
}
