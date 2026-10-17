/**
 * Safely extracts a user-readable error message from an API/Axios error response.
 * Handles HTTP 413 (Entity Too Large), 502/503/504 server errors,
 * HTML responses from Nginx/proxies (preventing character-by-character string splitting),
 * and Django REST Framework field validation error objects.
 */
export const formatApiError = (err, defaultMessage = "An unexpected error occurred.") => {
  if (!err) return defaultMessage;

  // 1. Specific HTTP Status Codes
  if (err.response?.status === 413) {
    return "Upload size is too large (exceeded server limit). Please select smaller or fewer images, or reduce image resolution before uploading.";
  }

  if ([502, 503, 504].includes(err.response?.status)) {
    return `Server is temporarily unavailable (HTTP ${err.response.status}). Please try again shortly.`;
  }

  const data = err.response?.data;

  // 2. String error responses (HTML or plain text)
  if (typeof data === "string") {
    // If the server returned an HTML error page (e.g. Nginx error page or Django debug view)
    if (data.includes("<html") || data.includes("<!DOCTYPE") || data.includes("<body") || data.includes("<center>")) {
      const status = err.response?.status;
      const statusText = err.response?.statusText || "Server Error";
      return `Server error (${status ? `${status} ${statusText}` : statusText}). Please verify form fields and file sizes.`;
    }
    return data.trim() || defaultMessage;
  }

  // 3. Structured JSON object responses
  if (data && typeof data === "object") {
    if (Array.isArray(data)) {
      return data.join(", ");
    }
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.error === "string") return data.error;
    if (typeof data.message === "string") return data.message;

    // Django REST Framework field validation errors: { field_name: ["message 1", "message 2"], ... }
    try {
      const fieldErrors = Object.entries(data).map(([field, val]) => {
        let valStr = "";
        if (Array.isArray(val)) {
          valStr = val.join(", ");
        } else if (val && typeof val === "object") {
          valStr = JSON.stringify(val);
        } else {
          valStr = String(val);
        }
        // Capitalize field name for cleaner UI
        const cleanField = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return `${cleanField}: ${valStr}`;
      });
      if (fieldErrors.length > 0) return fieldErrors.join(" | ");
    } catch {
      // Fallback
    }
  }

  return err.message || defaultMessage;
};
