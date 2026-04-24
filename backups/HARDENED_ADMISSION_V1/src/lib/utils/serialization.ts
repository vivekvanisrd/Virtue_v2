import { Decimal } from "@prisma/client/runtime/library";

/**
 * serializeDecimal
 * 
 * Deeply traverses an object/array and converts all Prisma Decimal instances 
 * to plain JavaScript Numbers to ensure safe serialization between 
 * Server Components and Client Components.
 */
export function serializeDecimal<T>(data: T): T {
  if (data === undefined || data === null) return data;
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // Check if the value is a Decimal instance or looks like one
    if (value instanceof Decimal || (value && typeof value === 'object' && value.constructor?.name === 'Decimal')) {
      return Number(value);
    }
    return value;
  })) as T;
}
