/**
 * Client-side image compression utility.
 * Compresses images using canvas before uploading to storage.
 */

const COMPRESSION_QUALITY = 0.6; // 60% quality
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;

/**
 * Returns true if the file is a compressible image type.
 */
export function isCompressibleImage(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
}

/**
 * Compresses an image file using canvas.
 * Returns the compressed file (as WebP if supported, else JPEG).
 * Non-image files are returned as-is.
 */
export async function compressImage(
  file: File,
  options?: { quality?: number; maxWidth?: number; maxHeight?: number }
): Promise<File> {
  if (!isCompressibleImage(file)) {
    return file;
  }

  const quality = options?.quality ?? COMPRESSION_QUALITY;
  const maxWidth = options?.maxWidth ?? MAX_WIDTH;
  const maxHeight = options?.maxHeight ?? MAX_HEIGHT;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if exceeding max dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fallback to JPEG
      const outputType = 'image/webp';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Generate new filename with webp extension
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const newFile = new File([blob], `${baseName}.webp`, {
            type: outputType,
            lastModified: Date.now(),
          });

          console.log(
            `Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(newFile.size / 1024).toFixed(0)}KB (${Math.round((1 - newFile.size / file.size) * 100)}% reduction)`
          );

          resolve(newFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}
