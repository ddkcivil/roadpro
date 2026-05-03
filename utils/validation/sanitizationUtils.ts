import DOMPurify from 'dompurify';

/**
 * Utilities for sanitizing user inputs to prevent XSS and other injection attacks.
 */
export const sanitizationUtils = {
  /**
   * Sanitizes a string to remove potentially dangerous HTML/scripts.
   */
  sanitizeString: (input: string): string => {
    if (!input) return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML allowed for standard text fields
      ALLOWED_ATTR: []
    }).trim();
  },

  /**
   * Sanitizes an entire object recursively.
   */
  sanitizeObject: <T extends Record<string, any>>(obj: T): T => {
    const sanitized = { ...obj };
    
    for (const key in sanitized) {
      // Skip sanitization for specific fields that are expected to contain plain text
      // and do not require HTML sanitization (e.g., client names, contract numbers).
      if (key === 'client' || key === 'contractNo' || key === 'kmlContent') {
        continue; 
      }

      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitizationUtils.sanitizeString(sanitized[key]) as any;
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
        sanitized[key] = sanitizationUtils.sanitizeObject(sanitized[key]);
      } else if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item: any) => 
          typeof item === 'string' ? sanitizationUtils.sanitizeString(item) : 
          (typeof item === 'object' && item !== null ? sanitizationUtils.sanitizeObject(item) : item)
        ) as any;
      }
    }
    
    return sanitized;
  }
};
