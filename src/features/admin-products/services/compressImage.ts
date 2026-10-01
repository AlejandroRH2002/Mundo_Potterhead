export async function compressImage(file: File): Promise<File> {
  if (file.size > 10 * 1024 * 1024) throw new Error('El archivo original no puede superar 10 MB.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('El navegador no pudo decodificar esta imagen.'); }
  try {
    if (!bitmap.width || !bitmap.height) throw new Error('Dimensiones inválidas.');
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador no permite procesar imágenes.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo comprimir la imagen.')), 'image/webp', 0.8));
    if (blob.type !== 'image/webp') throw new Error('Este navegador no permite generar WebP.');
    return new File([blob], 'product.webp', { type: 'image/webp' });
  } finally { bitmap.close(); }
}
