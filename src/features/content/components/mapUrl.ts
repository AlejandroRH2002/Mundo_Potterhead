export function validMapEmbedUrl(value: string | undefined): string | null {
 if (!value?.trim()) return null;
 try {
  const url = new URL(value.trim());
  return url.origin === 'https://www.google.com' && !url.username && !url.password &&
   (url.pathname === '/maps/embed' || url.pathname.startsWith('/maps/embed/')) ? url.href : null;
 } catch { return null; }
}
