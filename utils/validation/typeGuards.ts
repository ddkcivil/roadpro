import { Project, User, RFI, LabTest, NCR, BOQItem } from '../../types';

/**
 * Type guard to check if an object is a Project
 */
export function isProject(obj: any): obj is Project {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.boq)
  );
}

/**
 * Type guard to check if an object is a User
 */
export function isUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.role === 'string'
  );
}

/**
 * Type guard to check if an object is an RFI
 */
export function isRFI(obj: any): obj is RFI {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.rfiNumber === 'string' &&
    typeof obj.status === 'string'
  );
}

/**
 * Type guard to check if an object is a LabTest
 */
export function isLabTest(obj: any): obj is LabTest {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.testName === 'string' &&
    typeof obj.result === 'string'
  );
}

/**
 * Type guard to check if an object is an NCR
 */
export function isNCR(obj: any): obj is NCR {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.ncrNumber === 'string' &&
    typeof obj.status === 'string'
  );
}

/**
 * Type guard to check if an object is a BOQItem
 */
export function isBOQItem(obj: any): obj is BOQItem {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.itemNo === 'string' &&
    typeof obj.quantity === 'number'
  );
}
