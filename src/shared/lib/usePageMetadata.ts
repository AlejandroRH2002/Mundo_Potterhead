import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteDescription, siteOrigin, siteTitle } from '../../../shared/seo';

interface PageMetadata { title?: string; description?: string; image?: string; noindex?: boolean }
const base = siteOrigin(import.meta.env.VITE_SITE_URL);
function meta(attribute: 'name' | 'property', key: string, value?: string) {
  let element = document.head.querySelector<HTMLMetaElement>('meta[' + attribute + '="' + key + '"]');
  if (!value) { element?.remove(); return; }
  if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.append(element); }
  element.content = value;
}
export function usePageMetadata({ title = siteTitle, description = siteDescription, image, noindex = false }: PageMetadata) {
  const { pathname } = useLocation();
  useEffect(() => {
    const heading = title === siteTitle ? title : title + ' | ' + siteTitle;
    const summary = description.replace(/\s+/g, ' ').trim().slice(0, 160);
    document.title = heading;
    meta('name', 'description', summary);
    meta('name', 'robots', noindex || !base ? 'noindex, nofollow' : 'index, follow');
    meta('property', 'og:title', heading); meta('property', 'og:description', summary);
    meta('name', 'twitter:title', heading); meta('name', 'twitter:description', summary);
    const url = base ? base + pathname : undefined;
    meta('property', 'og:url', url);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (url) {
      if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
      canonical.href = url;
    } else canonical?.remove();
    let imageUrl: string | undefined;
    if (image?.startsWith('https://')) imageUrl = image;
    else if (base) imageUrl = base + (image?.startsWith('/') && !image.startsWith('//') ? image : '/favicon.jpg');
    meta('property', 'og:image', imageUrl); meta('name', 'twitter:image', imageUrl);
  }, [title, description, image, noindex, pathname]);
}
