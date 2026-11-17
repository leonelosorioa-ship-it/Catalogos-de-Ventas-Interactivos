/**
 * Redimensiona y comprime una imagen subida por el usuario a un Data URL ligero
 * para garantizar que el logotipo o foto de producto cargue rápido y se guarde
 * sin exceder los límites de almacenamiento en Firestore.
 */
export async function compressImageFileToDataUrl(
  file: File,
  options: { maxDimension?: number; maxDataUrlLength?: number } = {}
): Promise<string> {
  const maxDimension = options.maxDimension ?? 320;
  const maxDataUrlLength = options.maxDataUrlLength ?? 150_000;

  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen válido (PNG, JPG o WebP).');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo leer la imagen seleccionada.'));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.readAsDataURL(file);
  });

  // Si es SVG o ya es muy liviana y cabe directo en el límite sin perder calidad
  if (
    (file.type === 'image/svg+xml' || rawDataUrl.length <= 45_000) &&
    rawDataUrl.length <= maxDataUrlLength
  ) {
    return rawDataUrl;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
    image.src = rawDataUrl;
  });

  const srcWidth = img.naturalWidth || img.width || maxDimension;
  const srcHeight = img.naturalHeight || img.height || maxDimension;
  const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight));

  let width = Math.max(1, Math.round(srcWidth * scale));
  let height = Math.max(1, Math.round(srcHeight * scale));

  const tryEncode = (w: number, h: number, mime: string, quality?: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo procesar la imagen en este navegador.');
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return quality !== undefined ? canvas.toDataURL(mime, quality) : canvas.toDataURL(mime);
  };

  // Preservar transparencia primero con WebP, o PNG si es pequeño
  const candidates: Array<{ mime: string; quality?: number }> = [
    { mime: 'image/webp', quality: 0.86 },
    { mime: 'image/webp', quality: 0.72 },
    { mime: 'image/webp', quality: 0.56 },
    { mime: 'image/png' },
    { mime: 'image/jpeg', quality: 0.82 },
    { mime: 'image/jpeg', quality: 0.65 },
  ];

  for (let pass = 0; pass < 3; pass++) {
    for (const candidate of candidates) {
      const encoded = tryEncode(width, height, candidate.mime, candidate.quality);
      if (encoded.length <= maxDataUrlLength) {
        return encoded;
      }
    }
    width = Math.max(64, Math.round(width * 0.7));
    height = Math.max(64, Math.round(height * 0.7));
  }

  if (rawDataUrl.length <= maxDataUrlLength) {
    return rawDataUrl;
  }

  throw new Error(
    'La imagen es demasiado pesada. Intenta con un archivo más liviano (PNG o JPG).'
  );
}
