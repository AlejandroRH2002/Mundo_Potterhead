export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'sm' | 'md' | 'icon';
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
 return `${variant === 'primary' ? 'shop-button' : variant === 'secondary' ? 'button-outline' : 'button-tertiary'} button-size-${size} ${extra}`;
}
