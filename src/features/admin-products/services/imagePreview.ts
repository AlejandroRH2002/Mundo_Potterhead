export function createImagePreview(file: File): string {
 if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size) throw new Error('Selecciona una imagen PNG, JPEG o WebP.');
 if (file.size > 10 * 1024 * 1024) throw new Error('El archivo original no puede superar 10 MB.');
 return URL.createObjectURL(file);
}
