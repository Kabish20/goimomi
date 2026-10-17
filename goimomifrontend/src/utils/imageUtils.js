const imageCache = new Map();

/**
 * Normalizes backend / media URLs to relative paths or cleans absolute hostnames.
 * Memoized for high performance during fast scrolls and large listing renders.
 */
export const getImageUrl = (url) => {
  if (!url) return "";
  if (typeof url !== "string") return url;

  const cached = imageCache.get(url);
  if (cached !== undefined) return cached;

  let result = url;
  if (url.startsWith("http")) {
    result = url
      .replace("http://localhost:8000", "")
      .replace("http://127.0.0.1:8000", "")
      .replace("https://www.goimomi.com", "")
      .replace("http://www.goimomi.com", "");
  }

  // Cap cache size to avoid unbounded memory growth
  if (imageCache.size > 500) {
    imageCache.clear();
  }
  imageCache.set(url, result);
  return result;
};

/**
 * Compresses an image client-side using browser HTML5 canvas.
 * Reduces file sizes from 10MB+ down to ~300KB-800KB without noticeable quality loss.
 *
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} [options.maxWidth=1920] - Maximum width in pixels
 * @param {number} [options.maxHeight=1920] - Maximum height in pixels
 * @param {number} [options.quality=0.82] - JPEG quality (0.1 to 1.0)
 * @returns {Promise<File>} - The compressed File object, or original if compression unnecessary
 */
export const compressImage = async (file, { maxWidth = 1920, maxHeight = 1920, quality = 0.82 } = {}) => {
  if (!file || !(file instanceof File)) return file;

  // Only compress images; skip GIFs (preserves animations) and SVGs
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  // If already under 400KB, no need to compress
  if (file.size <= 400 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downscale while preserving aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compressed blob failed or is somehow larger, keep original
              resolve(file);
              return;
            }

            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], newName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

/**
 * Compresses an array of image files concurrently.
 */
export const compressImages = async (files, options = {}) => {
  if (!Array.isArray(files)) return [];
  return Promise.all(files.map((f) => compressImage(f, options)));
};
