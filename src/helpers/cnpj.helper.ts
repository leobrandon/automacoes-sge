/**
 * Gera um CNPJ matematicamente válido (matriz /0001) com os dois dígitos verificadores.
 *
 * @param formatado Se true, retorna "00.000.000/0001-00". Se false, 14 dígitos numéricos.
 */
export function gerarCnpjValido(formatado: boolean = false): string {
  const digitos: number[] = [];
  for (let i = 0; i < 8; i++) {
    digitos.push(Math.floor(Math.random() * 10));
  }
  digitos.push(0, 0, 0, 1);

  const calcularDigito = (pesos: number[]): number => {
    const soma = pesos.reduce((acc, peso, i) => acc + digitos[i] * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  digitos.push(calcularDigito([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  digitos.push(calcularDigito([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));

  const cnpj = digitos.join('');
  return formatado
    ? cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    : cnpj;
}
