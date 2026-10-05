import { figmaAssetDimensions } from '../data/figmaAssetDimensions';
export function ResponsiveArtwork({ desktop, mobile, priority = false }: { desktop: string; mobile: string; priority?: boolean }) {
 return <picture className="figma-artwork"><source media="(max-width: 767px)" srcSet={mobile}/><img src={desktop} alt="" width={figmaAssetDimensions[desktop]?.width} height={figmaAssetDimensions[desktop]?.height} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async"/></picture>;
}
