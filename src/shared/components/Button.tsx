import type { ButtonHTMLAttributes } from 'react';
import { buttonClasses, type ButtonVariant, type ButtonSize } from '../lib/buttonStyles';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean };
export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }: Props) {
 return <button {...props} className={buttonClasses(variant,size,className)} disabled={disabled || loading} aria-busy={loading || props['aria-busy']}><span>{children}</span>{loading && <span className="sr-only">En proceso</span>}</button>;
}
