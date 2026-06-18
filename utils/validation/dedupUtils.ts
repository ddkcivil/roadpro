/**
 * Shared utility for checking duplicate entries across components
 * Consolidates the duplicated `.some(m => m.field.toLowerCase() === value.toLowerCase())` pattern
 */

/**
 * Checks if a value exists in an array of objects on a given field, case-insensitively
 * @param items - Array of objects to check
 * @param field - The field/key to compare against
 * @param value - The value to check for
 * @param excludeId - Optional ID to exclude (for edit scenarios)
 * @returns True if a duplicate was found
 */
export const hasDuplicate = <T extends Record<string, any>>(
  items: T[],
  field: keyof T,
  value: string,
  excludeId?: string
): boolean => {
  const idField = 'id' as keyof T;
  return items.some(item =>
    String(item[field]).toLowerCase() === value.toLowerCase() &&
    (!excludeId || item[idField] !== excludeId)
  );
};

/**
 * Checks if a value exists in an array of strings, case-insensitively
 */
export const hasStringDuplicate = (items: string[], value: string): boolean => {
  return items.some(item => item.toLowerCase() === value.toLowerCase());
};

/**
 * Removes duplicate objects from an array based on matching field-value pairs
 */
export const removeDuplicates = <T extends Record<string, any>>(
  items: T[],
  fields: (keyof T)[]
): T[] => {
  return items.filter((item, index, self) =>
    index === self.findIndex(other =>
      fields.every(field => String(item[field]).toLowerCase() === String(other[field]).toLowerCase())
    )
  );
};