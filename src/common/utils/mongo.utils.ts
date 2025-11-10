import { Types } from 'mongoose';

/**
 * Converts MongoDB IDs to strings in a document or array of documents
 * Handles nested documents and arrays recursively
 */
export function convertIdsToStrings<T>(doc: T): T {
  if (!doc) return doc;

  // Handle array of documents
  if (Array.isArray(doc)) {
    return doc.map((item) => convertIdsToStrings(item)) as unknown as T;
  }

  // Handle nested objects
  if (typeof doc === 'object' && doc !== null) {
    // Create a new object to avoid modifying the original
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(doc)) {
      // Convert MongoDB _id to string
      if (key === '_id' && value) {
        if (value instanceof Types.ObjectId) {
          result[key] = value.toString();
          continue;
        } else if (value?.buffer) {
          // Handle Buffer representation of ObjectId
          try {
            const buffer = Buffer.isBuffer(value.buffer) 
              ? value.buffer 
              : Buffer.from(Object.values(value.buffer));
            result[key] = new Types.ObjectId(buffer).toString();
            continue;
          } catch (error) {
            // If conversion fails, keep the original value
            console.warn('Failed to convert buffer to ObjectId:', error);
          }
        }
      }
      
      // Recursively process nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        result[key] = convertIdsToStrings(value);
      } else {
        result[key] = value;
      }
    }
    
    return result as T;
  }
  
  return doc;
}

/**
 * Converts a string ID to MongoDB ObjectId
 * Throws BadRequestException if the ID is invalid
 */
export function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  try {
    return id instanceof Types.ObjectId ? id : new Types.ObjectId(id);
  } catch (error) {
    throw new Error('Invalid ID format');
  }
}
