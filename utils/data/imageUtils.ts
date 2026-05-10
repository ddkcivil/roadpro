/**
 * Utilities for client-side image compression and processing
 */

export async function compressImage(
  base64Str: string, 
  maxWidth: number = 1200, 
  maxHeight: number = 1200,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      // First constrain width
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      // Then constrain height (after width adjustment)
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Ensure minimum dimensions (at least 1px)
      width = Math.max(1, Math.round(width));
      height = Math.max(1, Math.round(height));

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.onerror = (error) => reject(error);
  });
}

export async function fileToCompressedBase64(
  file: File, 
  maxWidth: number = 1200, 
  maxHeight: number = 1200,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await compressImage(base64, maxWidth, maxHeight, quality);
          resolve(compressed);
        } catch (error) {
          console.warn('Compression failed, falling back to original', error);
          resolve(base64);
        }
      } else {
        resolve(base64);
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
