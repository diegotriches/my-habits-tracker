// utils/text.ts

/**
 * Maiúscula só na primeira letra ("quarta-feira, 11 de novembro" →
 * "Quarta-feira, 11 de novembro"). Prefira a `textTransform: 'capitalize'`
 * em textos com mais de uma palavra: ele capitaliza todas ("11 De Novembro").
 */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}
