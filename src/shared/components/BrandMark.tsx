import mpLogo from '@/shared/assets/images/MPLogo.jpg';
export function BrandMark({ className = '' }: { className?: string }) { return <img src={mpLogo} alt="" width={44} height={44} decoding="async" className={'brand-mark '+className}/>; }
