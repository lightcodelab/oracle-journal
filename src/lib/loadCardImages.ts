const loadedImages = new Map<string, Promise<void>>();

/** Resolve only once an image is downloaded and decoded, never on an error. */
export const loadCardImages = (sources: (string | null | undefined)[]) =>
  Promise.all([...new Set(sources.filter((src): src is string => Boolean(src)))].map((src) => {
    const cached = loadedImages.get(src);
    if (cached) return cached;
    const loading = new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = async () => {
        try {
          await image.decode();
          resolve();
        } catch {
          reject(new Error('A card image could not be loaded. Please try again.'));
        }
      };
      image.onerror = () => reject(new Error('A card image could not be loaded. Please try again.'));
      image.src = src;
    }).catch((error) => {
      loadedImages.delete(src);
      throw error;
    });
    loadedImages.set(src, loading);
    return loading;
  }));