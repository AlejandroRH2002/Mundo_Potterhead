// Keep inline bytes out of catalog JSON; retrieve only the selected image.
export function catalogImage(id: string, image: string): string {
  return image.startsWith('data:') ? '/api/products/' + encodeURIComponent(id) + '/image' : image;
}
