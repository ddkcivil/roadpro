import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if a value exists in a collection of objects for a specific field,
 * performing a case-insensitive comparison.
 */
export function isDuplicate<T>(
  collection: T[],
  field: keyof T,
  value: string,
  excludeId?: string
): boolean {
  if (!value) return false;
  const normalizedValue = value.trim().toLowerCase();
  
  return collection.some(item => {
    // If we're editing an existing item, don't count it as its own duplicate
    if (excludeId && (item as any).id === excludeId) return false;
    
    const fieldValue = item[field];
    if (typeof fieldValue === 'string') {
      return fieldValue.trim().toLowerCase() === normalizedValue;
    }
    return false;
  });
}
