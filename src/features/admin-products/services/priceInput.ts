export function normalizePriceInput(value: string): string {
 return value.replace(/^0+(?=\d)/, '');
}
