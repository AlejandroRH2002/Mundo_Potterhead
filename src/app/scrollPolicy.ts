export interface ScrollLocation { pathname: string; search: string; hash: string }
export function scrollIntent(previous: ScrollLocation | undefined, next: ScrollLocation, action: string, hasSaved: boolean): 'restore' | 'top' | 'catalog' | 'results' | 'none' {
 if (action === 'POP' && hasSaved) return 'restore';
 if (next.hash === '#catalog-results') return 'results';
 if (next.hash === '#catalogo') return 'catalog';
 if (!previous || previous.pathname !== next.pathname) return 'top';
 if (previous.search !== next.search) return 'results';
 return 'none';
}
