export const toCents = (value: number) => Math.round(value * 100);
export const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';
