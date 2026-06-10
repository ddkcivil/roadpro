// utils/uuidUtils.ts
import { randomUUID } from 'node:crypto';

export function generateUniqueId(): string {
  return randomUUID();
}

// Alias for uuidv4 compatibility
export const uuidv4 = generateUniqueId;
export function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val);
}
