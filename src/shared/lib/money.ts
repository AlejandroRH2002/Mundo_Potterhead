export {toCents} from '../../../shared/money.ts';
export const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';
