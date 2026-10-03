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
