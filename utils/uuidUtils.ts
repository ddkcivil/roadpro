// utils/uuidUtils.ts
import { v4 as uuidv4 } from 'uuid';

export function generateUniqueId(): string {
  return uuidv4();
}

export function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val);
}
